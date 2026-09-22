/**
 * WhatsApp SSOT — SDR Laura (Grupo US / Na Mesa com Sacha).
 * Cardinal #6: never inline wa.me URLs anywhere else.
 * E.164 sem + (padrão wa.me).
 */

export const WHATSAPP_SDR_E164 = "556294705081";

const REQUIRED_PREFIX = "Olá, Laura!";

const WHATSAPP_URL_PATTERN =
	/^https?:\/\/(wa\.me|api\.whatsapp\.com|wa\.link)/i;

/** Mensagem padrão da aula gratuita — PROPOSTA (ajustar com a copy final). */
export const WHATSAPP_DEFAULT_MESSAGE =
	"Olá, Laura! Quero garantir minha vaga no Na Mesa com Sacha.";

/** Contato institucional / site — mensagem pré-preenchida para a Laura. */
export const WHATSAPP_DEFAULT_SITE_MESSAGE =
	"Olá, Laura! Quero saber mais sobre as aulas do Na Mesa com Sacha.";

/** URL base do WhatsApp da Laura (sem texto). */
export const whatsappUrlBase = `https://wa.me/${WHATSAPP_SDR_E164}`;

/**
 * Gera URL wa.me com texto pré-preenchido.
 * Enforce SSOT: toda mensagem precisa começar com "Olá, Laura!".
 */
export function whatsappUrlWithText(message: string): string {
	if (!message.startsWith(REQUIRED_PREFIX)) {
		throw new Error(
			`WhatsApp message must start with "${REQUIRED_PREFIX}" (SDR SSOT). Received: "${message.slice(0, 32)}…"`,
		);
	}
	return `https://wa.me/${WHATSAPP_SDR_E164}?text=${encodeURIComponent(message)}`;
}

/** URL para contato direto de parceiro (telefone próprio). */
export function whatsappPartnerUrl(phone: string, message: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 10) {
		throw new Error(`Partner WhatsApp phone too short. Received: "${phone}"`);
	}
	return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** True quando `url` já abre o WhatsApp (evita CTA primário + botão verde redundantes). */
export function isWhatsAppDestination(url: string): boolean {
	return WHATSAPP_URL_PATTERN.test(url.trim());
}

export function defaultWhatsAppUrl(): string {
	return whatsappUrlWithText(WHATSAPP_DEFAULT_MESSAGE);
}
