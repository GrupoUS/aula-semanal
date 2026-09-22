/**
 * Split a string around an optional highlight substring.
 * Callers render `mid` in gold: `{pre}{mid && <span class="text-gold">{mid}</span>}{post}`.
 */
export function splitHighlight(
	text: string,
	highlight?: string,
): { pre: string; mid: string; post: string } {
	if (!highlight || !text.includes(highlight)) {
		return { pre: text, mid: "", post: "" };
	}
	const i = text.indexOf(highlight);
	return {
		pre: text.slice(0, i),
		mid: highlight,
		post: text.slice(i + highlight.length),
	};
}

/**
 * Format a 1-based position as a zero-padded editorial index ("01", "02", …).
 * Used by the numbered-spine numerals (SectionHeading index + Learn cards).
 */
export function formatEditorialIndex(n: number): string {
	return String(n).padStart(2, "0");
}
