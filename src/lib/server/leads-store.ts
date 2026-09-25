// Store de leads em Google Sheets via Apps Script Web App (fetch puro, zero
// dependência npm). Fonte do Web App: scripts/apps-script/Code.gs.
// Runbook de setup: docs/planilha-leads.md.
//
// Duas armadilhas da plataforma que este módulo compensa:
//  1. Apps Script SEMPRE responde HTTP 200 — inclusive em erro. Por isso a
//     decisão é sempre `body.ok`, nunca `res.ok` isoladamente.
//  2. POST em /exec responde 302 para script.googleusercontent.com. O `fetch`
//     default (`redirect: "follow"`) é o correto; forçar "manual" quebra.
import {
	type CapturePayload,
	type StoredLead,
	storedLeadSchema,
} from "../leads/schema";
import { getMissingEnv, getServerEnv } from "./env";

const URL_ENV = "SHEETS_WEBAPP_URL";
const SECRET_ENV = "SHEETS_SHARED_SECRET";
const TIMEOUT_ENV = "SHEETS_TIMEOUT_MS";

// Falhas do Web App medidas em 2026-09-25, todas transitórias: cold start de
// 20–35s no /exec; 404 "Página não encontrada" no echo de
// script.googleusercontent.com; `unauthorized` com o segredo correto sob carga;
// execução pendurada por 90s+. Quente, a mesma chamada volta em ~2s.
const DEFAULT_ATTEMPT_MS = 30000;
// Orçamento TOTAL da operação (todas as tentativas). O projeto roda em Fluid
// compute (maxDuration default 300s); /api/inscricao ainda roda o webhook e a
// CAPI (6s cada, em paralelo) depois desta chamada. O timeout do formulário
// (RegistrationForm.astro :: CLIENT_TIMEOUT_MS) precisa ficar acima da soma.
const DEFAULT_BUDGET_MS = 55000;
// Hedging: sem resposta em HEDGE_AFTER_MS, dispara outra chamada em paralelo e
// fica com a primeira que der certo. Medido no Web App frio: em sequência, as
// chamadas levaram 20–36s ou falharam; disparadas juntas, uma voltou em 3–6s.
const HEDGE_AFTER_MS = 5000;
const MAX_ATTEMPTS = 5;
const MIN_ATTEMPT_MS = 3000;

/**
 * Versão do contrato do Web App (scripts/apps-script/Code.gs :: API_VERSION).
 * Sobe sempre que o Code.gs muda algo que este cliente consome. É o único jeito
 * de detectar "colei o script novo mas esqueci de publicar Nova versão" — sem
 * isso o sintoma é silencioso: campo vazio no painel, e ninguém percebe.
 */
export const EXPECTED_STORE_VERSION = 4;

export type LeadStoreErrorCode =
	| "lead_store_not_configured"
	| "store_unauthorized"
	| "store_timeout"
	| "store_locked"
	| "store_invalid_response"
	| "store_version_mismatch"
	| "store_error";

export class LeadStoreError extends Error {
	readonly code: LeadStoreErrorCode;
	constructor(code: LeadStoreErrorCode, message?: string) {
		super(message ?? code);
		this.name = "LeadStoreError";
		this.code = code;
	}
}

export function getLeadStoreConfigStatus(): {
	configured: boolean;
	missing: string[];
} {
	const missing = getMissingEnv([URL_ENV, SECRET_ENV]);
	return { configured: missing.length === 0, missing };
}

function attemptMs(): number {
	const raw = Number(getServerEnv(TIMEOUT_ENV));
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ATTEMPT_MS;
}

type SheetsAction =
	| "ping"
	| "capture"
	| "dashboard"
	| "getLead"
	| "setContacted"
	| "purgeByEmail"
	| "adminAuth"
	| "adminResetRequest"
	| "adminReset";

type SheetsEnvelope = {
	ok: boolean;
	action?: string;
	data?: unknown;
	error?: string;
	message?: string;
};

function mapRemoteError(error: string | undefined): LeadStoreErrorCode {
	switch (error) {
		case "unauthorized":
			return "store_unauthorized";
		case "locked":
			return "store_locked";
		default:
			return "store_error";
	}
}

// Erros que não adianta repetir: payload/ação inválidos continuarão inválidos.
// `unauthorized` é tolerado UMA vez porque o Web App o devolveu com o segredo
// correto sob carga; na segunda, o segredo está mesmo errado.
const FINAL_REMOTE_ERRORS = new Set([
	"invalid_payload",
	"invalid_json",
	"bad_action",
	"admin_unavailable",
]);

async function attempt(
	url: string,
	secret: string,
	action: SheetsAction,
	payload: unknown,
	timeoutMs: number,
	cancel?: AbortSignal,
): Promise<unknown> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	// Outra tentativa em paralelo já venceu: libera esta conexão.
	const onCancel = () => controller.abort();
	cancel?.addEventListener("abort", onCancel, { once: true });
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ secret, action, payload }),
			signal: controller.signal,
		});

		if (!res.ok) {
			throw new LeadStoreError("store_error", `http_${res.status}`);
		}

		// Corpo HTML = deployment publicado como "somente eu", URL /dev em vez de
		// /exec, ou exceção não tratada no script. Todos caem aqui.
		const text = await res.text();
		if (!text.trimStart().startsWith("{")) {
			throw new LeadStoreError("store_invalid_response", `html_${res.status}`);
		}

		let body: SheetsEnvelope;
		try {
			body = JSON.parse(text) as SheetsEnvelope;
		} catch {
			throw new LeadStoreError("store_invalid_response");
		}

		if (!body.ok) {
			if (body.error === "not_found") return null;
			throw new LeadStoreError(mapRemoteError(body.error), body.error);
		}
		return body.data ?? null;
	} catch (err) {
		if (err instanceof LeadStoreError) throw err;
		if (err instanceof Error && err.name === "AbortError") {
			throw new LeadStoreError("store_timeout");
		}
		// Só nome e código técnico da causa (ECONNRESET, UND_ERR_SOCKET...).
		const cause = (err as { cause?: { code?: unknown } })?.cause?.code;
		const name = (err as Error)?.name ?? "network";
		throw new LeadStoreError(
			"store_error",
			typeof cause === "string" ? `${name}:${cause}` : name,
		);
	} finally {
		clearTimeout(timer);
		cancel?.removeEventListener("abort", onCancel);
	}
}

export async function callSheets<T = unknown>(
	action: SheetsAction,
	payload: unknown = {},
): Promise<T> {
	const url = getServerEnv(URL_ENV);
	const secret = getServerEnv(SECRET_ENV);
	if (!url || !secret) throw new LeadStoreError("lead_store_not_configured");

	const perAttempt = attemptMs();
	// Auth inclui consumo de token/envio de email: uma tentativa só, nunca em
	// paralelo nem repetida.
	if (action.startsWith("admin")) {
		return (await attempt(
			url,
			secret,
			action,
			payload,
			Math.min(perAttempt, DEFAULT_BUDGET_MS),
		)) as T;
	}

	// Nas demais ações, tentativas paralelas e repetidas são seguras: `capture`
	// é upsert por e-mail sob LockService e o resto é leitura ou idempotente.
	const started = Date.now();
	const cancel = new AbortController();
	return new Promise<T>((resolve, reject) => {
		let hedge: ReturnType<typeof setInterval> | undefined;
		let launched = 0;
		let failed = 0;
		let unauthorized = 0;
		let settled = false;
		let lastError = new LeadStoreError("store_timeout");

		const settle = (finish: () => void) => {
			if (settled) return;
			settled = true;
			clearInterval(hedge);
			cancel.abort();
			finish();
		};

		const launch = (): boolean => {
			const remaining = DEFAULT_BUDGET_MS - (Date.now() - started);
			if (settled || launched >= MAX_ATTEMPTS || remaining < MIN_ATTEMPT_MS) {
				return false;
			}
			const attemptNo = ++launched;
			const attemptStarted = Date.now();
			attempt(
				url,
				secret,
				action,
				payload,
				Math.min(perAttempt, remaining),
				cancel.signal,
			).then(
				(data) => settle(() => resolve(data as T)),
				(err: unknown) => {
					if (settled) return;
					const error =
						err instanceof LeadStoreError
							? err
							: new LeadStoreError("store_error");
					// Sem PII: ação, tentativa, código e detalhe técnico (http_404,
					// html_200, TypeError:ECONNRESET, código remoto).
					console.warn("[leads-store] attempt_failed", {
						action,
						attempt: attemptNo,
						code: error.code,
						detail: error.message,
						ms: Date.now() - attemptStarted,
					});
					failed++;
					lastError = error;
					if (error.code === "store_unauthorized") unauthorized++;
					if (FINAL_REMOTE_ERRORS.has(error.message) || unauthorized >= 2) {
						settle(() => reject(error));
						return;
					}
					// Falha rápida (404 no echo, HTML) é substituída na hora; sem
					// substituta possível e nada mais em voo, a operação falhou.
					if (!launch() && failed === launched) {
						settle(() => reject(lastError));
					}
				},
			);
			return true;
		};

		hedge = setInterval(launch, HEDGE_AFTER_MS);
		launch();
	});
}

// Toda linha que volta passa pelo zod: célula editada à mão na planilha estoura
// visivelmente aqui em vez de envenenar o painel com shape inválido.
function parseLead(value: unknown): StoredLead {
	return storedLeadSchema.parse(value);
}

function parseLeads(value: unknown): StoredLead[] {
	return Array.isArray(value) ? value.map(parseLead) : [];
}

export type LeadQuery = {
	status?: "novo" | "contatado";
	profession?: string;
	name?: string;
	dateFrom?: string; // YYYY-MM-DD
	dateTo?: string; // YYYY-MM-DD
	limit?: number;
	offset?: number;
};

export type LeadStats = { total: number; novos: number; contatados: number };

export type LeadsDashboard = {
	leads: StoredLead[];
	total: number;
	stats: LeadStats;
	professions: string[];
};

// Normalização fica no TS; filtro, ordenação, contagem e paginação ficam no
// Apps Script — senão a planilha inteira trafegaria a cada render do painel.
function toRemoteQuery(
	q: LeadQuery,
	include: string[],
): Record<string, unknown> {
	return {
		include,
		status: q.status,
		profession: q.profession,
		name: q.name,
		dateFrom: q.dateFrom,
		dateTo: q.dateTo,
		limit: Math.min(Math.max(q.limit ?? 200, 1), 1000),
		offset: Math.max(q.offset ?? 0, 0),
	};
}

export async function captureLead(
	payload: CapturePayload,
): Promise<{ lead: StoredLead; created: boolean }> {
	const started = Date.now();
	const data = await callSheets<{ lead: unknown; created: boolean }>(
		"capture",
		payload,
	);
	const lead = parseLead(data.lead);
	// Uma tentativa que gravou mas perdeu a resposta (timeout, 404 no echo) faz
	// a seguinte devolver `created: false`. Linha criada depois do início desta
	// operação ainda é desta inscrição — sem isso o dono do lead não é avisado.
	const createdAt = Date.parse(lead.createdAt);
	const created =
		data.created === true ||
		(Number.isFinite(createdAt) && createdAt >= started - 2000);
	return { lead, created };
}

/** Uma única chamada resolve tudo que o painel precisa por render. */
export async function getLeadsDashboard(
	q: LeadQuery = {},
): Promise<LeadsDashboard> {
	const data = await callSheets<{
		leads?: unknown;
		total?: number;
		stats?: LeadStats;
		professions?: string[];
	}>("dashboard", toRemoteQuery(q, ["leads", "total", "stats", "professions"]));

	return {
		leads: parseLeads(data.leads),
		total: Number(data.total ?? 0),
		stats: data.stats ?? { total: 0, novos: 0, contatados: 0 },
		professions: Array.isArray(data.professions) ? data.professions : [],
	};
}

export async function queryLeads(
	q: LeadQuery = {},
): Promise<{ leads: StoredLead[]; total: number }> {
	const data = await callSheets<{ leads?: unknown; total?: number }>(
		"dashboard",
		toRemoteQuery(q, ["leads", "total"]),
	);
	return { leads: parseLeads(data.leads), total: Number(data.total ?? 0) };
}

/** Atalho legado (smoke/scripts): primeiras N linhas sem filtro. */
export async function listLeads(limit = 100): Promise<StoredLead[]> {
	const { leads } = await queryLeads({ limit });
	return leads;
}

/** Contadores globais (todo o dataset, ignora filtros) p/ os cards do painel. */
export async function getLeadStats(): Promise<LeadStats> {
	const data = await callSheets<{ stats?: LeadStats }>(
		"dashboard",
		toRemoteQuery({}, ["stats"]),
	);
	return data.stats ?? { total: 0, novos: 0, contatados: 0 };
}

/** Profissões distintas presentes na planilha → popula o <select> de filtro. */
export async function listProfessions(): Promise<string[]> {
	const data = await callSheets<{ professions?: string[] }>(
		"dashboard",
		toRemoteQuery({}, ["professions"]),
	);
	return Array.isArray(data.professions) ? data.professions : [];
}

export async function getLead(id: string): Promise<StoredLead | null> {
	const data = await callSheets<{ lead: unknown } | null>("getLead", { id });
	return data ? parseLead(data.lead) : null;
}

export async function setLeadContacted(
	id: string,
	contacted: boolean,
): Promise<StoredLead | null> {
	const data = await callSheets<{ lead: unknown } | null>("setContacted", {
		id,
		contacted,
	});
	return data ? parseLead(data.lead) : null;
}

/** Health probe — não devolve nenhum dado pessoal. */
/**
 * Health probe — não devolve nenhum dado pessoal.
 *
 * Lança `store_version_mismatch` quando o Web App publicado está atrás do
 * `Code.gs` do repositório. Seguro de lançar: `pingLeadStore` não tem call site
 * no caminho de conversão (só o smoke), então nenhum lead depende dele.
 */
export async function pingLeadStore(): Promise<{
	version: number;
	sheet: string;
	rows: number;
}> {
	const data = await callSheets<{
		version?: number;
		sheet?: string;
		rows?: number;
	}>("ping");
	const version = Number(data?.version ?? 0);
	if (version !== EXPECTED_STORE_VERSION) {
		throw new LeadStoreError(
			"store_version_mismatch",
			`esperado v${EXPECTED_STORE_VERSION}, Web App respondeu v${version || "?"}`,
		);
	}
	return {
		version,
		sheet: String(data?.sheet ?? ""),
		rows: Number(data?.rows ?? 0),
	};
}

/** Limpeza usada só pelo smoke test. */
export async function purgeLeadsByEmail(email: string): Promise<number> {
	const data = await callSheets<{ deleted: number }>("purgeByEmail", { email });
	return Number(data?.deleted ?? 0);
}
