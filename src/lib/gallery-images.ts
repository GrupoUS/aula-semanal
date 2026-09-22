import type { ImageMetadata } from "astro";
import aula1 from "../assets/images/otb/gallery/aula-1.jpg";
import aulaPainel from "../assets/images/otb/gallery/aula-painel.jpg";
import aulaPalestra from "../assets/images/otb/gallery/aula-palestra.jpg";
import mesaTurma from "../assets/images/otb/gallery/mesa-turma.jpg";
import participanteImersao from "../assets/images/otb/gallery/participante-imersao.jpg";
import pratica1 from "../assets/images/otb/gallery/pratica-1.jpg";
import turmaCelebracao from "../assets/images/otb/gallery/turma-celebracao.jpg";
import turmaEscadariaWide from "../assets/images/otb/gallery/turma-escadaria-wide.jpg";
import turmaEvento1 from "../assets/images/otb/gallery/turma-evento-1.jpg";
import turmaEvento3 from "../assets/images/otb/gallery/turma-evento-3.jpg";
import turmaMesa from "../assets/images/otb/gallery/turma-mesa.jpg";
import type { GalleryKey } from "./gallery";

/**
 * Mapa chave → foto de acervo otimizada, consumido por `GalleryMarquee.astro`.
 * Explícito, sem `import.meta.glob`, para o bundler resolver cada asset em
 * build time.
 *
 * `Record<GalleryKey, …>` é exaustivo: adicionar uma chave em `GALLERY_KEYS`
 * sem o arquivo correspondente falha no type-check.
 */
export const galleryImages: Record<GalleryKey, ImageMetadata> = {
	"aula-1": aula1,
	"pratica-1": pratica1,
	"turma-evento-1": turmaEvento1,
	"turma-evento-3": turmaEvento3,
	"turma-celebracao": turmaCelebracao,
	"turma-escadaria-wide": turmaEscadariaWide,
	"turma-mesa": turmaMesa,
	"aula-palestra": aulaPalestra,
	"aula-painel": aulaPainel,
	"mesa-turma": mesaTurma,
	"participante-imersao": participanteImersao,
};
