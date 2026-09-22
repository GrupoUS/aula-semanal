# Plano — aulaotb.gpus.com.br (landing da aula gratuita OTB)

## Context

`F:\Projetos\aula-otb` é hoje uma **cópia crua de arquivos** do projeto `aula-trintae3` (landing de inscrição da aula gratuita TRINTAE3, em produção em `aula33.gpus.com.br`). A pasta não tem `.git` e nenhuma identidade foi trocada: `.claude/config.json` diz `name: "aula-trintae3"`, `package.json` diz `name: "otb-usa"` (drift de um clone anterior), e todo o tema/copy/asset ainda é TRINTAE3.

O objetivo é transformar essa cópia num site novo e independente: **`aulaotb.gpus.com.br`** — landing de inscrição para uma **aula gratuita ao vivo em 9 de setembro de 2026 (quarta-feira), 19h (Brasília), no Zoom**, cuja oferta de saída é o **OTB Estados Unidos — 3ª edição (Boston, 19–21 de abril de 2027)**.

Referências locais que definem o canon do produto:

- `F:\Projetos\otb-usa` — repo de `otb.gpus.com.br`, mesma stack (Astro 6 + Tailwind v4 + Bun). **Canon visual e de fatos do OTB.**
- `F:\Projetos\otb-usa-brand-assets` — logos e identidade.
- `drasacha.com.br/acaootb/` (edição anterior desta mesma aula, WordPress/Elementor) — **copy de conversão já validada**, extraída integralmente.

### Decisões travadas com o usuário

| Decisão | Escolha |
|---|---|
| Oferta de saída | OTB Estados Unidos, 3ª edição — Boston, 19–21 abr 2027, Lote 1 US$ 3.500 |
| Data/formato da aula | 9 set 2026, 19h (Brasília), Zoom ao vivo |
| Destino do lead | Form igual ao da aula-trintae3, **sem NeonDB** → Google Sheets via Apps Script; painel `/admin` com login continua |
| Canon visual | **Retematizar para OTB**: Sora + gold `#d4af37` + acento crimson + `radius-plate` 2px + seções bandeadas |
| Escopo | Adaptar código + governança `.claude`, inicializar repo git, configurar Vercel/domínio, copiar assets OTB |

---

## Entradas necessárias do cliente (travam o deploy, não o desenvolvimento)

| # | Item | Por quê | Default até confirmar |
|---|---|---|---|
| 1 | **Link do grupo de WhatsApp da aula OTB** | `aula-trintae3.json:305` aponta pro grupo da aula TRINTAE3. O schema (`content.config.ts:274`) valida só o *domínio* `chat.whatsapp.com` — reaproveitar **passa em todos os gates e joga os leads do OTB na sala errada**. Falha silenciosa. | placeholder + gate de deploy bloqueado |
| 2 | **Duração da aula** | alimenta `event.endDateISO` e `durationLabel` | 1h30 marcado `PROPOSTA` |
| 3 | **E-mail de suporte da aula OTB** | `Footer.astro:80,128,144` + os dois textos legais usam `suporte@drasacha.com.br` | manter `suporte@drasacha.com.br` |
| 4 | **`apple-touch-icon.png` da marca OTB** | não existe fonte OTB; favicon/ico/svg dá pra copiar de `otb-usa` | marcado `PROPOSTA` |
| 5 | **Aprovação de 4 arquivos protegidos** | `astro.config.mjs`, `src/content.config.ts`, `src/lib/whatsapp.ts`, `package.json` — todos obrigatórios pro rebrand | pedir antes da Fase 1 |

### Decisão de conteúdo já tomada (não é pergunta)

**Os 6 depoimentos atuais saem da página.** Eles são de alunos do TRINTAE3/M33 descrevendo uma formação presencial de 3 dias (`aula-trintae3.json:222-253`). Reetiquetá-los como prova social do OTB é depoimento fabricado — proibido pelo `AGENTS.md` ("nada de promessa/credencial/data fabricada"). Ambos os blocos são `.optional()` e `index.astro:74` já guarda o render, então a seção some limpa. **Substituto honesto:** o fato confirmado "duas turmas já foram a Boston" (`otb.json:125,150`) vira item de `proofBar`.

---

## Riscos da pasta atual (tratar antes de tudo)

| Risco | Evidência | Ação |
|---|---|---|
| Deploy sobrescreveria o site em produção do aula33 | `.vercel/repo.json` → `prj_HdmdX7iSjca7P7raSnaD5kJcwUta` / `aula-trintae3` | apagar `.vercel/` inteiro |
| Segredos de produção do aula33 na pasta | `.vercel/.env.production.local`, `.vercel/.env.preview.local`, `.env.local` (raiz) | apagar; recriar `.env.local` só com chaves do projeto novo |
| `git init` commitaria `node_modules/`, `dist/`, segredos | **não existe `.gitignore`** | criar antes do primeiro `git add` |
| Identidade inconsistente | config diz `aula-trintae3`, package diz `otb-usa` | ambos → `aula-otb` |
| Estado de sessão de outro projeto | `.claude/logs/`, `.claude/agent-memory/`, `.claude/docs/evolution/memory.db`, `.qa-shots/`, `evals/` | limpar |
| Governança com links quebrados | `docs/painel-leads.md` (2 refs), `docs/motion-depth-playbook.md` (7 refs), `docs/<project>-changelog.md` (4 refs) — **nenhum existe** | criar os três nesta entrega |
| Doc-lixo de clone anterior | `docs/plans/2026-05-02-rules-generic-migration.md` fala de skills `otb-usa`/`otb-theme` inexistentes | deletar |

---

## Fase 0 — Higienização, assets e identidade

1. **Deletar:** `.vercel/`, `.env.local`, `dist/`, `.astro/`, `.qa-shots/`, `evals/`, `.claude/logs/`, `.claude/agent-memory/`, `.claude/docs/evolution/memory.db`, `.claude/hooks/__pycache__/`, `.claude/scripts/__pycache__/`, `.claude/scheduled_tasks.lock`.
2. **Deletar docs TRINTAE3:** `docs/analise-todo-o-conteudo-curried-pnueli.md`, `docs/debug-verifique-e-arrume-parsed-balloon.md`, `docs/plans/2026-05-02-rules-generic-migration.md`, `docs/identidade-visual/` (brandbook TRINTAE3, ~90 arquivos), `docs/depoimentos/`.
3. **Criar `.gitignore`** — base `F:\Projetos\otb-usa\.gitignore`, **endurecido** (o dele só ignora `.env` e `.env.production`, deixando `.env.local` passar):
   ```
   dist/
   .astro/
   node_modules/
   .env
   .env.*
   !.env.example
   .vercel
   __pycache__/
   *.py[co]
   .DS_Store
   .idea/
   ```
4. **Copiar assets OTB:**
   - `otb-usa/public/images/otb/otb-logo-gold.png` → `public/images/otb/otb-logo-gold.png` (822×453)
   - `otb-usa/public/favicon.svg` + `favicon.ico` + `favicon-96.png` → `public/`
   - `otb-usa/public/og/otb-default.jpg` → `public/og/aula-otb.jpg` (interino)
   - `otb-usa/src/assets/images/otb/gallery/{turma-evento-3,turma-evento-1,pratica-1,aula-1}.jpg` → `src/assets/images/otb/gallery/`
5. **Deletar assets TRINTAE3:** `public/images/products/trintae3-{logo,wordmark}.webp`, `public/og/trintae3.png`, `public/images/brand/pattern-mask.png`, `public/images/sacha-{hero,about}.webp` (só eram lidos por campos mortos), `src/assets/sacha/sacha-table.jpg` (perde o slot na Fase 4), `src/assets/brand/texture-neutro.webp` (nunca foi usado).
6. `package.json` `name` → `aula-otb`.

---

## Fase 1 — Destino do lead: Google Sheets via Apps Script

Substitui o NeonDB inteiro. **Zero dependência npm nova** (só `fetch`). Painel `/admin` com login continua. `/api/*` + `/admin/*` seguem sendo as únicas rotas `prerender = false` — o contrato estático da landing não muda.

### Arquitetura

Web App do Apps Script vinculado à planilha. Endpoint único, envelope único:

```jsonc
// POST — sempre HTTP 200; o cliente confere body.ok, nunca res.ok sozinho
{ "secret": "<SHEETS_SHARED_SECRET>",
  "action": "ping|capture|dashboard|getLead|setContacted|purgeByEmail",
  "payload": { … } }
```

Restrições da plataforma que moldam o desenho (verificadas, não presumidas):

- `doPost(e)` **não enxerga headers** → o segredo viaja no corpo.
- `ContentService` **não define status HTTP** → sucesso e falha voltam 200; erro de script volta **HTML**; deployment mal configurado volta **302 pra tela de login do Google**. O cliente TS trata "corpo não começa com `{`" como `store_invalid_response` — assinatura exata de "publiquei como *somente eu*" ou "usei a URL `/dev`".
- POST em `/exec` responde 302 → `script.googleusercontent.com`; `fetch` com `redirect: "follow"` (default) é o correto. Em curl usar `-L` puro, **nunca** `-X POST`/`--post302`.
- Sheets não tem UPDATE-by-key → toda mutação é ler coluna → achar índice → `setValues` na linha, sob `LockService.getScriptLock()`.
- Sheets coage valores na escrita (ISO vira data, telefone vira número) → todo range recebe `.setNumberFormat("@")` antes do `setValues`.

### Planilha (aba `leads`)

Cabeçalhos pt-BR para o operador, mas o script endereça por **índice** — renomear cabeçalho é inofensivo, reordenar coluna corrompe.

`A id · B criado_em · C atualizado_em · D nome · E email · F telefone · G profissao · H status · I contatado_em · J consentimento · K consentimento_em · L utm · M referrer · N user_agent · O landing_path`

O script escreve exatamente 15 colunas → **anotações do time da coluna P em diante nunca são sobrescritas**. É a via sancionada pra campo manual.

Escrita = **upsert por e-mail**, devolvendo `created` (mesma semântica do Postgres hoje). Mantém `api/inscricao.ts:60-62` funcionando e torna `capture` idempotente — o que é o que permite retry seguro depois de timeout.

### Camada TS

`src/lib/server/leads-store.ts` reescrito por completo mantendo **as mesmas assinaturas exportadas**, então `api/inscricao.ts`, `api/admin/contacted.ts` e `api/admin/leads.csv.ts` não mudam de contrato. Some `ensureSchema()` (a DDL vira a função `configurar()` dentro do Apps Script).

Adições:
- `getLeadsDashboard()` — resolve leads + total + stats + professions numa **única** chamada. Hoje `admin/leads.astro:50-62` dispara 3 chamadas em `Promise.all` = 3 execuções Apps Script por render (~3s). Vira 1.
- `pingLeadStore()` — health probe.
- `purgeLeadsByEmail()` — usado pelo `scripts/smoke.ts`.

Todo lead que volta passa por `storedLeadSchema.parse()` (igual ao `mapRow` atual) → célula editada à mão estoura visivelmente em vez de envenenar o painel. `src/lib/leads/schema.ts` fica **intocado**.

Filtro, ordenação, contagem e paginação acontecem **dentro do Apps Script** — senão a planilha inteira trafegaria a cada render. TS só normaliza (`limit` 1–1000, `offset` ≥ 0), valida com zod e mapeia erro.

Transporte: `AbortController`, teto de 6s por tentativa, orçamento total de 9s, `clearTimeout` no `finally` (mesmo padrão de `lead-notifier.ts:33-34`). Retry único em `AbortError`/`TypeError`/5xx/`locked` com backoff de 400ms. **Nunca** retenta `unauthorized`/`bad_action`/`invalid_payload`.

> **Orçamento de tempo.** Pior caso `capture` (9s) + `notifyLeadOwner` (6s) + `sendCapiEvent` (6s, paralelos) ≈ 15s, acima do `maxDuration` default da Vercel. Adotar o **orçamento de captura em 7s** em vez de mexer em `astro.config.mjs` (protegido). Se ainda apertar, aí sim propor `vercel({ maxDuration: 30 })` com aprovação.

### O bug do "sucesso falso" — correção mínima

`RegistrationForm.astro:553-560` hoje engole qualquer falha, dispara o pixel de Lead, abre o WhatsApp e mostra sucesso. Isso é **certo pra conversão** — o lead realmente chega na Laura. O defeito é só observabilidade: ninguém fica sabendo. Três edições, nenhuma muda a experiência do visitante:

- **Servidor** (`api/inscricao.ts`): `catch` com `console.error("[inscricao] lead_store_degraded", { code, landingPath, emailDomain })` — **sem PII** — e `notifyLeadOwner("lead_capture_failed", …)`, de modo que o lead sai pelo webhook mesmo com a planilha fora do ar. Novo mapa: 503 `lead_store_not_configured` (env faltando), 502 `store_unauthorized` (segredo errado), 502 `store_timeout`/`store_error`. Exige alargar o union em `lead-notifier.ts:6` e trocar o prefixo do `summarize` para `[FALHA]`.
- **Cliente**: mantém tudo, só adiciona `console.warn` + `cro("form_submit_fallback")`. Como `cro()` já espalha pra `fbq trackCustom` + `gtag event`, o operador ganha a razão `form_submit_fallback` ÷ `form_submit_success` no GA4/Meta sem infra nova.
- **Painel**: mostra o código do erro no alerta que já existe (`admin/leads.astro:172-180`).

**Proibido:** apontar `PUBLIC_FORM_ENDPOINT` direto pro Apps Script — jogaria `SHEETS_SHARED_SECRET` no bundle do browser (o Vite inlina tudo que é `PUBLIC_*`). `/api/inscricao` continua sendo o único caminho.

### Env

| Nome | Escopo | Nota |
|---|---|---|
| `SHEETS_WEBAPP_URL` | **server-only** | tem que terminar em `/exec`; `/dev` exige login e falha |
| `SHEETS_SHARED_SECRET` | **server-only** | igual à Script Property `SHARED_SECRET` |
| `SHEETS_TIMEOUT_MS` | server-only, opcional | default 6000 |
| `DATABASE_URL` | **removido** | apagar da Vercel nos 3 ambientes |
| `LEAD_NOTIFY_WEBHOOK_URL/_SECRET` | inalterado, agora **mais importante** | é o canal degradado do lead |

### Arquivos

| Ação | Caminho |
|---|---|
| criar | `scripts/apps-script/Code.gs`, `scripts/apps-script/appsscript.json` |
| criar | `docs/planilha-leads.md` — runbook pt-BR passo a passo; também mata a referência pendente de `.claude/rules/astro.md:14` e da regra cardinal 4 |
| reescrever | `src/lib/server/leads-store.ts` |
| editar | `src/pages/api/inscricao.ts`, `src/pages/admin/leads.astro`, `src/components/landing/RegistrationForm.astro`, `src/lib/server/lead-notifier.ts`, `scripts/smoke.ts`, `.env.example` |
| deletar | `scripts/leads-schema.sql`, `scripts/apply-schema.mjs`, `scripts/inspect-table.mjs` |
| dependência | remover `@neondatabase/serverless` do `package.json` + `bun install` |

`scripts/smoke.ts` **precisa** ser corrigido: `tsconfig.json:3` inclui `**/*`, então `bunx astro check` o tipa e ele importa `neon` (`:4`, `:75`).

`scripts/` e `docs/` estão em `.vercelignore` (linhas 12 e 10) → o `.gs` não vai pro bundle. `biome.json:9` só inclui `src/**` → não é lintado. Nada de config de tooling muda.

---

## Fase 2 — Tema e fontes (atômica)

**Decisão: híbrido.** Portar o bloco `@theme` do OTB **verbatim**, e retonar cirurgicamente a camada de utilities. **Não** portar o `global.css` inteiro.

`otb-usa/src/styles/global.css` tem 685 linhas contra 1303 da base. O delta de 618 linhas não é decoração — é infraestrutura da qual os 16 componentes desta landing dependem e que o otb-usa não tem: `glass-card`, `glass-card-quiet`, `btn-base/-primary/-secondary/-ghost/-whatsapp`, `focus-ring-on-gold`, `card-glow-hover`, `landing-mesh-bg`, `landing-vignette`, `carousel-track`, o sistema `[data-tabpanel]`, `[data-chip-stagger]`, `[data-formula-stagger]`, `sr-only`… Apagar isso **não gera erro de build** — Tailwind v4 descarta classe desconhecida em silêncio. Você publicaria uma página sem estilo com CI verde. É o pior modo de falha possível.

### 2a. Substituir `global.css:14-85` por `otb-usa/src/styles/global.css:9-108`

Depois **re-adicionar** os 7 tokens que a base precisa e o canon OTB não tem:

```css
--color-whatsapp: #25d366;   /* btn-whatsapp */
--color-whatsapp-hover: #20bd5a;
--color-error: #ef4444;      /* RegistrationForm:105 */
--color-success: #22c55e;
--duration-page: 200ms;      /* transições do #site-header */
--duration-accordion: 250ms;
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

Tokens **removidos:** `--color-teal*`, `--color-greige`, `--font-serif`, `--text-h4`, `--shadow-depth-1..6`, `--ease-out-soft`, e `--duration-reveal` 300ms → 520ms.

### 2b. Remapeamento completo do que quebra

| Token removido | Call sites | Remap |
|---|---|---|
| `--font-serif` | **32 sites** (lista em §2d) | → `font-display` |
| `--color-teal` | `Hero.astro:69`, `NextStep.astro:32` (ambos `brand-pattern text-teal`) | ambas as `<div>` morrem com o brand-pattern (Fase 3) — zero remap |
| `--color-greige`, `--text-h4` | **0** | deletar direto |
| `--ease-out-soft` | 12 em `global.css` + `CookieConsent.astro:58` + `WhatsAppFloatingButton.astro:40,41` | rename puro → `--ease-editorial`. **As duas curvas são literalmente `cubic-bezier(0.16, 1, 0.3, 1)`** — zero mudança visual. ⚠️ os 2 sites de componente usam `var(--ease-out-soft, ease)` **com fallback** → degradam calados; só grep pega |
| `--shadow-depth-*` | `global.css:631`, `global.css:1012`, e `depth-2` em `Audience.astro:56,76` + `Testimonials.astro:65` | `depth-1..4` → `shadow-panel`; `depth-5` → `shadow-halo-gold`; `depth-6` → `shadow-lift` |

**Deletar `@utility depth-1..6` (`global.css:938-960`) inteiro.** Sempre foi redundante: o namespace `--shadow-*` do Tailwind v4 gera as classes sozinho. Portar `--shadow-panel/-lift/-halo-gold/-rim` já entrega `shadow-panel`/`shadow-lift`/`shadow-halo-gold`/`shadow-rim` de graça — verificado: otb-usa usa `shadow-halo-gold` em 8 lugares sem nenhum `@utility`.

### 2c. Upgrade do sistema de reveal (ganho grátis, zero edição de componente)

Trocar `global.css:331-369` por `otb-usa/src/styles/global.css:348-422`. A base usa `animation:` shorthand + `forwards` + delays com `!important`; o canon usa longhand + `--reveal-index` + **`backwards`**. O próprio otb-usa documenta o porquê em `:360-366`: `forwards` congela o transform do último keyframe e mata hover/lift/parallax depois. **A base tem exatamente esse bug** e já criou uma gambiarra em `global.css:1183-1185` ("*o hover DEVE ser transform-free*"). O canon suporta `data-reveal-delay="1..10"` contra 1-6 da base, e a base só emite 1-5 → superset, drop-in.

### 2d. Fontes — Playfair → Sora

| Arquivo:linha | Mudança |
|---|---|
| `astro.config.mjs:14-20` | trocar a entrada Playfair por `otb-usa/astro.config.mjs:14-24` **verbatim** (`name: "Sora"`, `cssVariable: "--font-sora"`, `weights: [400,600,700,800]`). Entrada Inter fica igual |
| `astro.config.mjs:11` | `site` → `"https://aulaotb.gpus.com.br"` |
| `Layout.astro:160-162` | `<Font cssVariable="--font-playfair" preload />` → `--font-sora` |
| `global.css:52` | `--font-serif: var(--font-playfair)…` → `--font-display: var(--font-sora), system-ui, sans-serif` |

⚠️ Deixar qualquer referência a `--font-playfair` depois de remover a entrada do config faz a Fonts API do Astro **estourar no build**. Config + Layout + global.css entram no mesmo commit.

**Os 32 sites de `font-serif`** — `Audience:87,120` · `Authority:44` · `Comparison:27` · `Countdown:47,55` · `FinalCTA:53` · `Hero:86` · `Learn:37,42` · `Mechanism:46,133` · `NextStep:38` · `RegistrationForm:130,274,291` · `Testimonials:40,70` · `Footer:103,122` · `SectionHeading:30,40` · `404:19,22` · `admin/index:28` · `admin/leads:137,185,189,193` · `politica-de-privacidade:19` · `termos:19`.

**Não é find/replace cego.** Sora em tamanho display precisa de peso 800 + tracking negativo; Playfair carregava contraste próprio. Por tier:

- **Display/H1/H2** (`Hero:86`, `Authority:44`, `Comparison:27`, `Mechanism:46`, `NextStep:38`, `FinalCTA:53`, `Testimonials:40`, `SectionHeading:40`) → `font-display font-extrabold text-h2` (ou `text-h1`/`text-display`). As correntes `leading-[1.05] tracking-tight md:text-5xl lg:text-6xl` **deletam** — os tokens `--text-h*` já carregam line-height e letter-spacing.
- **H3 / títulos de card** (`Audience:87,120`, `Learn:42`, `Mechanism:133`, `RegistrationForm:130,274,291`) → `font-display font-semibold text-h3`.
- **Numerais** (`Countdown:47,55`, `Learn:37`, `SectionHeading:30`, `Testimonials:70`, `404:19`) → `font-display` + manter `tabular-nums`. ⚠️ Sora é mais larga que Playfair no mesmo corpo: remedir `Countdown.astro:53` `min-w-[3.25rem]` (provável `3.5rem`).
- **Eyebrows do footer** (`Footer:103,122`) → receita kicker `text-kicker font-semibold tracking-kicker text-gold uppercase`, sem `font-display`.
- **Admin** (5 sites) → troca mecânica.

⚠️ Remover `--font-serif` com classes `font-serif` sobrando **não gera erro**: Tailwind descarta e o título cai pra Inter. Gate real é `grep -rn "font-serif" src/` → 0.

---

## Fase 3 — Componentes de marca

| Artefato | Decisão |
|---|---|
| `shared/BrandSymbol.astro` | **deletar** — glifo "33" espelhado (`:16`), sem análogo OTB. 6 call sites: `Header:34,109`, `Footer:33`, `Hero:76`, `Authority:77`, `FinalCTA:49` |
| `shared/BrandSeal.astro` | **deletar** — selo giratório com `textPath` é dispositivo da era serif-editorial; canon OTB é retilíneo + bandeado e o otb-usa não tem selo. 2 call sites: `Authority:76-78`, `FinalCTA:48-50` |
| `shared/Logo.astro` | **reescrever** espelhando o lockup de produção (`otb-usa/src/components/landing/Header.astro:37-47`): marca `h-8 w-8` + `<span class="font-display text-xl font-semibold">OTB</span>`. Duas propriedades OTB devem dividir um lockup |
| `lib/brand.ts` | **reescrever** — `BRAND_NAME = "OTB"`, `BRAND_TAGLINE = "Out of the Box · Grupo US"` (`PROPOSTA`; único consumidor é `Footer.astro:37`). **Deletar** `BRAND_SEAL_TEXT` e `BRAND_PATTERN_MASK` (consumidores morrem). Adicionar `BRAND_LOGO` + dimensões |
| `@utility brand-symbol/-pattern/-seal` + keyframes + os 2 blocos reduced-motion | **deletar** `global.css:1237-1303` inteiro |

---

## Fase 4 — Forma, banding e ritmo

### `rounded-2xl` → `rounded-plate`

`--radius-plate: 2px` gera `rounded-plate` sozinho (namespace `--radius-*`) — confirmado, 5 usos no otb-usa sem `@utility`.

**Uma edição de alta alavancagem:** `shared/Card.astro:18` `"glass-card rounded-2xl p-6 md:p-8"` → `rounded-plate`. Cobre todo consumidor de `<Card>`. Mais **13 placas inline**: `Audience` ×2, `Comparison` ×2, `Learn`, `Mechanism`, `FAQ:30`, `ProofBar`, `NextStep:34`, `RegistrationForm`, `Testimonials` ×2, `CookieConsent:20`.

**Continua redondo — só chrome interativo:** os 18 `rounded-full` (pills, chips, dots, botão ícone), `Header` 5× `rounded-sm`, `MobileCTABar`, `WhatsAppFloatingButton`, `RegistrationForm:103` (input). `Button.astro:38` `rounded-xl` → `rounded-lg`.

### Banding

Adicionar `band-base`/`band-alt`/`band-deep` (de `otb-usa/src/styles/global.css:231-244`), depois **uma classe por raiz de seção** — sem reescrever layout:

`Hero:58` deep · `ProofBar:13` alt · `Audience:26` base · `Learn:19` alt · `Mechanism:38` base (apagar `bg-navy-light/40` em `:40`) · `Authority:22` deep · `Comparison:22` base (apagar `:43`) · `Testimonials:32` alt (apagar `:34`) · `NextStep:22` deep · `FAQ:24` base · `FinalCTA:24` alt · `Footer:23` deep + filete gold 18%.

### Ritmo vertical

Trocar as correntes ad-hoc `py-16 sm:py-24 lg:py-28` / `py-24 md:py-32 lg:py-40` nas 11 raízes por `py-section` / `py-section-tight` (gerados de `--spacing-section*`).

### Matar os filetes decorativos

`SectionHeading.astro:44-48` — o divisor `h-1 w-16 rounded-full bg-gold` embaixo de todo `<h2>`. **Deletar.** A banda é o separador agora (`otb-usa/src/pages/index.astro:103-104` afirma a doutrina). Uma edição remove o filete de todas as seções de uma vez.

### Fotografia

Princípio: **Sacha dá a aula, então as seções da aula ficam Sacha; a seção da oferta vira Boston.**

| Slot | Hoje | Novo |
|---|---|---|
| Hero `:59-66` | `sacha/sacha-joy.jpg` | **mantém** — a dobra vende a aula e a professora |
| Authority `:26-32` | `sacha/sacha-authority.jpg` | **mantém** — a autoridade *é* a Dra. Sacha |
| **NextStep `:23-28`** | `sacha/sacha-table.jpg` | **→ `otb/gallery/turma-evento-3.jpg`** — NextStep vira o bloco da oferta, tem que mostrar Boston |
| FinalCTA `:25-30` | `sacha/sacha-pointing.jpg` | **mantém** — o CTA final ainda é "inscreva-se na aula" |

**Não portar `otb-usa/src/lib/images.ts` (`resolveImage`).** Ele existe porque o `otb.json` guarda caminho de imagem como string. Aqui `SectionPhoto.astro:12,15` recebe `ImageMetadata` via `import` direto — 4 imports batem um glob resolver. YAGNI.

---

## Fase 5 — Conteúdo SSOT (atômica)

Novo `src/content/products/aula-otb.json` (`slug: "aula-otb"`, `version: "1.0.0"`). Deletar `aula-trintae3.json`.

### `event`

```json
"format": "Online e ao vivo no Zoom",
"date": "9 de setembro de 2026",
"time": "19h (Brasília)",
"durationLabel": "Cerca de 1h30",                 // PROPOSTA
"startDateISO": "2026-09-09T19:00:00-03:00",
"endDateISO": "2026-09-09T20:30:00-03:00",        // PROPOSTA
"calendarTitle": "Aula gratuita OTB — com Dra. Sacha Gualberto"
```

9 set 2026 é **quarta-feira** — seguro usar na copy.

### `seo` (título 20–70, descrição 120–220 — limites duros em `content.config.ts:22-23`)

- title: `"Aula gratuita OTB — 9 de setembro, ao vivo no Zoom"` (50 ✓)
- description: `"Aula gratuita e ao vivo no Zoom com a Dra. Sacha Gualberto: como profissionais da Saúde Estética expandem a visão, saem da lógica local e acessam autoridade e oportunidades em escala global."` (190 ✓)

### Mapeamento seção a seção

| Bloco | Conteúdo novo | Fonte |
|---|---|---|
| `hero.eyebrow` | "9 de setembro \| 19h \| Aula gratuita e ao vivo no Zoom" | **verbatim** acaootb (data trocada) |
| `hero.headline` | "O que acontece quando uma profissional da Saúde Estética expande sua visão e começa a jogar em outro nível" | **verbatim** |
| `hero.highlight` | "jogar em outro nível" | precisa ser substring exata — `splitHighlight` depende ✓ |
| `hero.subheadline` | "Uma aula gratuita sobre carreira, posicionamento e como sair da lógica local para acessar oportunidades, autoridade e crescimento em escala global." | **verbatim** |
| `hero.primaryCta` | `"Quero garantir meu lugar!"` → `#inscricao` | **verbatim** |
| `hero.proofBar` | ① `video` "Aula 100% gratuita e ao vivo no Zoom" ② `user` "Com Dra. Sacha Gualberto" ③ `users` "Para profissionais da Saúde Estética com carreira em andamento" ④ `layers` "Duas turmas já foram a Boston com o OTB" | ícones existem no `Icon.astro` |
| `audience.intro` | "Você cresce até o limite do ambiente em que você está inserido. Não é só sobre técnica, não é sobre fazer mais cursos e definitivamente não é sobre atender mais pacientes: o que trava a maioria dos profissionais da Saúde Estética hoje é visão limitada de mercado." | **verbatim-tecido** acaootb |
| `audience.items` | Médicos · Odontólogos · Biomédicos · Enfermeiros · Fisioterapeutas · Farmacêuticos | `otb.json:106-113` (público confirmado) |
| `audience.forYou` | "Você estuda, mas continua insegura" · "Cobra menos do que poderia" · "Vê outros crescendo mais rápido" · "Quer atender pacientes premium sem lotar a agenda" · "Quer se posicionar como referência" · "Tem curiosidade sobre experiências internacionais" | **verbatim** ciclo silencioso + lista de contraste |
| `audience.notForYou` | 3 itens derivados | **PROPOSTA** |
| `learn.topics` | exatamente os 6 bullets do "O QUE VOCÊ VAI ACESSAR", cada um partido em `titulo` + `descricao` | **verbatim** |
| `mechanism` | headline "Eles saíram da bolha" / highlight "saíram da bolha"; intro = parágrafo de contraste **verbatim**; formula "Business + Prática em alto nível + Visão estratégica = Carreira global"; 3 pilares = lista **verbatim** do "MBA internacional que conecta", com o pilar ② carregando os fatos confirmados Fresh Specimens ≤48h / injeta-e-disseca / Anatomy Review | acaootb + `otb.json:82,144` |
| `authority` | "Dra. Sacha Gualberto" · "CEO do Grupo US · idealizadora do OTB" · parágrafos de `otb.json:276` | confirmado |
| `nextStep` | headline "E depois da aula? O OTB Estados Unidos"; ¶1 320h / 10 módulos / imersão 3 dias Boston / "primeiro MBA do mundo em Business Aesthetic Health"; ¶2 19–21 abr 2027, Fresh Specimens ≤48h, Anatomy Review, certificações MBA IESA + ASA; ¶3 "Lote 1 ativo: US$ 3.500" | `otb.json:124,241,343,309` |
| `comparison` | "Preso à lógica local" ↔ "Com visão global de carreira", 4 linhas pareando ciclo-silencioso ↔ realidade-diferente | derivado do acaootb |
| `testimonialsMeta` + `testimonials` | **omitir ambos** | ver §Entradas |
| `registration` | headline "Preencha e garanta sua vaga gratuita:" · submit "Quero garantir meu lugar!" (**verbatim**) · successBody citando o dia 9 · `successState.group` = **link novo (bloqueante)** | |
| `faqs` | 7 itens, incluindo ⑦ **"O OTB é vinculado a alguma universidade dos Estados Unidos?"** com resposta **verbatim** de `otb.json:343` | ⑦ é a juridicamente estruturante |
| `finalCta` | "Pronto para jogar em outro nível?" · "Quero garantir meu lugar!" | |
| `legal.disclaimer` | adaptar `otb.json:513`: cláusula educacional/sem-promessa-de-ganho **+ não-vínculo** (espaços contratados em Boston, sem patrocínio/endosso/certificação de instituições locais) **+ certificações** (MBA IESA / Grupo US; ASA Fresh Specimens) **+ conselho de classe** | |

### Todas as mensagens de WhatsApp (todas começam `"Olá, Laura!"` — checado 2×: `content.config.ts:10` + `whatsapp.ts:9`)

1. `hero.whatsapp.message` · 2. `registration.whatsappFallback.message` · 3. `registration.successState.talkWhatsapp.message` · 4. `finalCta.whatsapp.message` · 5. `whatsapp.ts:16` `WHATSAPP_DEFAULT_MESSAGE` · 6. `whatsapp.ts:20` `WHATSAPP_DEFAULT_SITE_MESSAGE` · 7. `404.astro:7`.

O número da SDR **não muda** — `556294705081` e o prefixo `"Olá, Laura!"` são idênticos nos dois projetos (`aula-trintae3/src/lib/whatsapp.ts:7,9` == `otb-usa/src/lib/whatsapp.ts:6,11`).

### Schema (`src/content.config.ts` — PROTEGIDO)

**Sem blocos novos.** `nextStep` + `mechanism.pillars` + `comparison` + `faqs` carregam a oferta inteira como prosa. Um bloco `otbOffer` custaria schema + JSON + componente novo + wiring no `index.astro` — 4 arquivos pra conteúdo que lê bem em três parágrafos. YAGNI.

Uma edição só, agrupando:
- `hero.badges` (`:49`), `hero.background` (`:58-61`), `authority.photo` (`:156`) → `.optional()` (campos mortos, confirmados)
- comentário `:162` "TRINTAE3 como próximo passo" → "OTB"

⚠️ **`legal.disclaimer` fica obrigatório e ganha render.** Hoje o schema exige e nada renderiza — pro OTB a cláusula de não-vínculo é requisito legal. Portar o padrão de `otb-usa/src/components/landing/Footer.astro:83-89` pro `Footer.astro` da base (acima do copyright em `:187`), passando `legal` por props `index.astro` → `Layout.astro` → `Footer.astro`. O render morto é o bug, não o campo.

---

## Fase 6 — Varredura de strings hardcoded

| Arquivo:linha | Mudança |
|---|---|
| `Layout.astro:27` | `ogImage` → `/og/aula-otb.jpg` |
| `Layout.astro:38` | `FALLBACK_SITE` → `https://aulaotb.gpus.com.br` |
| `Layout.astro:63` + `CookieConsent.astro:17,82` | `t33_cookie_consent` → `otb_aula_cookie_consent` — ⚠️ **edição atômica**; separar dessincroniza o gate de consentimento sem erro de build |
| `Layout.astro:76,78,80` | nome/logo/descrição do JSON-LD → `Grupo US · OTB`, `/images/otb/otb-logo-gold.png` |
| `Layout.astro:84,93` | `sameAs` — manter instagram da Sacha, **adicionar** `https://otb.gpus.com.br` |
| `Layout.astro:124` | `theme-color "#0e1322"` → `#1a1a2e` (o literal **precisa** espelhar `--color-navy`; o comentário em `:123` diz isso) |
| `Layout.astro:166` | `og:site_name` → `OTB · Grupo US` |
| `AdminLayout.astro:20` | já era `#1a1a2e` — vira consistente de graça |
| `index.astro:18,19` | slug → `aula-otb` (×2, incluindo a mensagem do throw) |
| `index.astro:37,50` | `"Aula gratuita OTB"`, organizer `"Grupo US"` |
| `index.astro` índices de seção | com `Testimonials` fora, os `index=` do `SectionHeading` deslocam — **recontar todos** |
| `404.astro:7,12,13,14` · `termos.astro` · `politica-de-privacidade.astro` | msg WhatsApp, title, description, ogImage, **data de atualização**, corpo legal (TRINTAE3 → Grupo US / OTB), e-mail |
| `Header.astro:13,17-21,32,34,108,109` | CTA "Quero garantir meu lugar!", nav ("A aula" / "Para quem é" / "O OTB" / "FAQ"), aria-labels, marca. ⚠️ o item "O OTB" precisa de `id` novo no `NextStep.astro`, que hoje não tem nenhum |
| `Footer.astro:31,33,37,40-43,103,122,190` | aria-label, marca, tagline, blurb, headings kicker, `© Grupo US` |
| `Footer.astro:80,128,144` | `suporte@drasacha.com.br` — **confirmar** se a aula OTB usa a mesma caixa |
| `FAQ.astro:26` | índice da seção após a remoção dos depoimentos |
| `Authority.astro:70-79` · `FinalCTA.astro:44-52` | deletar blocos de BrandSeal |
| `Hero.astro:69,71-77` · `NextStep.astro:32` | deletar brand-pattern e a marca d'água "33" |
| `RegistrationForm.astro:87,90,94,315` | `PRODID`, `UID:…@aulaotb.gpus.com.br`, título do ICS, `download="aula-otb.ics"` |
| `admin/index.astro:27` · `admin/leads.astro:117,136` · `api/admin/leads.csv.ts:74` | painel + saudação de outbound + `leads-aula-otb.csv` |
| `lib/server/auth.ts:7` | cookie `trintae3_admin_session` → `aulaotb_admin_session` (derruba sessões admin existentes — inofensivo) |

---

## Fase 7 — Governança `.claude` e docs

### `.claude/config.json` — nova instância

`project.name` `aula-otb` · `displayName` `"Aula Gratuita OTB — Grupo US"` · `purpose` (aula gratuita, 9 set 2026, funil pro OTB Boston) · `productionUrl` `https://aulaotb.gpus.com.br` · `designModelRepo` `../otb-usa` · `content.productSlug/productJson` `aula-otb` · `content.ogImage` `/og/aula-otb.jpg` · `content.anchors` (com `#proximo-passo` novo) · `lead.leadTable` → `planilha:leads` · `tooling.database` → `google-sheets` · `tooling.orm` → `apps-script-webapp`.

**Corrigir bug latente:** `protectedFiles.exact` lista `"src/lib/whatsapp.ts"`, mas `protect_files.py:105` compara só `PurePath(file_path).name` — ou seja, testa `"whatsapp.ts"` contra um set que contém `"src/lib/whatsapp.ts"` e **nunca casa**. Entradas com caminho vão em `contains`, não em `exact`.

### Vazamentos de arquitetura na governança (não é `${...}`, é literal)

Trocar as referências a NeonDB/`api/inscricao.js`/`DATABASE_URL` por Google Sheets em: `.claude/CLAUDE.md` (regra cardinal 4), `.claude/rules/astro.md:14`, `.claude/rules/mcp.md:17`, `.claude/commands/{debug:36,38, prime:33, pr-review:40}.md`, `.claude/agents/{code-reviewer:15,30,32, debugger:37,41,42,102,114,115, orchestrator:321}.md`.

Também parametrizar o que ficou literal: `.claude/commands/perf.md:53` (`http://localhost:4321` → `${project.stagingUrl}`), `.claude/commands/design-fix.md:90-97` e `design-improve.md:86-93` (mapa hardcoded de seção→componente com `aula`/`para-quem`/`autoridade`/`inscricao`/`Hero.astro`… → mapa do OTB), `.claude/skills/debugger/references/browser-setup.md:12,15`.

**Limpeza de agentes:** `agents/oracle.md` é duplicata obsoleta do `evaluator` Modo 3 (o próprio `evaluator.md` diz isso); `agents/mobile-developer.md` (React Native/Flutter) não tem razão de existir numa landing Astro. Deletar ambos.

`frontend-specialist.md` declara `skills: frontend-design`, que **não existe** em `.claude/skills/`. Corrigir para uma skill real.

### Docs a criar (matam 13 referências penduradas)

1. **`docs/planilha-leads.md`** — runbook do Apps Script (Fase 1). Mata as 2 refs de `docs/painel-leads.md`.
2. **`docs/motion-depth-playbook.md`** — citado 7× (`design-improve.md:205`, `stability.md:173`, `skills/astro/references/performance.md:154`, `DESIGN.md:66,258,303,390`). `DESIGN.md:258,303` delega explicitamente pra ele o vocabulário de sombra/glow/3D e "10 gotchas" — esse conteúdo hoje **não existe em lugar nenhum**. Escrever com os tokens novos do OTB.
3. **`docs/aula-otb-changelog.md`** — citado 4× como alvo do `/evolve`.

### Docs raiz

`README.md` (corrigir a contradição de `:82` "sem SSR adapter, sem `prerender = false`" contra a regra cardinal 4 que **aprova** o carve-out `/admin` + `/api`), `AGENTS.md:147` (única string literal `aula-trintae3` fora do config), `PRODUCT.md` (`:22` `Olá, Laura!` literal, `:39` escada de produtos, `:147` "SDR Laura"), `DESIGN.md` (`:4` frontmatter `brand:`, paleta §2 → tokens OTB, `:141,:238` premissas do funil).

---

## Fase 8 — Git e Vercel

1. `git init` (só **depois** do `.gitignore` da Fase 0 e da purga de segredos).
2. `git add -A` → inspecionar `git status` procurando `.env*`, `node_modules`, `dist`, `.vercel` **antes** do commit.
3. Commit inicial em `main`. Sem feature branch (regra cardinal 9).
4. Repo remoto sugerido: `github.com/GrupoUS/aula-otb` (irmãos: `GrupoUS/aula-trintae3`, `GrupoUS/otb-usa`).
5. **Vercel — sempre perguntar antes de executar.** Projeto novo `aula-otb`, env vars (`SHEETS_WEBAPP_URL`, `SHEETS_SHARED_SECRET`, `ADMIN_USERS`, `ADMIN_SESSION_SECRET`, `PUBLIC_FB_PIXEL_ID`, `PUBLIC_GA4_ID`, opcionais `META_CAPI_*`, `LEAD_NOTIFY_*`), alias `aulaotb.gpus.com.br`, DNS.

⚠️ O Meta Pixel `926368978957843` está hardcoded como fallback em **dois** lugares (`Layout.astro:50` e `lib/server/meta-capi.ts:10`) — é o pixel do aula33. Definir o pixel do OTB ou zerar o fallback nos dois juntos. Mudar ID de tracking exige aprovação (regra cardinal 10).

---

## Ordem de execução e por que ela importa

Gate após cada fase: `bun run lint && bunx astro check && bun run build`.

**Riscos ordenados por quão silenciosamente falham:**

| Perigo | Como falha |
|---|---|
| Apagar `--font-serif` / `depth-*` / `brand-*` com classes vivas | 🔴 **silencioso** — Tailwind descarta, build verde, página degradada. Só grep pega |
| Chave do cookie trocada em só um dos dois arquivos | 🔴 **silencioso** — gate de consentimento dessincroniza |
| Reaproveitar o link do grupo do TRINTAE3 | 🔴 **silencioso** — passa no zod, roteia lead pra sala errada |
| `--ease-out-soft` nos 2 componentes usa `var(…, ease)` com fallback | 🔴 **silencioso** — cai pra `ease` |
| Tirar `--font-playfair` do config com `Layout.astro:161` pedindo | 🟢 alto — Fonts API estoura |
| Renomear o JSON sem `index.astro:18` | 🟢 alto — `throw new Error("Product … not found")` |
| Deletar `BrandSymbol`/`BrandSeal` com import vivo | 🟢 alto — import não resolve |
| `successState.group.href` fora de `chat.whatsapp.com` | 🟢 alto — `astro check` falha em `content.config.ts:274` |
| Prefixo `"Olá, Laura!"` | 🟢 **não-perigo** — mensagens velhas e novas carregam o prefixo, todo estado intermediário passa nos dois guards. Conteúdo e tema podem ser sequenciados livremente |

**Sequência:** 0 (higiene/assets/aprovações) → 1 (lead pipeline, isolado do resto) → 2 (tema+fontes, atômica) → 3 (componentes de marca) → 4 (forma/banding/fotos) → 5 (conteúdo SSOT, atômica) → 6 (varredura de strings) → 7 (governança/docs) → 8 (git/Vercel).

Tema **antes** de conteúdo: toda edição de componente posterior é escrita já contra os nomes novos de token. Conteúdo primeiro significaria escrever os componentes duas vezes.

---

## Verificação

### Apps Script isolado (antes de tudo)

```bash
export URL='https://script.google.com/macros/s/.../exec'; export S='<segredo>'
curl -sS -L "$URL?secret=$S"                                  # ping
curl -sS -L -H 'Content-Type: application/json' -d "{\"secret\":\"$S\",\"action\":\"ping\"}" "$URL"
curl -sS -L -H 'Content-Type: application/json' -d '{"secret":"errado","action":"ping"}' "$URL"
# esperado: {"ok":false,"error":"unauthorized"} com HTTP 200 — é assim mesmo
```

`-L` puro; **não** usar `-X POST` nem `--post302`. Se voltar HTML em vez de JSON → deployment é `/dev` ou o acesso não é "Qualquer pessoa".

Depois `capture` duas vezes com o mesmo e-mail (`created:true` → `created:false`), e conferir **na planilha**: uma linha; `id` começa com `lead_`; `criado_em` alinhado à esquerda (se estiver à direita, o formato texto não pegou); telefone com todos os dígitos; `utm` = JSON.

### Local (`bun run dev`)

- `POST /api/inscricao` válido → 201, linha nova na planilha; repetir → `created:false`
- `Content-Type: text/plain` → 415 · payload inválido → 400
- `SHEETS_WEBAPP_URL` vazio → 503 `lead_store_not_configured`
- `SHEETS_SHARED_SECRET` errado → **502 `store_unauthorized`** + `[inscricao] lead_store_degraded` no terminal **sem PII**. É o teste de regressão exato do bug do sucesso falso
- Form no browser com segredo quebrado → painel de sucesso **ainda aparece** e o WhatsApp abre (conversão preservada), **mas** `form_submit_fallback` dispara e o log do servidor carrega o lead
- `/admin/leads`: stats batem com a planilha; filtros `?q= ?status= ?profession= ?from= ?to= ?page=2`; "Marcar contatado" reflete na planilha; CSV baixa `leads-aula-otb.csv`. **Conferir em Apps Script → Execuções: 1 chamada por render, não 3**

### Visual (a fase mais fraca em gate automático)

`grep -rn "font-serif\|ease-out-soft\|depth-[1-6]\|text-teal\|font-playfair\|trintae3\|TRINTAE3\|t33_" src/ astro.config.mjs` → **0 ocorrências**.

Passada manual em browser: Tab do topo → skip link primeiro; foco visível em tudo; FAQ abre com Enter/Space; menu mobile Esc fecha; JS desligado → todo conteúdo de reveal aparece; DevTools → Rendering → `prefers-reduced-motion: reduce` → animações param; contagem regressiva não estoura a caixa com Sora.

### Gate final

`bun run lint && bunx astro check && bun run build`, depois `bun run lighthouse:audit` (alvos advisory de `.claude/config.json::gates`: perf/a11y/BP/SEO ≥ 95, LCP ≤ 2500, CLS 0, JS inicial < 50KB).

Em preview da Vercel: confirmar que `.vercel/output/functions/` contém **só** a função `_render` servindo `/admin/*` + `/api/*` — nenhuma rota pública virou on-demand.
