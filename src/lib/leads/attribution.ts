// Atribuição de tráfego (UTM) — SSOT compartilhado por três consumidores:
// o formulário (navegador), o painel /admin + CSV (servidor) e a planilha.
//
// ATENÇÃO: `deriveSource()` é ESPELHADO em `scripts/apps-script/Code.gs`
// (função `source_()`, sem `URL()` — host por regex). Mudou a regra aqui, muda
// lá — e depois "Implantar > Gerenciar implantações > lápis > Versão: Nova
// versão" (implantação NOVA muda a URL e quebra o site).
//
// A PLANILHA é a fonte da verdade das colunas P/Q/R: use `leadSource()` para
// ler um lead já gravado. `deriveSource()` só decide a origem de quem ainda
// não foi gravado (ou de linha anterior à `migrar()`).
//
// Runbook das colunas: docs/planilha-leads.md · Convenção de links: docs/utm.md

/** Parâmetros de campanha padrão (Google/Meta/e-mail). */
export const UTM_KEYS = [
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_term",
	"utm_content",
] as const;

/** Click IDs — chegam sem UTM quando o auto-tagging do anunciante está ligado. */
export const CLICK_ID_KEYS = ["gclid", "fbclid"] as const;

export const ATTRIBUTION_KEYS: readonly string[] = [
	...UTM_KEYS,
	...CLICK_ID_KEYS,
];

/** Host da landing — espelha `SELF_HOST` no Code.gs. */
export const LANDING_HOST = "aulaotb.gpus.com.br";

/** Origem legível — colunas P / Q / R da planilha. */
export interface LeadSource {
	fonte: string;
	midia: string;
	campanha: string;
}

/** Host do referrer sem `www.`; vazio quando ausente ou não parseável. */
export function referrerHost(referrer?: string | null): string {
	const raw = (referrer ?? "").trim();
	if (!raw) return "";
	try {
		return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
	} catch {
		return "";
	}
}

/**
 * Regra de origem (espelha o GA4 em espírito, sem a complexidade dele):
 *  1. `utm_source` vence sempre;
 *  2. sem UTM, referrer externo vira `host` + mídia `referral`;
 *  3. sem UTM e sem referrer (ou referrer do próprio site) = `direto`.
 *
 * `gclid` / `fbclid` sozinhos (auto-tagging sem UTM) resolvem para
 * `google`/`facebook` + `cpc`, senão o lead pago cairia em "direto".
 */
export function deriveSource(
	utm: Record<string, string> | null | undefined,
	referrer?: string | null,
	selfHost: string | null = LANDING_HOST,
): LeadSource {
	const get = (key: string) => (utm?.[key] ?? "").trim();

	const campanha = get("utm_campaign");
	const source = get("utm_source");
	if (source) return { fonte: source, midia: get("utm_medium"), campanha };

	if (get("gclid")) return { fonte: "google", midia: "cpc", campanha };
	if (get("fbclid")) return { fonte: "facebook", midia: "cpc", campanha };

	const host = referrerHost(referrer);
	const self = (selfHost ?? "").replace(/^www\./, "").toLowerCase();
	if (host && host !== self)
		return { fonte: host, midia: "referral", campanha };

	return { fonte: "direto", midia: "", campanha };
}

/**
 * Origem de um lead JÁ GRAVADO: o que a planilha guarda (P/Q/R) vence sempre.
 *
 * O recálculo em TypeScript é rede de segurança para linha anterior à
 * `migrar()` ou Web App desatualizado — e sempre com o host canônico, NUNCA
 * com o host da requisição. Passar `Astro.url.hostname` era o bug: no preview
 * da Vercel, um lead com referrer de `aulaotb.gpus.com.br` virava
 * `aulaotb.gpus.com.br / referral` no painel enquanto a planilha guardava
 * `direto`.
 */
export function leadSource(lead: {
	fonte?: string | null;
	midia?: string | null;
	campanha?: string | null;
	utm?: Record<string, string> | null;
	referrer?: string | null;
}): LeadSource {
	const fonte = (lead.fonte ?? "").trim();
	if (fonte) {
		return {
			fonte,
			midia: (lead.midia ?? "").trim(),
			campanha: (lead.campanha ?? "").trim(),
		};
	}
	return deriveSource(lead.utm, lead.referrer, LANDING_HOST);
}

/** Uma linha só, para log / CRM / colunas estreitas. */
export function formatSource(source: LeadSource): string {
	return [source.fonte, source.midia, source.campanha]
		.filter(Boolean)
		.join(" / ");
}

/* ------------------------------- navegador -------------------------------- */

const STORAGE_KEY = "otb_aula_attr";
/** 30 dias — janela de atribuição da campanha da aula. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAttribution {
	/** Epoch ms do primeiro toque. */
	t: number;
	/** Parâmetros de campanha da URL do primeiro toque. */
	v: Record<string, string>;
	/** `document.referrer` do primeiro toque. */
	r?: string;
}

/** localStorage pode lançar (Safari privado, storage bloqueado) — degrada. */
function readStore(): StoredAttribution | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		const entry = parsed as Partial<StoredAttribution>;
		if (
			typeof entry.t !== "number" ||
			!entry.v ||
			typeof entry.v !== "object"
		) {
			return null;
		}
		if (Date.now() - entry.t > TTL_MS) return null;
		return { t: entry.t, v: entry.v as Record<string, string>, r: entry.r };
	} catch {
		return null;
	}
}

/** Parâmetros de campanha presentes na URL atual. */
function fromUrl(search: string): Record<string, string> {
	const params = new URLSearchParams(search);
	const found: Record<string, string> = {};
	for (const key of ATTRIBUTION_KEYS) {
		const value = params.get(key)?.trim();
		// Teto defensivo: querystring é entrada não confiável e a célula da
		// planilha não deve virar despejo de texto.
		if (value) found[key] = value.slice(0, 200);
	}
	return found;
}

/**
 * Primeiro toque (first-touch), janela de 30 dias.
 *
 * Chamar no load da landing. Quem clica no anúncio hoje e só se inscreve na
 * semana seguinte continua atribuído à campanha: sem isso, a UTM só existia na
 * querystring no instante do submit e qualquer reload a apagava.
 *
 * Uma visita já atribuída NÃO é sobrescrita por uma UTM posterior — é o que
 * "first-touch" significa. Visita sem UTM nenhuma não grava nada, para que um
 * clique em anúncio depois ainda possa ser o primeiro toque.
 */
export function captureAttribution(): void {
	if (typeof window === "undefined") return;
	if (readStore()) return;

	const found = fromUrl(window.location.search);
	if (Object.keys(found).length === 0) return;

	try {
		const entry: StoredAttribution = {
			t: Date.now(),
			v: found,
			r: document.referrer || undefined,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
	} catch {
		/* storage indisponível — o submit ainda lê a URL atual */
	}
}

/**
 * Atribuição para o payload do lead: primeiro toque gravado; na falta dele
 * (storage bloqueado, TTL vencido), a querystring do momento do envio.
 */
export function readAttribution(): {
	utm: Record<string, string>;
	referrer?: string;
} {
	if (typeof window === "undefined") return { utm: {} };

	const stored = readStore();
	if (stored) {
		return {
			utm: stored.v,
			referrer: stored.r || document.referrer || undefined,
		};
	}
	return {
		utm: fromUrl(window.location.search),
		referrer: document.referrer || undefined,
	};
}
