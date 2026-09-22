#!/usr/bin/env node
/**
 * Verifica o conjunto de arquivos que a Vercel realmente recebe.
 *
 * Por que existe: `.vercelignore` NÃO é aplicado por `bun run build`. Um padrão
 * mal escrito lá passa por lint, astro check e build locais — e só quebra no
 * deploy. Foi o que aconteceu com a linha `scripts` (sem barra inicial), que
 * casa com QUALQUER pasta desse nome em qualquer nível e apagou
 * `src/scripts/motion.ts` do upload:
 *
 *   Could not resolve "../scripts/motion.ts" from "src/layouts/Layout.astro"
 *
 * O que faz: reproduz o filtro com o próprio matcher do git e falha se algum
 * arquivo de código-fonte (`src/`, `public/`) ou de config de build sumir.
 *
 * Uso:
 *   node scripts/verify-vercel-upload.mjs          # checagem rápida (ms)
 *   node scripts/verify-vercel-upload.mjs --build  # + build do conjunto isolado
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const git = (args) =>
	execFileSync("git", ["--no-pager", ...args], { encoding: "utf8" })
		.split("\n")
		.filter(Boolean);

/** Pastas cujo conteúdo precisa chegar na Vercel para o build existir. */
const MUST_UPLOAD = ["src/", "public/"];
/** Arquivos de raiz sem os quais o build não roda. */
const MUST_UPLOAD_FILES = [
	"package.json",
	"bun.lock",
	"astro.config.mjs",
	"tsconfig.json",
	"vercel.json",
];

const tracked = new Set(git(["ls-files"]));
const removed = git([
	"ls-files",
	"--cached",
	"--ignored",
	"--exclude-from=.vercelignore",
]);

const lost = removed.filter(
	(f) =>
		MUST_UPLOAD.some((p) => f.startsWith(p)) || MUST_UPLOAD_FILES.includes(f),
);

console.log(
	`rastreados ${tracked.size} · removidos pelo .vercelignore ${removed.length} · sobem ${tracked.size - removed.length}`,
);

if (lost.length) {
	console.error(
		`\n✗ .vercelignore remove ${lost.length} arquivo(s) que o build precisa:\n`,
	);
	for (const f of lost) console.error(`    ${f}`);
	console.error(
		"\n  Padrão sem barra inicial casa em qualquer nível. Ancore na raiz (`/scripts`)\n  ou mova o arquivo. Ver docs/aula-otb-changelog.md.\n",
	);
	process.exit(1);
}

console.log("✓ nenhum arquivo de src/, public/ ou config de build é removido");

if (!process.argv.includes("--build")) process.exit(0);

// --build: copia só o que sobe para uma pasta limpa e roda o pipeline da Vercel.
const dir = mkdtempSync(join(tmpdir(), "vercel-upload-"));
try {
	const keep = [...tracked].filter((f) => !removed.includes(f));
	for (const f of keep)
		cpSync(f, join(dir, f), { recursive: false, force: true });
	console.log(`\ncopiados ${keep.length} arquivos para ${dir}`);
	execFileSync("bun", ["install", "--frozen-lockfile"], {
		cwd: dir,
		stdio: "inherit",
	});
	execFileSync("bun", ["run", "build"], { cwd: dir, stdio: "inherit" });
	console.log("\n✓ build do conjunto de upload passou");
} finally {
	rmSync(dir, { recursive: true, force: true });
}
