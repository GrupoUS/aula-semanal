/**
 * Chaves canônicas dos retratos do corpo docente. Cada chave corresponde a
 * `src/assets/images/otb/speakers/<chave>.jpg`.
 *
 * Este módulo NÃO importa `astro:assets` de propósito: ele é consumido por
 * `src/content.config.ts`, que roda fora do pipeline de assets. O mapa
 * chave → imagem otimizada vive em `src/lib/speaker-portraits.ts`.
 *
 * O schema valida `faculty.lista[].foto` contra esta lista, então uma chave
 * inexistente quebra o build em vez de sumir da página em silêncio.
 */
export const SPEAKER_KEYS = [
	"speaker-sacha",
	"speaker-carol",
	"speaker-dieick",
	"speaker-rosana",
	"speaker-kassyo",
] as const;

export type SpeakerKey = (typeof SPEAKER_KEYS)[number];
