/**
 * Chaves canônicas das fotos de acervo do OTB. Cada chave corresponde a
 * `src/assets/images/otb/gallery/<chave>.jpg`.
 *
 * Este módulo NÃO importa `astro:assets` de propósito: ele é consumido por
 * `src/content.config.ts`, que roda fora do pipeline de assets. O mapa
 * chave → imagem otimizada vive em `src/lib/gallery-images.ts`.
 *
 * O schema valida `gallery.photos[].key` contra esta lista, então uma chave
 * inexistente quebra o build em vez de sumir da faixa em silêncio.
 *
 * Só entram aqui fotos elegíveis para a FAIXA. Fundos de seção
 * (`aula-plateia`, `aula-anfiteatro`, `turma-escadaria`) são importados
 * direto pelo componente que os usa — não passam pelo SSOT de conteúdo
 * porque a escolha é de composição, não de copy.
 */
export const GALLERY_KEYS = [
	"aula-1",
	"pratica-1",
	"turma-evento-1",
	"turma-evento-3",
	"turma-celebracao",
	"turma-escadaria-wide",
	"turma-mesa",
	"aula-palestra",
	"aula-painel",
	"mesa-turma",
	"participante-imersao",
] as const;

export type GalleryKey = (typeof GALLERY_KEYS)[number];
