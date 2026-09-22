// Meta Conversions API (server-side). Espelha eventos do Pixel deduplicados
// por event_id compartilhado. Best-effort: sem META_CAPI_ACCESS_TOKEN vira
// no-op silencioso — nunca quebra o fluxo do lead nem a resposta da rota.
import { getServerEnv } from "./env";

const PIXEL_ENV = "PUBLIC_FB_PIXEL_ID";
const TOKEN_ENV = "META_CAPI_ACCESS_TOKEN";
const TEST_CODE_ENV = "META_CAPI_TEST_EVENT_CODE";
const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 6000;

export type CapiStatus = "sent" | "failed" | "skipped";

export interface CapiResult {
	status: CapiStatus;
	reason?: string;
}

export function isCapiConfigured(): boolean {
	return Boolean(getServerEnv(TOKEN_ENV));
}

// Sem fallback hardcoded de propósito: um ID default é o ID de OUTRA landing,
// e um deploy sem env configurado mandaria os eventos para a conta errada.
// Sem PUBLIC_FB_PIXEL_ID, a CAPI simplesmente não dispara.
function getPixelId(): string {
	return getServerEnv(PIXEL_ENV) ?? "";
}

// SHA-256 hex via Web Crypto (global no runtime Node da Vercel). Meta exige PII
// normalizado (trim + lowercase) e hasheado.
async function sha256(value: string): Promise<string> {
	const data = new TextEncoder().encode(value.trim().toLowerCase());
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Telefone BR → só dígitos com DDI 55, antes do hash.
function normalizePhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (!digits) return "";
	if (digits.startsWith("55")) return digits;
	if (digits.length === 10 || digits.length === 11) return `55${digits}`;
	return digits;
}

export interface CapiUserData {
	email?: string;
	phone?: string;
	name?: string;
	fbp?: string;
	fbc?: string;
	clientIp?: string;
	userAgent?: string;
}

export interface CapiEventInput {
	eventName: "Lead" | "PageView";
	eventId?: string;
	eventSourceUrl?: string;
	user: CapiUserData;
}

async function buildUserData(
	user: CapiUserData,
): Promise<Record<string, unknown>> {
	const ud: Record<string, unknown> = {};
	if (user.email) ud.em = [await sha256(user.email)];
	if (user.phone) {
		const norm = normalizePhone(user.phone);
		if (norm) ud.ph = [await sha256(norm)];
	}
	if (user.name) {
		const parts = user.name.trim().split(/\s+/);
		const first = parts[0];
		const last = parts.length > 1 ? parts[parts.length - 1] : "";
		if (first) ud.fn = [await sha256(first)];
		if (last) ud.ln = [await sha256(last)];
	}
	// fbp/fbc/IP/UA NÃO são hasheados (matching de 1ª parte do navegador).
	if (user.fbp) ud.fbp = user.fbp;
	if (user.fbc) ud.fbc = user.fbc;
	if (user.clientIp) ud.client_ip_address = user.clientIp;
	if (user.userAgent) ud.client_user_agent = user.userAgent;
	return ud;
}

export async function sendCapiEvent(
	input: CapiEventInput,
): Promise<CapiResult> {
	const token = getServerEnv(TOKEN_ENV);
	if (!token) return { status: "skipped", reason: "no_token" };
	// Sem pixel a URL do Graph ficaria malformada (`/v21.0//events`).
	if (!getPixelId()) return { status: "skipped", reason: "no_pixel" };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const userData = await buildUserData(input.user);
		const event: Record<string, unknown> = {
			event_name: input.eventName,
			event_time: Math.floor(Date.now() / 1000),
			action_source: "website",
			user_data: userData,
		};
		if (input.eventId) event.event_id = input.eventId;
		if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;

		const body: Record<string, unknown> = { data: [event] };
		const testCode = getServerEnv(TEST_CODE_ENV);
		if (testCode) body.test_event_code = testCode;

		const url = `https://graph.facebook.com/${GRAPH_VERSION}/${getPixelId()}/events?access_token=${encodeURIComponent(token)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal,
		});
		return res.ok
			? { status: "sent" }
			: { status: "failed", reason: `http_${res.status}` };
	} catch (err) {
		return {
			status: "failed",
			reason: err instanceof Error ? err.name : "error",
		};
	} finally {
		clearTimeout(timer);
	}
}

// Lê _fbp/_fbc do header Cookie (cookies de 1ª parte setados pelo Pixel).
export function extractFbCookies(cookieHeader: string | null): {
	fbp?: string;
	fbc?: string;
} {
	if (!cookieHeader) return {};
	const out: { fbp?: string; fbc?: string } = {};
	for (const part of cookieHeader.split(";")) {
		const [k, ...v] = part.trim().split("=");
		if (k === "_fbp") out.fbp = decodeURIComponent(v.join("="));
		else if (k === "_fbc") out.fbc = decodeURIComponent(v.join("="));
	}
	return out;
}

// IP do cliente a partir dos headers de proxy (Vercel).
export function extractClientIp(headers: Headers): string | undefined {
	const xff = headers.get("x-forwarded-for");
	if (xff) return xff.split(",")[0]?.trim();
	return headers.get("x-real-ip") ?? undefined;
}
