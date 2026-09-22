// Beacon de PageView server-side → Meta CAPI (dedup com o Pixel via event_id).
// Best-effort: sem token CAPI vira no-op. Sem PII — só fbp/fbc/IP/UA.
// Só dispara quando o navegador consentiu (o gate de consent vive no client).
import type { APIRoute } from "astro";
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

export const POST: APIRoute = async ({ request }) => {
	let raw: { eventId?: unknown; eventSourceUrl?: unknown } = {};
	try {
		if (request.headers.get("content-type")?.includes("application/json")) {
			raw = (await request.json()) as typeof raw;
		}
	} catch {
		/* corpo inválido → segue com defaults */
	}

	const eventId = typeof raw.eventId === "string" ? raw.eventId : undefined;
	const eventSourceUrl =
		typeof raw.eventSourceUrl === "string" ? raw.eventSourceUrl : undefined;

	const { fbp, fbc } = extractFbCookies(request.headers.get("cookie"));
	const result = await sendCapiEvent({
		eventName: "PageView",
		eventId,
		eventSourceUrl,
		user: {
			fbp,
			fbc,
			clientIp: extractClientIp(request.headers),
			userAgent: request.headers.get("user-agent") ?? undefined,
		},
	});

	// Sempre 200 — tracking é best-effort, nunca sinaliza erro ao cliente.
	return json({ ok: true, status: result.status }, 200);
};
