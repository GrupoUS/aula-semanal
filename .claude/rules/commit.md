---
paths:
  - "src/**"
  - "scripts/**"
  - "public/**"
  - "astro.config.mjs"
  - "package.json"
  - ".vercelignore"
  - ".claude/**"
  - ".graph-powers/**"
---

# Commit Format + Pre-Commit Gate — GPUS Astro Landing

> Conventional Commits + lefthook pre-commit + manual gate checklist.

## Conventional Commits

Format: `<type>(<scope>): <subject>` — `feat | fix | docs | refactor | chore | test | perf | style | build | ci`.

Scopes: `site`, `theme`, `content`, `seo`, `astro`, `config`, `form`, `tracking`, `scripts`, `.claude`, `deps`, `a11y`, `perf`.

Examples:

- `feat(site): add landing hero section`
- `fix(content): align WhatsApp CTA copy in product JSON`
- `feat(form): wire registration form to lead endpoint`
- `docs(.claude): align governance with project scope`

One logical change per commit. Reference touched rule when useful.

## Automated gate

`lefthook.yml` runs `bun run lint` on staged source/config files.

## Manual gate checklist

Run in order before commit/PR:

1. `bun run lint`
2. `bunx astro check`
3. `bun run build`
4. Hex scan em UI files: nenhum `#[0-9a-fA-F]{3,8}` fora de `src/styles/global.css` (exceção: `<meta theme-color>`).
5. WhatsApp scan: nenhum `wa.me/` fora de `src/lib/whatsapp.ts`.
6. Content drift scan: nenhuma copy/FAQ/oferta hardcoded em `.astro`/`.tsx` (vive em `${content.productJson}`).
7. Production noise scan: nenhum `console.log` ou `debugger`.
8. Form/PII scan: campos com `<label>`, consent + link de privacidade presentes; sem PII logada.
9. Upload da Vercel: `bun run verify:vercel` — nenhum arquivo de `src/`, `public/` ou config de build pode ser removido pelo `.vercelignore`.
10. PII em analytics: `bun run check:pii` (e `bun scripts/check-no-pii-analytics.ts --dist` depois do build). Também roda no pre-commit via lefthook.

Para mudanças no chrome inferior (aviso de cookies, CTA fixo, botão flutuante) ou no formulário, com um servidor sobre `dist/client`:

11. `bun run check:geometry <URL>` — zero sobreposição entre chrome e zonas de conversão em 390×844, 768×1024 e 1440×1000.
12. `bun run check:states <URL>` — "Inscrição confirmada" só com persistência provada; falha mostra painel de erro e não registra `lead_submit`.

> **Por que 10–12 existem.** Os três gates padrão passam verdes com PII crua no `dataLayer`, com um banner cobrindo o botão de enviar e com o formulário mentindo sucesso — nada disso é erro de tipo, de lint ou de build. Foram exatamente os três defeitos da issue #2.

> **Por que o passo 9 existe.** `.vercelignore` NÃO é aplicado por `bun run build`: os três gates passam verdes e o deploy quebra. Foi o caso da linha `scripts` sem barra inicial, que casa com qualquer pasta desse nome em qualquer nível e apagou `src/scripts/motion.ts` do upload (`Could not resolve "../scripts/motion.ts"`). Padrão de pasta de tooling da raiz leva barra inicial (`/scripts`, `/docs`); padrão de artefato (`node_modules`, `*.log`) fica solto de propósito. Para conferência completa: `node scripts/verify-vercel-upload.mjs --build` copia só o que sobe e roda o pipeline da Vercel isolado.

Para mudanças de UI/perf também rodar `bun run lighthouse:audit` com preview/dev server local.

## Protected files

A lista viva é `.graph-powers/config.json::protectedFiles` — não duplicar aqui. Hoje ela cobre `astro.config.mjs`, `package.json`, `tsconfig.json`, `biome.json`, `lefthook.yml`, `whatsapp.ts`, `content.config.ts` e `bun.lock`.

Editar com razão explícita + validar. O hook de PreToolUse(Edit|Write) bloqueia esses arquivos lendo `config.json`.

> **Como o matcher funciona** (erra fácil): `protectedFiles.exact` compara apenas o **basename** (`PurePath(file_path).name`) — uma entrada como `"src/lib/whatsapp.ts"` **nunca casa** e deixa o arquivo desprotegido. Use o nome puro (`"whatsapp.ts"`). `protectedFiles.contains` faz substring no caminho inteiro, o que quebra no Windows (separador `\`), então serve só para nomes sem diretório, como `bun.lock`.

## Env / secrets

- `PUBLIC_FORM_ENDPOINT`, `PUBLIC_GA4_ID`, `PUBLIC_FB_PIXEL_ID` vivem em env (Vercel / `.env` não commitado). Documentar em `.env.example` quando criados. Nunca commitar valores.

## Branch workflow — main-only

Single-branch repository. Sempre editar em `main`.

- **Sem feature branches**, sem `dev-test`, sem `feature/*`, sem `fix/*`.
- **Never force-push** (`--force` / `-f`).
- **Never auto-merge/auto-approve PRs.**
- Commits direto em `main` após o manual gate + lefthook.
- Push para `origin/main` e deploy Vercel só quando o usuário pedir.

## Chave de opt-in, por shell

Os gates do plugin casam a chave como **texto**, não como sintaxe de shell — qualquer forma que
coloque `<CHAVE>=1` no comando libera o gate. Escreva a que o seu shell aceita:

| Shell | Forma |
|---|---|
| bash, zsh, fish 3.1+ | `AULAOTB_ALLOW_COMMIT=1 git commit -m "..."` |
| fish (qualquer versão) | `env AULAOTB_ALLOW_COMMIT=1 git commit -m "..."` |
| PowerShell | `$env:AULAOTB_ALLOW_COMMIT=1; git commit -m "..."` |
| cmd.exe | `set AULAOTB_ALLOW_COMMIT=1 && git commit -m "..."` |

Enviar para `main` exige **duas** chaves no mesmo comando: `AULAOTB_ALLOW_PUSH=1` (o gate de push) e
`AULAOTB_ALLOW_PUSH_MAIN=1` (o gate de branch protegida). Uma só não passa.
