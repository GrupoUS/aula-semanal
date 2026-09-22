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

const DEFAULT_ATTEMPT_MS = 6000;
// Orçamento TOTAL da operação (1ª tentativa + retry). Mantido abaixo do
// maxDuration default da Vercel, já que /api/inscricao ainda roda o webhook e
// a CAPI (6s cada) em paralelo depois desta chamada.
const DEFAULT_BUDGET_MS = 7000;
const RETRY_BACKOFF_MS = 400;
const MIN_RETRY_MS = 1500;

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
	| "purgeByEmail";

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

// Erros que não adianta repetir: o segredo continuará errado, o payload
// continuará inválido. Retentar só gasta orçamento e quota do Apps Script.
function isRetryable(code: LeadStoreErrorCode): boolean {
	return code === "store_timeout" || code === "store_locked";
}

async function attempt(
	url: string,
	secret: string,
	action: SheetsAction,
	payload: unknown,
	timeoutMs: number,
): Promise<unknown> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
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
			throw new LeadStoreError("store_invalid_response");
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
		throw new LeadStoreError("store_error", (err as Error)?.name ?? "network");
	} finally {
		clearTimeout(timer);
	}
}

async function callSheets<T>(
	action: SheetsAction,
	payload: unknown = {},
): Promise<T> {
	const url = getServerEnv(URL_ENV);
	const secret = getServerEnv(SECRET_ENV);
	if (!url || !secret) throw new LeadStoreError("lead_store_not_configured");

	const started = Date.now();
	const perAttempt = attemptMs();

	try {
		const first = Math.min(perAttempt, DEFAULT_BUDGET_MS);
		return (await attempt(url, secret, action, payload, first)) as T;
	} catch (err) {
		const code =
			err instanceof LeadStoreError ? err.code : ("store_error" as const);
		if (!isRetryable(code)) throw err;

		const remaining =
			DEFAULT_BUDGET_MS - (Date.now() - started) - RETRY_BACKOFF_MS;
		if (remaining < MIN_RETRY_MS) throw err;

		await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
		// Retry é seguro porque `capture` é upsert por e-mail (idempotente) e as
		// demais ações são leitura ou idempotentes por construção.
		return (await attempt(
			url,
			secret,
			action,
			payload,
			Math.min(perAttempt, remaining),
		)) as T;
	}
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
	const data = await callSheets<{ lead: unknown; created: boolean }>(
		"capture",
		payload,
	);
	return { lead: parseLead(data.lead), created: data.created === true };
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
