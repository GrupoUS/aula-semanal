// Empurra o lead para o CRM do NeonDash, que é de onde o agente Hermes trabalha.
//
// Por que não dá pra reusar o LEAD_NOTIFY_WEBHOOK_URL: aquele canal manda o
// envelope genérico { eventType, message, lead } com o segredo no header
// X-Lead-Webhook-Secret. O endpoint do NeonDash exige Authorization: Bearer e um
// payload de lead com `nome` obrigatório — apontar o webhook genérico pra lá
// devolveria 401 e, com o Bearer certo, 422. Daí este adaptador.
//
// Sem NEONDASH_CRM_INBOUND_TOKEN → skip silencioso, igual ao lead-notifier.
import { leadSource } from "../leads/attribution";
import type { StoredLead } from "../leads/schema";
import { getServerEnv } from "./env";

const TOKEN_ENV = "NEONDASH_CRM_INBOUND_TOKEN";
const URL_ENV = "NEONDASH_CRM_INBOUND_URL";

// Base do provedor mora no service module (nunca em componente). Só precisa ir
// pra env quando o destino mudar (staging, self-host).
const DEFAULT_URL = "https://api.neondash.com.br/api/webhooks/crm-inbound";

// Identifica a origem dentro do CRM. Limite do schema remoto: 100 chars.
const ORIGEM_EXTERNA = "aula-otb";

const TIMEOUT_MS = 6000;

// Limites do schema remoto (apps/api/src/crm-inbound.ts). Truncar aqui evita um
// 422 que só apareceria em produção, com o lead já perdido.
const MAX_EXTERNAL_ID = 160;
const MAX_CUSTOM_KEY = 80;
const MAX_CUSTOM_VALUE = 500;
const MAX_NOTES = 2000;

export interface CrmResult {
	/** `duplicate` = o CRM já tinha este lead (200); não é erro. */
	status: "sent" | "duplicate" | "failed" | "skipped";
	reason?: string;
	leadId?: number;
}

function clamp(value: string, max: number): string {
	return value.length > max ? value.slice(0, max) : value;
}

/** customFields do CRM aceita só Record<string, string>. */
function buildCustomFields(lead: StoredLead): Record<string, string> {
	const fields: Record<string, string> = {};

	const put = (key: string, value: string | null | undefined): void => {
		if (!value) return;
		fields[clamp(key, MAX_CUSTOM_KEY)] = clamp(value, MAX_CUSTOM_VALUE);
	};

	put("profissao", lead.profession);
	put("landing_path", lead.landingPath);
	put("referrer", lead.referrer);
	put("consentimento_em", lead.consentAt);
	// Origem legível primeiro: é o que o time de vendas lê no CRM. As chaves
	// utm_* cruas continuam indo junto, para conferência.
	const source = leadSource(lead);
	put("fonte", source.fonte);
	put("midia", source.midia);
	put("campanha", source.campanha);
	for (const [key, value] of Object.entries(lead.utm ?? {})) put(key, value);

	return fields;
}

/**
 * @param failureCode preenchido só no canal degradado (planilha fora do ar), pra
 * que o lead chegue no CRM já sinalizado como "confira à mão".
 */
export async function pushLeadToCrm(
	lead: StoredLead,
	failureCode?: string,
): Promise<CrmResult> {
	const token = getServerEnv(TOKEN_ENV);
	if (!token) return { status: "skipped" };

	const url = getServerEnv(URL_ENV) ?? DEFAULT_URL;
	const externalId = clamp(lead.id, MAX_EXTERNAL_ID);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const customFields = buildCustomFields(lead);
		if (failureCode)
			customFields.captura = clamp(failureCode, MAX_CUSTOM_VALUE);

		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				// Mesmo e-mail reinscrito → mesmo lead.id (o store faz upsert) → o CRM
				// responde 200 duplicate em vez de criar um segundo lead. Também torna
				// qualquer retry seguro.
				"Idempotency-Key": externalId,
			},
			body: JSON.stringify({
				nome: lead.name,
				email: lead.email,
				telefone: lead.phone,
				origemExterna: ORIGEM_EXTERNA,
				externalId,
				customFields,
				...(failureCode
					? {
							qualificationNotes: clamp(
								`Lead capturado com a planilha indisponível (${failureCode}). Confira o registro manualmente.`,
								MAX_NOTES,
							),
						}
					: {}),
			}),
			signal: controller.signal,
		});

		if (!res.ok) return { status: "failed", reason: `http_${res.status}` };

		// 201 = lead novo · 200 = evento duplicado (body traz duplicate: true).
		const body = (await res.json().catch(() => null)) as {
			leadId?: number;
			duplicate?: boolean;
		} | null;

		return {
			status: body?.duplicate ? "duplicate" : "sent",
			leadId: body?.leadId,
		};
	} catch (err) {
		return {
			status: "failed",
			reason: err instanceof Error ? err.name : "error",
		};
	} finally {
		clearTimeout(timer);
	}
}
