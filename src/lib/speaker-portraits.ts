import type { ImageMetadata } from "astro";
import carol from "../assets/images/otb/speakers/speaker-carol.jpg";
import dieick from "../assets/images/otb/speakers/speaker-dieick.jpg";
import kassyo from "../assets/images/otb/speakers/speaker-kassyo.jpg";
import rosana from "../assets/images/otb/speakers/speaker-rosana.jpg";
import sacha from "../assets/images/otb/speakers/speaker-sacha.jpg";
import type { SpeakerKey } from "./speakers";

/**
 * Mapa chave → retrato otimizado, compartilhado por `Faculty.astro` (grid do
 * corpo docente) e `DuoPortrait.astro` (plate da primeira dobra). Explícito, sem
 * `import.meta.glob`, para o bundler resolver cada asset em build time.
 *
 * `Record<SpeakerKey, …>` é exaustivo: adicionar uma chave em `SPEAKER_KEYS`
 * sem o retrato correspondente falha no type-check.
 */
export const speakerPortraits: Record<SpeakerKey, ImageMetadata> = {
	"speaker-sacha": sacha,
	"speaker-carol": carol,
	"speaker-dieick": dieick,
	"speaker-rosana": rosana,
	"speaker-kassyo": kassyo,
};
