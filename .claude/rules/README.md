---
paths:
  - ".claude/rules/README.md"
---

# Rules — camada de domínio de `aula-semanal`

> **O processo vem do plugin `graph-powers`** (escopo user): planejamento, debug, verificação,
> review, delegação e os guardrails de git/execução. Este diretório carrega só o que vale
> exclusivamente neste repositório — e o que sobrou aqui de universal, que o plugin distribui como
> template e não como regra ativa.

## Arquivos

| Regra | `paths:` cobre | Autoridade |
|---|---|---|
| `astro.md` | `src/**`, `astro.config.mjs`, `src/content.config.ts` | Invariantes de render, Content Collections SSOT, contratos do `Layout.astro` |
| `lead-e-pii.md` | formulário, `/api/**`, `/admin/**`, `src/lib/{leads,server}/**`, gates de PII/estados | **Domínio.** Persistência provada, zero PII em analytics, consent LGPD, geometria do chrome |
| `deploy-vercel.md` | `.vercelignore`, `vercel.json`, `astro.config.mjs`, `src/scripts/**` | **Domínio.** Barra inicial em padrão de pasta da raiz; `.vercelignore` não vale para `bun run build` |
| `commit.md` | fontes, configs de build, `.claude/**`, `.graph-powers/**` | Conventional Commits, lefthook, checklist manual de gate |
| `frontend.md` | `src/{pages,components,layouts,styles,content}/**` | Universal: placement, hidratação, forms, perf, a11y |
| `DESIGN.md` | `src/{components,layouts,styles,pages}/**` | Universal: cor, tipografia, componentes, motion, profundidade, foco |
| `stability.md` | `src/**`, `scripts/**`, `package.json`, `tsconfig.json` | Universal: checklist de validação, invariantes de render, CWV, triagem de debug |
| `seo.md` | `src/{layouts,pages}/**`, `astro.config.mjs`, `robots.txt` | Universal: locale, sitemap, OG/Twitter, JSON-LD, GEO |
| `mcp.md` | `src/**`, `scripts/**`, `.claude/**` | MCP, disciplina de terminal, loop de debug |

## Invariantes não-negociáveis

Vivem em `.claude/CLAUDE.md § Invariantes deste projeto [HARD]`, não aqui. São dez, cada uma com um
custo real por trás: Bun only, main-only, MPA estático com carve-out aprovado em `/admin` + `/api`,
copy no Content Collection, WhatsApp SSOT com prefixo obrigatório, zero hex fora do `@theme`, motion
livre honrando `prefers-reduced-motion`, e lead/PII com consent.

O piso de segurança que vale para todo agente do plugin é
`${CLAUDE_PLUGIN_ROOT}/references/safety-floor.md` — é o que as mensagens de deny dos gates de git
citam quando negam um commit ou um push.

## Escopo

Não importar rotas, copy, CTA ou memória de outros projetos GPUS. Marca: Grupo US · Dra. Sacha
Gualberto. Modelo visual opcional: `${project.designModelRepo}`.
