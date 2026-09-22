# Na Mesa com Sacha — Aula semanal · Grupo US

## Projeto

Landing principal em `/` para aulas gratuitas com Dra. Sacha Gualberto, toda
terça-feira no Zoom. Esta pasta foi copiada de outro projeto e agora tem produto
e direção visual próprios. `PRODUCT.md` e `DESIGN.md` são as autoridades locais.
Documentação histórica em `docs/` não fornece fatos ou ofertas desta série.

Stack: Astro 6 estático, Tailwind v4, Bun, adapter Vercel. Apenas `/admin/*` e
`/api/*` usam renderização on-demand. Preservar checkout; esta cópia chegou sem Git.

## Contratos

- Bun only; `bun.lock` único lockfile. Sem dependências novas sem aprovação.
- Copy na collection `products`, entry `src/content/products/aula-semanal.json`.
- Schema em `src/content.config.ts`; mudar schema + JSON + consumidor juntos.
- WhatsApp apenas via `src/lib/whatsapp.ts`, prefixo “Olá, Laura!”.
- Formulário reutiliza `/api/inscricao`; consentimento obrigatório e sucesso só
  com persistência comprovada. Qualificadores opcionais vão rotulados em
  `contact.profession`, sem novas colunas. Nenhum PII em analytics.
- Sem SPA, ClientRouter, novo endpoint ou ilha React desnecessária.
- Tokens no `@theme` de `src/styles/global.css`; acessibilidade, foco e redução
  de movimento preservados.
- Sem horário, data ISO, grupo, certificado ou resultado inventado.
- Sem alteração de secrets, autenticação, destinos externos, migração, commit,
  push ou deploy sem autorização específica.

## Gates

```bash
bun run lint
bunx astro check
bun run build
bun run verify:vercel
bun run check:pii
bun scripts/check-no-pii-analytics.ts --dist
```

Com servidor local: `bun run check:states <URL>` e
`bun run check:geometry <URL>`. Inspecionar desktop/mobile em navegador real.
`bun run lighthouse:audit <URL>` é advisory. Não há test runner declarado.
`verify:vercel` depende de Git; sem `.git`, reportar bloqueio, não PASS.
`bun run smoke` grava dados externos e exige autorização própria.

## Contexto

Parâmetros: `.graph-powers/config.json`. Regras: `.claude/CLAUDE.md` e
`.claude/rules/`. Overlays: `src/AGENTS.md`, `src/components/AGENTS.md` e
`src/components/landing/AGENTS.md`. Documentação: `docs/AGENTS.md`.
Integrações: `docs/planilha-leads.md`.
Estado da adaptação e pendências: `docs/aula-semanal-implementacao.md`.

O processo compartilhado permanece no harness global; não duplicar configurações
ou instalar outro. Os opt-ins de Git herdados permanecem sem alteração até revisão
própria; nunca contornar uma proteção para concluir esta adaptação visual.

<!-- graph-powers:start -->
## Graph Powers

This machine runs the Graph Powers harness, installed once and shared by every project.

Three files carry everything else:

- `~/.codex/graph-powers/shared-context.md` — an index of the shared patterns, one file each under
  `~/.codex/graph-powers/shared/`: config loader, quality gates, complexity routing, agent matrix,
  spawn patterns, and the rest. Read the index, then only the fragments the task needs.
- `~/.codex/graph-powers/safety-floor.md` — the invariants that hold regardless of the task: git and
  outward-facing actions, tenant and personal data, irreversible operations, secrets, tooling,
  scope, completion claims, accessibility.
- `~/.codex/graph-powers/execution-floor.md` — how the work is coordinated, in force from the first turn:
  delegation is required above L3 and refused below it, read-only agents go to the background in
  a single message, one writer per file, and the seven-section contract every spawned prompt
  carries. On Codex nothing spawns on its own — the prompt has to say so. Read it before
  spawning anything.

**What is global and what is this project's.** The harness itself — skills, subagents,
commands, guardrails — is installed once for the whole machine, because it is identical
everywhere. What belongs to this repository and nothing else lives here:

- `.graph-powers/config.json` — the branch, the gate commands, the paths, the opt-in prefix
- `.codex/rules/` and `.claude/rules/` — this project's domain rules
- `DESIGN.md`, `PRODUCT.md`, `REVIEW.md` — its design, product and review authorities

The guardrails are what make one global copy correct rather than sloppy: they read **this**
project's config at runtime, so the same files enforce a different work branch and a different
opt-in key in every repository.

Read the config; never assume it. A denied command is the rule working, not a bug to route
around: it names the environment variable that releases it, and a person sets that variable,
in the turn they approved it.
<!-- graph-powers:end -->
