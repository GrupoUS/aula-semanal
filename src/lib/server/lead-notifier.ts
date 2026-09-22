// Notificação opcional do dono do lead via webhook (Make/Zapier/n8n).
// Sem LEAD_NOTIFY_WEBHOOK_URL → skip silencioso. Timeout 6s (AbortController).
import type { StoredLead } from "../leads/schema";
import { getServerEnv } from "./env";

// `lead_capture_failed` é o canal degradado: a planilha caiu, mas o lead não
// pode se perder. Configure LEAD_NOTIFY_WEBHOOK_URL para que ele chegue.
export type LeadEventType = "lead_captured" | "lead_capture_failed";

export interface NotifyResult {
	status: "sent" | "failed" | "skipped";
	reason?: string;
}

function summarize(lead: StoredLead, eventType: LeadEventType): string {
	const prefix =
		eventType === "lead_capture_failed"
			? "[FALHA] Lead NAO salvo na planilha"
			: "Novo lead";
	return [
		`${prefix}: ${lead.name}`,
		`WhatsApp: ${lead.phone}`,
		`E-mail: ${lead.email}`,
		lead.profession ? `Profissão: ${lead.profession}` : null,
		`ID: ${lead.id}`,
	]
		.filter(Boolean)
		.join(" · ");
}

export async function notifyLeadOwner(
	eventType: LeadEventType,
	lead: StoredLead,
): Promise<NotifyResult> {
	const url = getServerEnv("LEAD_NOTIFY_WEBHOOK_URL");
	if (!url) return { status: "skipped" };

	const secret = getServerEnv("LEAD_NOTIFY_WEBHOOK_SECRET");
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 6000);

	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (secret) headers["X-Lead-Webhook-Secret"] = secret;

		const res = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify({
				eventType,
				message: summarize(lead, eventType),
				lead,
			}),
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
