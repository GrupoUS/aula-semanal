---
paths:
  - ".codex/rules/README.md"
---

# Camada de regras — (Codex)

Este diretório existe para o Codex CLI, e é deliberadamente **um índice, não uma segunda cópia**.
As regras de domínio deste repositório vivem em `.claude/rules/`, em uma cópia só. Duas autoridades
sobre o mesmo assunto é pior que nenhuma: a pergunta "qual delas vale?" passa a ser sobre os
arquivos em vez de sobre o código.

Processo genérico — planejar, depurar, verificar, delegar, revisar — vem do plugin `graph-powers`,
instalado uma vez por máquina, e não é repetido aqui nem lá.

## Onde cada assunto mora

| Assunto | Arquivo | Autoridade |
|---|---|---|
| Identidade, invariantes `[HARD]`, gates | `AGENTS.md` (raiz) | Ponto de partida do Codex |
| Comportamento, routing por path, decision authority | `.claude/CLAUDE.md` | |
| Render Astro, Content Collections, `Layout.astro` | `.claude/rules/astro.md` | Domínio |
| Lead, PII, LGPD, estados do formulário, chrome inferior | `.claude/rules/lead-e-pii.md` | Domínio |
| Deploy Vercel, `.vercelignore`, `vercel.json` | `.claude/rules/deploy-vercel.md` | Domínio |
| Conventional Commits, gate manual, chave de opt-in por shell | `.claude/rules/commit.md` | Domínio |
| Placement, hidratação, forms, perf, a11y | `.claude/rules/frontend.md` | Universal |
| Cor, tipografia, motion, profundidade, foco | `.claude/rules/DESIGN.md` + raiz `DESIGN.md` | Universal + projeto |
| Checklist de validação, CWV, triagem de debug | `.claude/rules/stability.md` | Universal |
| Locale, sitemap, OG, JSON-LD, GEO | `.claude/rules/seo.md` | Universal |
| MCP, disciplina de terminal | `.claude/rules/mcp.md` | Universal |
| Posicionamento, funil, guardrails de copy, o que o produto não fará | raiz `PRODUCT.md` | Produto |
| O que este projeto recusa mesclar | raiz `REVIEW.md` | Review |

Índice completo com a coluna `paths:` de cada regra: `.claude/rules/README.md`.

## Parâmetros

Branch de trabalho `main` · branch protegida `main` · prefixo de opt-in `AULAOTB` ·
gerenciador `bun`. Todos vêm de `.graph-powers/config.json`, que os guardrails leem em tempo de
execução — este arquivo não é a fonte deles, só os cita.

Gates declarados: `bun run lint` · `./node_modules/.bin/astro check` · `bun run build`.
Este projeto **não tem test runner**, e isso é deliberado (`tooling.testRunner: null`).

## Precedência

Do mais específico para o mais geral — o primeiro que fala sobre o assunto vence:

1. `AGENTS.md` do subdiretório em edição (`src/`, `src/components/landing/`)
2. `.claude/rules/*.md` carregado por `paths:`
3. `.claude/CLAUDE.md` + `.graph-powers/config.json`
4. `AGENTS.md` da raiz
5. Skills do plugin `graph-powers` e de marca (`gpus-theme`, `grupo-us`)

## O que não entra aqui

Regra genérica de processo. Se um arquivo neste diretório descrever como planejar, revisar, depurar
ou delegar, ele está duplicando o plugin — e duas cópias divergem. Uma regra deste repositório
responde a uma pergunta que só este repositório faz.
