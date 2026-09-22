#!/usr/bin/env bun
/**
 * Gate de asserção negativa — Regra Cardinal #10 + issue #2:
 * nenhum sink de analytics/log pode receber nome, e-mail ou telefone crus.
 *
 *   bun scripts/check-no-pii-analytics.ts          # fonte (pre-commit)
 *   bun scripts/check-no-pii-analytics.ts --dist   # bundle (pós-build)
 *
 * Por que existe: o `bunx astro check` pega a violação de TIPO (o `dataLayer`
 * é tipado para recusar `lead_name`/`lead_email`/`lead_phone`), mas não pega
 * um `console.error(payload.contact)` nem um sink montado por string. E o modo
 * `--dist` pega o que o grep de fonte deixou passar depois do bundling.
 *
 * Waiver explícito e revisável no diff:  // pii-gate-allow: <motivo>
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// `import.meta.url`, não `import.meta.dir`: o segundo é Bun-ismo e o
// `bunx astro check` (que varre scripts/ junto) reprova por tipo.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_MODE = process.argv.includes("--dist");

/**
 * Onde PII crua é LEGÍTIMA: só o servidor grava o lead e só ele normaliza e
 * hasheia para a CAPI. Estes caminhos saem da regra de sinks de analytics e
 * entram na regra 4 (console server-side só pode citar o domínio do e-mail).
 *
 * `src/pages/admin/**` entra aqui porque o painel é `prerender = false`: o
 * frontmatter roda no servidor, atrás de `readAdminSession`, e legitimamente
 * lê o lead inteiro para renderizar a tabela.
 */
const SERVER_ONLY = [
	/^src[\\/]lib[\\/]server[\\/]/,
	/^src[\\/]pages[\\/]api[\\/]/,
	/^src[\\/]pages[\\/]admin[\\/]/,
];

const SINK =
	/(dataLayer\s*\.\s*push|\bgtag\s*\(|\bfbq\s*\(|dispatchCro\s*\(|\bcro\s*\(|new CustomEvent\(\s*["']cro["']|console\s*\.\s*(log|info|warn|error|debug)|sendBeacon\s*\(|fetch\(\s*["']\/api\/track)/;

const PII =
	/(contact\s*\.\s*(name|email|phone)\b|payload\s*\.\s*contact\b|lead\s*\.\s*(name|email|phone)\b|fieldEl\(\s*["'](name|email|phone)["']\s*\)|\blead_(name|email|phone)\b|\buser_data\b)/;

/** Chaves banidas em QUALQUER lugar client-side (e no bundle). */
const DENY = /\blead_(name|email|phone)\b/;

/** Console server-side pode citar e-mail só como DOMÍNIO (inscricao.ts:57-61). */
const SERVER_CONSOLE_PII =
	/console\s*\.\s*\w+[\s\S]{0,200}?\b(name|phone)\b|console\s*\.\s*\w+[\s\S]{0,200}?\bemail\b(?!Domain)/;

const failures: string[] = [];
const push = (f: string, l: number, m: string) =>
	failures.push(`  ${f}:${l}  ${m}`);

const walk = (dir: string, out: string[] = []): string[] => {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry.startsWith(".")) continue;
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
};

const targets = DIST_MODE
	? walk(join(ROOT, "dist")).filter((p) => /\.(js|html)$/.test(p))
	: walk(join(ROOT, "src")).filter((p) => /\.(astro|ts|tsx|js|mjs)$/.test(p));

for (const abs of targets) {
	const rel = relative(ROOT, abs);
	const lines = readFileSync(abs, "utf8").split("\n");
	const isServer = SERVER_ONLY.some((re) => re.test(rel));

	lines.forEach((line, i) => {
		if (/pii-gate-allow:/.test(line)) return;

		// Regra 1 — chave banida em qualquer lugar.
		if (DENY.test(line)) push(rel, i + 1, "chave de PII banida no dataLayer");

		if (isServer) {
			// Regra 4 — console server-side: só emailDomain, nunca name/phone/email.
			if (SERVER_CONSOLE_PII.test(line))
				push(rel, i + 1, "console server-side com PII (use emailDomain)");
			return;
		}

		// Regra 2 — janela de 3 linhas: sink + fonte de PII no mesmo bloco.
		const window = lines.slice(i, i + 3).join("\n");
		if (SINK.test(line) && PII.test(window))
			push(rel, i + 1, "sink de analytics/log recebendo PII crua");

		// Regra 3 — código client-side não pode importar o servidor.
		if (/from\s+["'][^"']*lib\/server\//.test(line))
			push(rel, i + 1, "arquivo client-side importando src/lib/server/**");
	});
}

if (failures.length) {
	console.error(
		`\nPII GATE FALHOU (${failures.length}):\n${failures.join("\n")}\n`,
	);
	process.exit(1);
}
console.log(
	`PII GATE OK  (${targets.length} arquivos, modo ${DIST_MODE ? "dist" : "src"})`,
);
