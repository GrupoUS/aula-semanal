/**
 * Chaves do conjunto Lucide desenhado em `src/components/shared/Icon.astro`.
 *
 * Vive num módulo próprio porque `src/content.config.ts` precisa validar contra
 * a lista e não pode importar de um `.astro`. Chave nova = adicionar aqui E no
 * mapa `ICONS` do componente, na mesma mudança — o `Record<IconKey, string>` do
 * Icon.astro quebra o type-check se as duas listas divergirem.
 */
export const ICON_KEYS = [
	"video",
	"user",
	"users",
	"layers",
	"target",
	"sparkles",
	"trending-up",
	"check",
	"x",
	"calendar",
	"chevron-left",
	"chevron-right",
	"quote",
	"shield-check",
	"graduation-cap",
	"map-pin",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];
