export function escapeCsv(value: unknown): string {
	const text =
		value == null
			? ""
			: typeof value === "object"
				? JSON.stringify(value)
				: String(value);
	// Aspas CSV não impedem execução de fórmulas em Excel/Sheets.
	const safe = /^[\s\p{Cc}\p{Cf}]*[=+\-@]/u.test(text) ? `'${text}` : text;
	return `"${safe.replace(/"/g, '""')}"`;
}
