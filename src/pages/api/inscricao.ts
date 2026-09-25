// Captura de lead (on-demand). O formulário da landing faz POST aqui.
import type { APIRoute } from "astro";
import type { CapturePayload, StoredLead } from "../../lib/leads/schema";
import { capturePayloadSchema } from "../../lib/leads/schema";
import { pushLeadToCrm } from "../../lib/server/crm-inbound";
import { notifyLeadOwner } from "../../lib/server/lead-notifier";
import {
	captureLead,
	getLeadStoreConfigStatus,
	LeadStoreError,
	type LeadStoreErrorCode,
	pingLeadStore,
} from "../../lib/server/leads-store";
import {
	extractClientIp,
	extractFbCookies,
	sendCapiEvent,
} from "../../lib/server/meta-capi";

export const prerender = false;

function json(data: unknown, status: number): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

// Lead em forma de StoredLead para o canal degradado: a planilha caiu, mas o
// webhook ainda consegue entregar o contato ao time comercial.
function degradedLead(payload: CapturePayload, code: string): StoredLead {
	const now = new Date().toISOString();
	return {
		id: `pending_${Date.now()}_${code}`,
		name: payload.contact.name,
		email: payload.contact.email,
		phone: payload.contact.phone,
		profession: payload.contact.profession ?? null,
		consent: payload.contact.consentGiven,
		consentAt: payload.contact.consentTimestamp,
		utm: payload.meta.utm ?? {},
		referrer: payload.meta.referrer ?? null,
		userAgent: payload.meta.userAgent ?? null,
		landingPath: payload.meta.landingPath ?? null,
		status: "novo",
		createdAt: now,
		updatedAt: now,
		contactedAt: null,
	};
}

// Log de degradação SEM PII (regra cardinal 10): só o código do erro, o caminho
// da landing e o domínio do e-mail — o suficiente pra diagnosticar sem vazar.
async function reportDegraded(
	payload: CapturePayload,
	code: string,
): Promise<void> {
	console.error("[inscricao] lead_store_degraded", {
		code,
		landingPath: payload.meta.landingPath ?? null,
		emailDomain: payload.contact.email.split("@")[1] ?? null,
	});
	const lead = degradedLead(payload, code);
	// Dois canais independentes de sobrevivência: se a planilha caiu, o lead ainda
	// chega no webhook e no CRM (onde o Hermes trabalha). Paralelos — nenhum dos
	// dois lança, então um não derruba o outro.
	await Promise.all([
		notifyLeadOwner("lead_capture_failed", lead),
		pushLeadToCrm(lead, code),
	]);
}

// Aquecimento do Apps Script: o formulário chama no primeiro foco (form_start)
// para o cold start do Web App (20–26s medidos) correr enquanto a pessoa
// digita, e o POST chegar com a instância quente. Sem corpo, sem PII e sem
// dado na resposta. A janela por instância evita que chamadas repetidas virem
// uma execução do Apps Script cada.
const WARM_WINDOW_MS = 60000;
let lastWarmAt = 0;

export const GET: APIRoute = async () => {
	if (
		Date.now() - lastWarmAt >= WARM_WINDOW_MS &&
		getLeadStoreConfigStatus().configured
	) {
		lastWarmAt = Date.now();
		try {
			await pingLeadStore();
		} catch (err) {
			console.error("[inscricao] warmup_failed", {
				code: err instanceof LeadStoreError ? err.code : "store_error",
			});
		}
	}
	return new Response(null, {
		status: 204,
		headers: { "Cache-Control": "no-store" },
	});
};

export const POST: APIRoute = async ({ request }) => {
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return json(
			{ ok: false, persisted: false, error: "unsupported_media_type" },
			415,
		);
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return json({ ok: false, persisted: false, error: "invalid_json" }, 400);
	}

	const parsed = capturePayloadSchema.safeParse(raw);
	if (!parsed.success) {
		return json({ ok: false, persisted: false, error: "invalid_payload" }, 400);
	}

	// Checagem de config DEPOIS do parse: assim um deploy mal configurado ainda
	// consegue rotear o lead pelo webhook em vez de descartá-lo.
	const store = getLeadStoreConfigStatus();
	if (!store.configured) {
		// Quais env faltam fica no log do servidor, NUNCA na resposta: `missing`
		// entregava a nomes de variáveis de infra para qualquer caller anônimo que
		// sondasse o endpoint. Ninguém consumia esse campo — o painel chama
		// getLeadStoreConfigStatus() direto, atrás de auth (admin/leads.astro).
		console.error("[inscricao] lead_store_not_configured", {
			missing: store.missing,
		});
		await reportDegraded(parsed.data, "lead_store_not_configured");
		return json(
			{ ok: false, persisted: false, error: "lead_store_not_configured" },
			503,
		);
	}

	try {
		const { lead, created } = await captureLead(parsed.data);

		// Lead via Meta CAPI: dado de 1ª parte que a pessoa enviou no form, então
		// dispara mesmo quem recusou cookies (decisão de design). Deduplicado com
		// o Pixel do navegador via meta.eventId. Best-effort — não bloqueia/derruba
		// a resposta (sendCapiEvent nunca lança; sem token vira no-op).
		const { fbp, fbc } = extractFbCookies(request.headers.get("cookie"));
		const origin = new URL(request.url).origin;
		const [notification, crm] = await Promise.all([
			created
				? notifyLeadOwner("lead_captured", lead)
				: Promise.resolve({ status: "skipped" as const }),
			// Sem guarda de `created`: o Idempotency-Key = lead.id já faz o CRM
			// responder `duplicate` numa reinscrição, e mandar sempre cobre o caso de
			// o CRM ter sido ligado depois da 1ª inscrição da pessoa.
			pushLeadToCrm(lead),
			sendCapiEvent({
				eventName: "Lead",
				eventId: parsed.data.meta.eventId,
				eventSourceUrl: parsed.data.meta.landingPath
					? `${origin}${parsed.data.meta.landingPath}`
					: origin,
				user: {
					email: lead.email,
					phone: lead.phone,
					name: lead.name,
					fbp,
					fbc,
					clientIp: extractClientIp(request.headers),
					userAgent:
						parsed.data.meta.userAgent ??
						request.headers.get("user-agent") ??
						undefined,
				},
			}),
		]);

		// `persisted: true` é o CONTRATO de durabilidade que o formulário lê para
		// decidir se mostra "Inscrição confirmada". Só se chega aqui depois de
		// captureLead() resolver, e captureLead só resolve depois de o LockService
		// do Apps Script ter gravado a linha (Code.gs: writeRow_ sob lock).
		// NÃO confundir com `created`: `created: false` é upsert de um lead que já
		// existia — igualmente durável.
		return json(
			{
				ok: true,
				persisted: true,
				leadId: lead.id,
				created,
				notification,
				crm,
			},
			201,
		);
	} catch (err) {
		const code: LeadStoreErrorCode =
			err instanceof LeadStoreError ? err.code : "store_error";
		await reportDegraded(parsed.data, code);
		return json({ ok: false, persisted: false, error: code }, 502);
	}
};
