// Modelo de dados do lead (adaptado enxuto — sem quiz/score).
// Zod via astro/zod (Astro já bundla zod; evita dependência nova).
import { z } from "astro/zod";

// Contato capturado pelo formulário (LGPD: consentimento obrigatório).
export const leadContactSchema = z.object({
	name: z.string().trim().min(2),
	email: z.string().trim().email(),
	phone: z.string().trim().min(10),
	profession: z.string().trim().optional(),
	consentGiven: z.literal(true),
	consentTimestamp: z.string().datetime(),
});

// Metadados de origem (atribuição). Todos opcionais.
export const leadMetaSchema = z.object({
	utm: z.record(z.string(), z.string()).default({}),
	referrer: z.string().optional(),
	userAgent: z.string().optional(),
	landingPath: z.string().optional(),
	// event_id do Pixel (browser) p/ deduplicar o Lead enviado via Meta CAPI.
	eventId: z.string().optional(),
});

// Payload aceito pelo endpoint de captura.
export const capturePayloadSchema = z.object({
	contact: leadContactSchema,
	meta: leadMetaSchema.default({ utm: {} }),
});

export const leadStatusSchema = z.enum(["novo", "contatado"]);

// Lead como armazenado/lido da planilha Google (via Apps Script Web App).
export const storedLeadSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string(),
	profession: z.string().nullable().optional(),
	consent: z.boolean(),
	consentAt: z.string().nullable().optional(),
	utm: z.record(z.string(), z.string()).default({}),
	referrer: z.string().nullable().optional(),
	userAgent: z.string().nullable().optional(),
	landingPath: z.string().nullable().optional(),
	status: leadStatusSchema,
	createdAt: z.string(),
	updatedAt: z.string(),
	contactedAt: z.string().nullable().optional(),
	/** Origem derivada — colunas P/Q/R da planilha (Code.gs :: toLead_).
	 *  Opcional de propósito: linha anterior à `migrar()`, ou Web App ainda na
	 *  versão antiga, devolve vazio e o TypeScript recalcula com o host
	 *  canônico. É o que torna os dois deploys (Vercel e Apps Script)
	 *  independentes de ordem. */
	fonte: z.string().nullable().optional(),
	midia: z.string().nullable().optional(),
	campanha: z.string().nullable().optional(),
});

export type LeadContact = z.infer<typeof leadContactSchema>;
export type LeadMeta = z.infer<typeof leadMetaSchema>;
export type CapturePayload = z.infer<typeof capturePayloadSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type StoredLead = z.infer<typeof storedLeadSchema>;
