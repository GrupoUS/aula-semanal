# REVIEW.md — o que este projeto recusa mesclar

> Uma pergunta, respondida uma vez. **O protocolo de review vem do plugin `graph-powers`**
> (`/pr-review`, `/verify`): caminhos independentes em paralelo, consolidação, barra de aprovação
> estrutural. O que o plugin não pode saber é o que já quebrou *aqui*, quais gates são reais neste
> repositório e quem aprova o quê. É isso que este arquivo carrega.

## 1. Os gates, e o que cada um prova

| Gate | Comando | Prova | **Não cobre** |
|---|---|---|---|
| Lint | `bun run lint` | Biome + oxlint limpos em `src/`, `scripts/`, `astro.config.mjs` | `src/layouts/*` e `scripts/apps-script/*` estão fora do oxlint por `--ignore-pattern` |
| Type check | `bunx astro check` | Shapes batem na fronteira; JSON de conteúdo valida contra o Zod | Nulabilidade em runtime vinda do endpoint de leads e do Apps Script |
| Build | `bun run build` | Compila e empacota; rotas estáticas + as 8 on-demand | Que funcione. E **não** aplica `.vercelignore` — ver gate seguinte |
| Upload Vercel | `bun run verify:vercel` | Nenhum arquivo de `src/`, `public/` ou config de build sai do upload | Que o deploy suba: só reproduz o filtro, não publica |
| PII | `bun run check:pii` | Nenhum nome/e-mail/telefone em sink de analytics, na fonte | O bundle. Rodar `bun scripts/check-no-pii-analytics.ts --dist` depois do build |
| Geometria | `bun run check:geometry <URL>` | Chrome inferior não cobre nem bloqueia zona de conversão em 3 viewports | Qualquer viewport fora dos três medidos |
| Estados | `bun run check:states <URL>` | "Inscrição confirmada" só com persistência provada | Que a planilha realmente recebeu — isso é o `bun run smoke` |
| Lighthouse | `bun run lighthouse:audit` | Alvos ≥ 95 em `/`, `/termos`, `/politica-de-privacidade` | **Advisory.** Não trava merge, por decisão de projeto: motion rico troca contra INP |

**Não existe test runner, e é deliberado** (`tooling.testRunner: null`). O que substitui testes são
os gates de CDP acima. Um gate que este projeto não declara é reportado como **não declarado**,
nunca como aprovado.

Só `lint` e `check:pii` rodam no pre-commit (lefthook). Os de CDP precisam de servidor e vivem no
`predeploy` e no runbook de QA.

## 2. Achados bloqueantes — a lista deste projeto

Cada um aconteceu aqui. A referência é o commit ou a entrada do changelog.

| # | Achado bloqueante | Por que bloqueia |
|---|---|---|
| B1 | Padrão de pasta da raiz no `.vercelignore` **sem** barra inicial | `scripts` casou `src/scripts/` e apagou `src/scripts/motion.ts` do upload. Build local verde, três gates verdes, deploy morto com `Could not resolve "../scripts/motion.ts"` (`c67f344`) |
| B2 | Estado de sucesso do formulário sem `persisted: true` | A landing dizia "Inscrição confirmada" sem gravação durável. Nenhum dos três gates padrão acusa: não é erro de tipo, de lint nem de build (issue #2, 2026-08-18) |
| B3 | PII cru em `dataLayer`/`gtag`/`fbq` | Nome, e-mail e telefone chegaram a analytics. Mesmo caso: passa nos gates padrão (issue #2) |
| B4 | Chrome inferior cobrindo o botão de enviar | Aviso de cookies + CTA fixo + botão flutuante disputam a borda inferior. Offset não resolveu; só prova geométrica resolve (issue #2) |
| B5 | Evento de tracking duplicado | Meta Lead disparava duas vezes por inscrição, inflando conversão (`9648e48`) |
| B6 | Copy de produto hardcoded em `.astro`/`.tsx` | Fura o SSOT do Content Collection e escapa da validação Zod, que é o que impede data/promessa fabricada ir ao ar |
| B7 | `wa.me/...` inline | Fura o SSOT do SDR. Mensagem sem o prefixo obrigatório não roteia para a Laura — há `throw` em runtime e `refine` no schema exatamente por isso |
| B8 | `prerender = false` em página pública | Quebra o contrato estático. O carve-out aprovado é só `/admin/*` e `/api/*` |
| B9 | Hex fora do `@theme` de `src/styles/global.css` | Fura o canon de tokens. Exceção documentada: o `<meta theme-color>` literal |
| B10 | Animação sem `prefers-reduced-motion` | Piso de a11y, não advisory. Motion é livre aqui — a única contrapartida obrigatória é essa |

*Preferência, não incidente:* alvos de Lighthouse e orçamento de JS inicial. Estão anotados como
advisory de propósito e não bloqueiam.

## 3. Checagens mecânicas

Rodar antes de qualquer julgamento humano.

| Checagem | Comando | Um acerto significa |
|---|---|---|
| Hex fora dos tokens | `grep -rn "bg-\[#\|text-\[#\|border-\[#" src` | Bloqueia — B9 |
| `wa.me` fora do helper | `grep -rn "wa\.me/" src --include="*.astro" --include="*.tsx" --include="*.ts" \| grep -v lib/whatsapp.ts` | Bloqueia — B7 |
| `prerender = false` em rota pública | `grep -rn "prerender = false" src/pages \| grep -v "src/pages/\(api\|admin\)/"` | Bloqueia — B8 |
| Ruído de produção | `grep -rn "console\.log\|debugger" src` | Bloqueia |
| Emoji como ícone de UI | `grep -rnP "[\x{1F300}-\x{1FAFF}]" src/components` | Bloqueia — Lucide ou SVG inline |
| Padrão sem barra no `.vercelignore` | `grep -nvE "^(#\|$\|/\|!\|node_modules$\|\.astro$\|dist$\|\.cache$\|\.env\|\*\.log$\|\.DS_Store$\|Thumbs\.db$\|\.vscode$\|\.idea$)" .vercelignore` | Bloqueia — B1. Todo padrão de pasta da raiz leva `/`; a allowlist do comando são os padrões de artefato, soltos de propósito |

## 4. Superfícies com barra mais alta

| Superfície | Paths | Exigir a mais |
|---|---|---|
| Lead e PII | `RegistrationForm.astro`, `src/pages/api/**`, `src/lib/{leads,server}/**` | O caso negativo: endpoint fora do ar ainda mostra painel de erro e **não** emite `lead_submit`? |
| Painel admin | `src/pages/admin/**`, `src/pages/api/admin/**` | Autenticação e `noindex`; é o único lugar com PII em tela |
| Deploy | `.vercelignore`, `vercel.json`, `astro.config.mjs` | `bun run verify:vercel` na mesma mudança, com a saída colada |
| Conteúdo | `src/content/products/*.json`, `src/content.config.ts` | Schema, JSON e leitor numa mudança só. Data, promessa ou credencial não confirmada = PROPOSTA |
| Tracking | `src/layouts/Layout.astro`, env de GA4/Pixel | Evento não duplicado (B5) e nenhum PII no payload (B3) |
| Chrome inferior | banner de cookies, CTA fixo, botão flutuante | `bun run check:geometry` nos três viewports |

## 5. Autoridade de aprovação

Por papel, para o arquivo sobreviver a mudança de pessoas.

| Mudança | Quem aprova |
|---|---|
| Dentro de um padrão que já existe, local e reversível | O revisor |
| Nova dependência, novo padrão, refactor amplo | Dono do repositório |
| Destino do lead, IDs de pixel/tag, env vars | Dono do repositório, sempre |
| Copy que afirma data, preço, credencial ou resultado | Dra. Sacha Gualberto — copy não confirmada entra como PROPOSTA |
| Commit, push, deploy, qualquer coisa visível fora do repo | Quem pediu, no turno. Os gates do plugin exigem `AULAOTB_ALLOW_*=1` inline |

## 6. O que este projeto **não** revisa

- Formatação — é do Biome, e `bun run lint` já decide.
- Decisões já fechadas em `DESIGN.md` e `PRODUCT.md`. Relitigar treina as pessoas a pular o review.
- Alvos de Core Web Vitals como bloqueio: são advisory aqui, por decisão registrada.
- Como conduzir o review em si — isso é `/pr-review` do plugin.
