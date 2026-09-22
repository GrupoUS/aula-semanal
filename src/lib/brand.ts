// Strings e assets de marca que NÃO pertencem ao SSOT de conteúdo do produto.
// A copy da aula vive em src/content/products/aula-otb.json; aqui ficam só os
// valores da marca-mãe, estáveis entre campanhas.

/** Assinatura sob a marca no rodapé. */
export const BRAND_TAGLINE = "Out of the Box · Grupo US";

/** Lockup raster (marca + tagline). Usado só em metadados: JSON-LD e OG. */
export const BRAND_LOGO = "/images/otb/otb-logo-gold.png";

/**
 * Marca OTB vetorial — monograma sem a tagline, traçado a partir do lockup de
 * produção. SVG porque o mesmo arquivo serve do favicon de 16px ao carimbo do
 * CTA final sem perder nitidez, e porque a tagline embutida vira borrão abaixo
 * de ~120px de largura (era esse borrão que deixava o lockup "apertado").
 */
export const BRAND_MARK = "/images/otb/otb-mark.svg";

/** Proporção intrínseca do monograma (viewBox 822×360). */
export const BRAND_MARK_RATIO = 822 / 360;

/** Altura padrão em px da marca no lockup de cabeçalho. */
export const BRAND_MARK_HEIGHT = 36;
