// Leitor de env server-side. Runtime (Vercel serverless) usa process.env;
// fallback import.meta.env cobre build/dev. Retorna undefined quando vazio.

export function getServerEnv(name: string): string | undefined {
	const fromProcess =
		typeof globalThis.process !== "undefined"
			? globalThis.process.env?.[name]
			: undefined;
	if (fromProcess && fromProcess.length > 0) return fromProcess;

	const fromImport = (import.meta.env as Record<string, string | undefined>)?.[
		name
	];
	if (fromImport && fromImport.length > 0) return fromImport;

	return undefined;
}

export function getMissingEnv(names: string[]): string[] {
	return names.filter((name) => !getServerEnv(name));
}
