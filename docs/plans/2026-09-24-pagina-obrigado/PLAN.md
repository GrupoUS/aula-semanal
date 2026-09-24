# Página de obrigado `/obrigado` — implementation plan

**Date:** 2026-09-24 · **Branch:** `main` · **Baseline:** `ac0521f`
**Tier:** L4 · **Risk surface:** PII
**Design authority:** `docs/plans/2026-09-24-pagina-obrigado/spec.md` + issue #1 triage ledger (abaixo)

## Decisões e proveniência

- **Branch.** O controlador informou que renomeou `master` → `main` no GitHub (default `main`,
  checkout `main` rastreando `origin/main`). Leitura local sem escrita, na hora do plano:
  `git branch --show-current` → `main`; `git rev-parse --short HEAD` → `ac0521f`. Bate com
  `.graph-powers/config.json::git.workBranch`.
- **Pré-condição externa P1, fora dos `Owns` e dos gates deste plano.** O projeto Vercel
  `aula-semanal` ainda reporta `link.productionBranch: master` (o controlador leu com
  `vercel api /v9/projects/aula-semanal`). Até o usuário ajustar a Production Branch no dashboard,
  push em `main` **não** é deploy automático de produção. O plano não edita configuração Vercel,
  `vercel.json` nem `.vercelignore`, e nenhum gate afirma deploy. P1 precisa estar resolvida antes
  de qualquer push de implementação; verificar o deploy é tarefa operacional do controlador.
- **Arquivo sujo preexistente.** `.codex/rules/README.md` já estava modificado e fica fora de todo
  `Owns`. Ele tem hoje `git hash-object` = `01113d96ead02d092843a0248609a421fe9929f7`, e todo
  gate de escopo exige esse mesmo hash.
- **Direção visual.** O Figma não é legível e não há acesso a ele, então a composição usa assets
  locais: `src/assets/na-mesa/authority-background.png` + `src/components/shared/MesaMark.astro`.
  Proveniência: depois da pergunta sobre visual/design, o usuário respondeu "pode seguir para
  concluir tudo". A frase chegou repassada pelo controlador em 2026-09-24; o planejador não viu a
  mensagem original. Visual A/B contra o Figma: **NOT AVAILABLE** até existirem frames legíveis.
- **Copy.** A copy principal do estado confirmado é "Inscrição confirmada", não "vaga garantida".
  Mesma proveniência.
- **Arquivos protegidos.** `src/content.config.ts` (T1.1, R6) e `astro.config.mjs` (T2.1, R9).
  As aprovações constam do ledger e da frase acima, ambas repassadas pelo controlador. Antes de
  editar, o executor confirma na mensagem do próprio usuário e cita isso como motivo ao hook
  `protect_files`. Se o hook negar, pare e pergunte; nunca contorne.
- **Capacidade do loop.** O controlador repassou em 2026-09-24 que o
  `graphGuardrails.maxSpawnsPerWorkflow` efetivo é 8 (default do schema; `.graph-powers/config.json`
  não o sobrescreve). A versão anterior tinha 4 ondas: 4 × (writer + crítico) + revisor final = 9
  despachos. Por isso o RED do script CDP e o GREEN do formulário viraram uma só tarefa T3.1
  (TDD `required`), e a antiga fase 4 deixou de existir. Conta atual: fase 1 é um pacote de lane
  (T1.1 e T1.2, mesmo papel, `Owns` disjuntos), fases 2 e 3 uma tarefa cada; 3 × (writer + crítico)
  + revisor final = 7 ≤ 8, com 1 despacho de folga para correção. O cap nunca é aumentado nem
  zerado; no limite, o loop para em NEEDS-WORK ou BLOCKED.
- **Nada é staged, commitado nem publicado por este plano.** Commit exige `AULAOTB_ALLOW_COMMIT=1`
  e push exige `AULAOTB_ALLOW_PUSH=1 AULAOTB_ALLOW_PUSH_MAIN=1`, sempre no turno aprovado.

## Issue Triage (upstream mandate)

O texto das células é reproduzido verbatim, com duas exceções declaradas:

1. a linha separadora, acrescentada para renderizar a tabela;
2. na célula Evidence de R5, "User default" foi substituído, por ordem do controlador, pela decisão
   atual e sua proveniência. A atribuição original não tinha mensagem de origem do usuário.

| Req | Requirement | Verdict | Evidence | Grade |
|---|---|---|---|---|
| R1 | Public static page at its own URL `/obrigado` (no query/fragment state) | KEEP | src/pages/ has no equivalent route; src/AGENTS.md:31 static-by-default | 5 |
| R2 | Navigate to `/obrigado` only after durable proof (HTTP ok + body.ok===true + non-empty leadId + persisted===true) | KEEP | src/components/landing/RegistrationForm.astro:555-564 durableLeadId, :683-686 | 5 |
| R3 | Error/timeout/invalid/non-persisted responses do NOT navigate; keep error panel, typed data and retry | KEEP | RegistrationForm.astro:610-620, :691-707; scripts/check-form-states.mjs:202-265 | 5 |
| R4 | Existing analytics (dataLayer `lead_submit` with lead_id, gtag `generate_lead`, cro `form_submit_success`) still fire exactly once and are not lost by navigation | KEEP [MISSING] | RegistrationForm.astro:597-608; GTM container always loaded src/layouts/Layout.astro:146-150 | 4 |
| R5 | Campaign identity desktop+mobile: navy background with golden curves, "Na Mesa com Sacha" lockup, green CTA; text/CTA as real HTML; no overflow/clipping; visible focus; keyboard-operable CTA | SIMPLIFY | Figma file unreadable (View seat, no edit access). Current decision (user go-ahead "pode seguir para concluir tudo" after the visual/design question, relayed by the controller on 2026-09-24): reuse src/assets/na-mesa/authority-background.png (2160×1120 navy+gold curves, no portrait) + src/components/shared/MesaMark.astro lockup; own composition targeting desktop 1080×628 and mobile 390×837 frames | 3 |
| R6 | Copy in the content JSON: states the registration IS confirmed (never "quase finalizada"), fixes "às aula" typo, frames joining the group as the NEXT step, not a condition of confirmation | KEEP [MISSING] | src/content.config.ts:255-342 has no thank-you field; user APPROVED adding optional `thankYou` object to schema (protected file) + JSON + reader in one change | 5 |
| R7 | CTA label exactly "Entrar no grupo vip!" pointing exactly to https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4 ; no inherited invite | KEEP | content.config.ts:321-327 `registration.successState.group` already validates chat.whatsapp.com; JSON :130-137 lacks `group` → fill it; in-page success panel (RegistrationForm.astro:262-285) will also render it | 5 |
| R8 | Direct access / reload without evidence shows neutral guidance + link back to landing, never claims the registration was saved; no PII in URL | KEEP | `sessionStorage` has 0 occurrences in src/ | 4 |
| R9 | `/obrigado` is noindex AND excluded from sitemap | KEEP [MISSING] | .claude/rules/seo.md § Routes; astro.config.mjs:43-46 filters only /admin; user APPROVED editing astro.config.mjs (protected) | 5 |
| R10 | Adapt scripts/check-form-states.mjs so success proves navigation + confirmed state, and failures prove no navigation | KEEP | check-form-states.mjs:151-160 asserts the in-page success panel | 5 |

IN SCOPE: R1–R10. OUT OF SCOPE (hard negative constraint): new endpoint, token/auth, server-side verification, SSR/prerender=false on the page, ClientRouter/SPA, React island, new dependency, new sheet column, changing lead destination/env/tracking IDs, `bun run smoke`, redesign of the landing, changing global `.btn-whatsapp` styles.

## Destination

O plano está pronto quando todos os `G*` têm evidência e, contra o build estático servido em
`http://127.0.0.1:4334/`, valem os três pontos abaixo.

1. `node scripts/check-form-states.mjs` imprime `ESTADOS OK` sem nenhuma linha `FAIL`, incluindo:
   - `PASS  sucesso: navegou para /obrigado`;
   - `PASS  503: sem navegação e sem marcador`;
   - `PASS  storage bloqueado: sucesso in-page sem navegação`;
   - `PASS  storage bloqueado: CTA do grupo in-page com contraste ≥ 4.5:1`;
   - `PASS  acesso direto: estado neutro sem convite do grupo`.
2. `bun run check:geometry` imprime `GEOMETRIA OK` para `/` e para `/obrigado/`.
3. A navegação só nasceu depois de o mesmo script ter falhado (RED, T3.1 Step 14, com o
   formulário ainda idêntico a `ac0521f`) antes da mudança do formulário (GREEN, CHECK de T3.1).

Em outras palavras:

- inscrição com prova durável chega a `/obrigado` confirmada, com o CTA exato do grupo;
- qualquer falha fica em `/`, sem marcador nem `lead_submit`;
- os três eventos disparam uma vez;
- acesso direto é neutro;
- o CTA fica livre de aviso de cookies e botão flutuante em 390x844, 768x1024 e 1440x1000, antes
  e depois do consentimento;
- a página é `noindex` e fica fora do sitemap.

## Reuse ledger

| # | Need | Existing asset (`path:line`) | Verdict | Why extending fails (NEW only) |
|---|---|---|---|---|
| 1 | Prova de gravação durável | `src/components/landing/RegistrationForm.astro:555-564` (`durableLeadId`) | REUSE sem mudança | — |
| 2 | Ponto de confirmação | `RegistrationForm.astro:597-608` (`confirmLead`) | EXTEND | — |
| 3 | Guarda de tipo sem PII | `RegistrationForm.astro:369-384` (`NoPii`, `AnalyticsEvent`) | EXTEND (`eventCallback?`, `eventTimeout?`) | — |
| 4 | Schema do convite do grupo | `src/content.config.ts:321-331` (`successState.group`) | REUSE; preencher JSON | — |
| 5 | CTA do grupo no painel in-page | `RegistrationForm.astro:262-285` (`data-cro="success_join_group"`, `.btn-whatsapp`) | EXTEND só a cor do texto, por `<style>` com escopo do componente | — |
| 6 | Shell, SEO, `noindex` | `src/layouts/Layout.astro:24-37`, `:184-187` | REUSE | — |
| 7 | Padrão de página utilitária | `src/pages/404.astro:1-24` | REUSE padrão | — |
| 8 | Lockup | `src/components/shared/MesaMark.astro:1-15` | REUSE | — |
| 9 | Arte de fundo | `src/assets/na-mesa/authority-background.png` (2160×1120) + `src/components/landing/Hero.astro:17-27` | REUSE | — |
| 10 | Módulo de constantes | padrão de `src/lib/consent.ts:10-12` | NEW `src/lib/thank-you.ts` | `consent.ts` é dono da chave de cookies; misturar o marcador de inscrição acoplaria dois contratos |
| 11 | Filtro do sitemap | `astro.config.mjs:42-46` | EXTEND | — |
| 12 | Tokens e foco | `src/styles/global.css:26`, `:57`, `:155-156`, `:306-309` | REUSE | — |
| 13 | Estado oculto robusto | `node_modules/tailwindcss/preflight.css:391-393` | REUSE | — |
| 14 | Proteção do chrome inferior | `src/scripts/motion.ts:196-212` (`measure`, `bandBlocked`), `:269` (`bottomchrome:change`) | REUSE | — |
| 15 | Harness CDP de estados | `scripts/check-form-states.mjs:18-135` | EXTEND | — |
| 16 | Gate de geometria (interseção + hit-test, 3 viewports, antes/depois do consentimento) | `scripts/chrome-geometry.mjs:41-55`, `:280-290`, `:560-575` | EXTEND: semeia o marcador só quando o path é `/obrigado` | — |
| 17 | Servidor local sobre o build | `docs/planilha-leads.md:232` | REUSE com `python3 -m http.server` (sem dependência) | — |
| 18 | Rota `/obrigado` | nenhuma em `src/pages/` | NEW `src/pages/obrigado.astro` | não há página equivalente (R1) |

## Regression watchlist

| # | Existing behaviour that must still work | How to prove it | Phase |
|---|---|---|---|
| W1 | Ramos de falha inalterados: painel de erro, dados preservados, retry | T3.1 sonda de diff; `check:states` cenários 503, sem prova, HTML, `lead_legacy` | 3 |
| W2 | Nenhum `lead_submit`/`generate_lead` em falha | linhas `NENHUM lead_submit` e `NENHUM generate_lead` do `check:states` (T3.1, G3.5) | 3 |
| W3 | Sucesso in-page quando `sessionStorage` lança | `PASS  storage bloqueado: sucesso in-page sem navegação` (T3.1, G3.5) | 3 |
| W4 | Geometria do chrome inferior da landing (B4) | `node scripts/chrome-geometry.mjs http://127.0.0.1:4334/` → `GEOMETRIA OK` (T2.1, G3.5) | 2, 3 |
| W5 | Nenhuma PII em analytics, fonte e bundle (B3) | `bun run check:pii` (T3.1, G3.4) + `bun scripts/check-no-pii-analytics.ts --dist` (G3.4) | 3 |
| W6 | `lead_submit` não duplicado (B5) | T3.1 contagem de linha = 1; `PASS  sucesso: lead_submit uma vez com lead_id do servidor` | 3 |
| W7 | Sem consentimento, nenhuma captura | linhas `sem consentimento:` do `check:states` | 3 |
| W8 | Payload com `profession` rotulado e `landingPath` `/` | linhas `payload:` do `check:states` | 3 |
| W9 | Estático; sem `prerender = false` público, `ClientRouter` ou ilha | T2.1 sonda de fonte; G3.6 | 2, 3 |
| W10 | Sitemap mantém `/`, `/termos`, `/politica-de-privacidade`; `/admin` fora | T2.1 sonda `/termos/` + ausência de `/obrigado` | 2 |
| W11 | Upload Vercel sem perda; arquivos novos não ignorados; `.vercelignore` sem padrão solto (B1) | G3.4 `verify:vercel` + sonda `git ls-files --others --ignored`; G3.6 B1 | 3 |
| W12 | Checagens mecânicas do REVIEW.md §3 | G3.6 | 3 |
| W13 | Arquivo sujo preexistente intocado | `git hash-object .codex/rules/README.md` = `01113d96…` em G1.3, G2.3, G3.3 | 1–3 |

## Execution graph

```
T1.1 (schema + JSON) ──┐
                       ├──> T2.1 (página + sitemap + geometria) ──> T3.1 (check:states RED → formulário GREEN)
T1.2 (constantes) ─────┤                                              ^
                       └──────────────────────────────────────────────┘
```

| Edge | Payload the destination reads |
|---|---|
| T1.1 → T2.1 | `thankYou.{seo,confirmed,neutral}` (schema + valores) e `registration.successState.group.{label,href}` |
| T1.2 → T2.1 | `THANK_YOU_MARKER_KEY`, `THANK_YOU_MARKER_VALUE` |
| T1.1 → T3.1 | `registration.successState.group` renderizado no painel in-page como `a[data-cro="success_join_group"]` |
| T2.1 → T3.1 | contrato de DOM em `/obrigado`: `[data-thank-you-root]`, `[data-thank-you-state]`, `h1#obrigado-title`, `a[data-thank-you-cta]`, `a[data-thank-you-back]` |
| T1.2 → T3.1 | `THANK_YOU_PATH`, `THANK_YOU_MARKER_KEY`, `THANK_YOU_MARKER_VALUE` |

As fases 2 e 3 são `[SEQUENTIAL]`, uma tarefa cada. Os `Owns` são disjuntos, mas cada CHECK roda
um build completo. Dentro de T3.1, o script é escrito e observado RED (Step 14) antes de qualquer
edição do formulário, e o GREEN é o CHECK da própria tarefa (TDD). A fase 1 é `[PARALLEL-SAFE]`
e vai como um único pacote de lane (mesmo papel, `Owns` disjuntos). Total: 3 ondas
× (writer + crítico) + revisor final = 7 despachos, dentro do cap 8.

## Requirement coverage (Gauntlet required; recommended otherwise)

| Need | Surface (`database` / `backend` / `frontend`) | Applicable evidence | Task(s) and `Owns` | Producer → consumer payload/path | Acceptance evidence |
|---|---|---|---|---|---|
| R1 | frontend | `src/pages/` sem `/obrigado`; `src/AGENTS.md:31` | T1.2 (`src/lib/thank-you.ts`), T2.1 (`src/pages/obrigado.astro`) | `thank-you.ts` → `RegistrationForm.astro` (`THANK_YOU_PATH`); `obrigado.astro` → `dist/client/obrigado/index.html` | T1.2 `T1.2_OK`; T2.1 `T2.1_OK`; T3.1 `sucesso: navegou para /obrigado` |
| R2 | frontend | `RegistrationForm.astro:555-564`, `:683-686` | T3.1 (`src/components/landing/RegistrationForm.astro`) | `durableLeadId` → `confirmLead` → `sessionStorage[THANK_YOU_MARKER_KEY]` + `location.assign(THANK_YOU_PATH)` | T3.1 Step 14 `FAIL  sucesso: navegou…` (RED); T3.1 CHECK `PASS` (GREEN) + `sem navegação e sem marcador` |
| R3 | frontend | `RegistrationForm.astro:610-620`, `:691-707`; `check-form-states.mjs:202-265` | T3.1 (`scripts/check-form-states.mjs`; sem diff nos ramos de falha de `RegistrationForm.astro`) | `fail()` → `#registration-error` (inalterado) | T3.1 sonda de diff; `503: sem navegação e sem marcador` + linhas 503 existentes |
| R4 | frontend | `RegistrationForm.astro:597-608`; GTM em `Layout.astro:146-150` | T3.1 | `confirmLead` → `dataLayer.push({event:"lead_submit", lead_id, eventCallback, eventTimeout})`, `gtag("event","generate_lead")`, `cro("form_submit_success")` → espelho `sessionStorage.__qa_events` no check | T3.1 `lead_submit uma vez…`, `generate_lead e form_submit_success uma vez cada` |
| R5 | frontend | `authority-background.png`; `MesaMark.astro`; `global.css:26`, `:155-156`, `:306-309`; `motion.ts:196-212` | T2.1 (`obrigado.astro`, `scripts/chrome-geometry.mjs`), T3.1 | `thankYou` + `group` → marcação/`<style>` de `obrigado.astro`; `[data-conversion-zone]` → `motion.ts` e `chrome-geometry.mjs` | `GEOMETRIA OK` em `/obrigado/` (T2.1, G3.5); linhas `1440x1000:`/`768x1024:`/`390x844:` (T3.1); Visual A/B NOT AVAILABLE (F2) |
| R6 | frontend (content collection build-time, `paths.schemaRoot`) | `content.config.ts:255-342` | T1.1 (`src/content.config.ts`, `src/content/products/aula-semanal.json`), T2.1 | `thankYou.confirmed/neutral` → `obrigado.astro` | T1.1 `T1.1_SCHEMA_OK` (headline `Inscrição confirmada`, sem "vaga"/"garantid"); T3.1 labels de `h1` |
| R7 | frontend (content) | `content.config.ts:321-331`; JSON `:130-137`; `RegistrationForm.astro:262-285` | T1.1, T2.1, T3.1 | `registration.successState.group` → CTA de `obrigado.astro` e painel in-page | T1.1 literal exato; T2.1 sonda de `href`; T3.1 `página confirmada: CTA do grupo com rótulo e href exatos`; T3.1 `CTA do grupo in-page com contraste ≥ 4.5:1` |
| R8 | frontend | `sessionStorage` com 0 ocorrências em `src/` | T1.2, T2.1 | `THANK_YOU_MARKER_KEY/VALUE` → script da página | T2.1 HTML estático com confirmado `hidden`; T3.1 `acesso direto…`, `recarga…`, `sem PII…` |
| R9 | frontend (registro da rota) | `.claude/rules/seo.md § Routes`; `astro.config.mjs:43-46` | T1.1 (copy SEO), T2.1 (`src/pages/obrigado.astro`, `astro.config.mjs`) | prop `noindex` → `<meta name="robots">`; `filter` do sitemap → `dist/client/sitemap-0.xml` | T2.1 sondas de `noindex` e sitemap |
| R10 | frontend (verificação) | `check-form-states.mjs:151-160` | T3.1 (`scripts/check-form-states.mjs`) | contrato de DOM + eventos → asserções CDP | T3.1 Step 14 `T3.1_RED_OK` (RED); T3.1 `T3.1_OK` (GREEN); G3.5 |
| R1–R10 | database | Store Google Sheets via `/api/inscricao`; nenhuma coluna nova (`PRODUCT.md` "sem alterar colunas"; ledger OUT OF SCOPE) | N/A | — | G3.3 prova que nada fora dos `Owns` mudou |
| R1–R10 | backend | `/api/inscricao` reutilizado; nenhum arquivo em `src/pages/api/**` ou `src/lib/server/**` em qualquer `Owns` | N/A | — | G3.3 |

## Risk

| # | Risk | Score | Mitigation |
|---|------|-------|------------|
| K1 | Navegação corta a entrega de `lead_submit`/`generate_lead` | 2×3=6 MITIGATE | `eventCallback` + `eventTimeout` 1500 ms + temporizador de reserva; GA4 usa transporte beacon; conferir com GTM Preview após deploy aprovado (F1) |
| K2 | `lead_submit` duplicado ao anexar o callback (B5) | 1×3=3 ACCEPT | um único push; T3.1 conta a linha; T3.1 conta "uma vez" no navegador |
| K3 | Marcador gravado ou página confirmada sem prova (B2) | 1×3=3 ACCEPT | marcador só dentro de `confirmLead`; confirmado nasce `hidden`; `sem navegação e sem marcador` em todo ramo de falha |
| K4 | PII em URL, `sessionStorage` ou analytics (B3) | 1×3=3 ACCEPT | valor `"1"`; `check:pii` fonte e `--dist`; T3.1 varre eventos, URL e storage |
| K5 | `sessionStorage` bloqueado impede a navegação | 2×1=2 ACCEPT | painel in-page preservado e testado (W3) |
| K6 | Flash neutro → confirmado antes do script | 2×1=2 ACCEPT | direção segura; nunca exibe confirmação falsa |
| K7 | CTA de `/obrigado` coberto por aviso de cookies ou botão flutuante (B4) | 2×2=4 MITIGATE | `data-conversion-zone` + `bottomchrome:change`; `check:geometry` em `/obrigado/` com marcador semeado: 390x844, 768x1024, 1440x1000 × consentimento pendente/concedido/reduced/sem JS, interseção + hit-test (T2.1, G3.5) |
| K8 | `/obrigado` indexada ou no sitemap | 1×2=2 ACCEPT | `noindex` + filtro; `robots.txt` sem `Disallow` de propósito (crawler precisa ler o `noindex`) |
| K9 | Convite herdado ou errado (`PRODUCT.md`) | 1×3=3 ACCEPT | literal exato no JSON (T1.1), no HTML (T2.1) e no DOM (T3.1); uma só ocorrência de `chat.whatsapp.com` no JSON |
| K10 | Check CDP instável (GTM via rede, tempo) | 2×2=4 MITIGATE | polling até 6000 ms; espera fixa de 3000 ms nas falhas; reserva determinística de 1500 ms |
| K11 | `verify:vercel` cego a arquivos novos não rastreados | 2×2=4 MITIGATE | G3.4 sonda `git ls-files --others --ignored --exclude-from=.vercelignore` |
| K12 | Hook de arquivo protegido bloqueia a edição | 2×1=2 ACCEPT | motivo explícito citando R6/R9 e a proveniência; negar = parar e perguntar |
| K13 | CTA do grupo in-page, que passa a renderizar com o `group` novo, herda `.btn-whatsapp` (texto `#fafaf9` sobre `#25d366` ≈ 1,9:1) | 3×2=6 MITIGATE | regra `<style>` com escopo em `RegistrationForm.astro` só para `[data-cro="success_join_group"]`: texto `var(--color-navy)` (≈ 8,0:1; hover ≈ 6,4:1); RED e GREEN em T3.1; `.btn-whatsapp` global intocado; `:217` e `:292` preexistentes → F3 |
| K14 | Vercel ainda com Production Branch `master`: push em `main` não publica | 3×2=6 MITIGATE | pré-condição externa P1; nenhum gate afirma deploy; o controlador/usuário ajusta o dashboard antes do push |
| K15 | Worker altera o `README` sujo preexistente | 1×3=3 ACCEPT | hash `01113d96…` exigido em todo gate de escopo; rollback só com paths explícitos |
| K16 | RED pulado ou pelo motivo errado na tarefa mesclada (teste quebrado, não comportamento ausente) | 2×2=4 MITIGATE | o comando RED do Step 14 começa com `git diff --quiet ac0521f -- src/components/landing/RegistrationForm.astro`, exige que todo `FAIL` esteja na allowlist das labels que dependem da mudança do formulário e que as labels de página e de falha passem; EVIDENCE exige blocos RED e GREEN; o crítico da onda confere os dois |
| K17 | Semente do marcador altera a medição da landing | 1×2=2 ACCEPT | semente condicionada ao path `/obrigado`; `GEOMETRIA OK` em `/` no T2.1 e no G3.5 |
| K18 | Correção além da folga estoura `maxSpawnsPerWorkflow` 8 | 2×2=4 MITIGATE | 3 ondas + revisor final = 7/8; CHECKs decisivos e literais reduzem retrabalho; no limite, NEEDS-WORK ou BLOCKED, nunca aumentar nem zerar o cap |

Nenhum risco ≥ 7.

### ADR: portador da evidência de confirmação para `/obrigado`

**Context:** `/obrigado` precisa distinguir quem acabou de ter a inscrição gravada de um acesso
direto, sem SSR, endpoint novo nem PII (R1, R2, R8).

**Options:**

- A) marcador `"1"` em `sessionStorage`, gravado só em `confirmLead`;
- B) `leadId` ou flag em query/fragmento;
- C) token verificado no servidor;
- D) manter só o painel in-page.

**Decision:** A.

- É por aba, sobrevive à navegação e à recarga e some em aba nova.
- Não carrega PII nem id, e mantém a página estática.
- B viola R1 e expõe id na URL. C exige endpoint e SSR, fora de escopo. D não atende R1.

**Consequences:**

- A confirmação não atravessa dispositivos nem abas novas; esses mostram o estado neutro, que não
  mente.
- Com storage bloqueado, o sucesso fica no painel in-page.
- "Duplicar aba" copia o marcador; aceito.

## Dispatch matrix

| Task | Agent | Skill | Owns | Needs | Serves |
|---|---|---|---|---|---|
| T1.1 | graph-powers:frontend-specialist | none | `src/content.config.ts`, `src/content/products/aula-semanal.json` | — | R6, R7, R9 |
| T1.2 | graph-powers:frontend-specialist | none | `src/lib/thank-you.ts` | — | R1, R2, R8 |
| T2.1 | graph-powers:frontend-specialist | landing-page-design | `src/pages/obrigado.astro`, `astro.config.mjs`, `scripts/chrome-geometry.mjs` | T1.1, T1.2 | R1, R5, R6, R7, R8, R9 |
| T3.1 | graph-powers:frontend-specialist | webapp-testing | `scripts/check-form-states.mjs`, `src/components/landing/RegistrationForm.astro` | T1.1, T1.2, T2.1 | R2, R3, R4, R7, R10 |

**Skill de copy.** `grupo-us` não é roteável pelo validador Gauntlet: ela não existe em
`graph-powers/skills/`, só como skill do usuário em `~/.claude/skills/grupo-us/SKILL.md`. Por isso
o campo Skill de T1.1 é `none`, e o Step 1 de T1.1 manda ler essa skill antes de escrever a copy.

**Regras para todo worker:**

- Ler `AGENTS.md`, `.claude/CLAUDE.md`, `src/AGENTS.md`, `src/components/landing/AGENTS.md` e as
  regras em `.claude/rules/` do path.
- Bun only; LF; tabs e aspas duplas (Biome).
- Formatar só os próprios arquivos, com `bunx biome check --write <owned paths>`.
- Proibido:
  - hex fora do `@theme`, `wa.me` inline, copy hardcoded, dependência nova;
  - Git que mude estado, `bun run smoke`;
  - tocar `.codex/rules/README.md`.

## Phase 1 — Contratos de dados e constantes  [PARALLEL-SAFE]

- [ ] **T1.1** — Add the optional thankYou content contract and the group invite (R6, R7, R9)
  Owns: src/content.config.ts, src/content/products/aula-semanal.json
  Needs: none
  Acceptance: o schema aceita `thankYou` opcional (sem `eyebrow`) e o JSON o preenche; `thankYou.confirmed.headline` é exatamente `Inscrição confirmada`; nenhum texto de `thankYou` contém "vaga" ou "garantid"; `registration.successState.group` tem rótulo `Entrar no grupo vip!` e o `href` exato de R7; a copy neutra não afirma gravação; não há "quase finalizada" nem "às aula" sem "s"; o JSON tem uma única ocorrência de `chat.whatsapp.com`
  Agent: graph-powers:frontend-specialist · Skill: none · Effort: mechanical
  TDD: not-applicable (dado de conteúdo sem comportamento; a validação Zod no sync e a sonda de valores são a prova)
  CHECK: `./node_modules/.bin/astro sync >/dev/null 2>&1 && bun -e 'const d=JSON.parse(await Bun.file("src/content/products/aula-semanal.json").text());const t=d.thankYou,g=d.registration.successState.group,raw=JSON.stringify(d),ty=JSON.stringify(t);const ok=g.label==="Entrar no grupo vip!"&&g.href==="https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4"&&(raw.match(/chat\.whatsapp\.com/g)||[]).length===1&&t.confirmed.headline==="Inscrição confirmada"&&!("eyebrow" in t.confirmed)&&!/vaga|garantid/i.test(ty)&&/inscrição/i.test(t.confirmed.body)&&!/confirmad|recebemos/i.test(t.neutral.headline+" "+t.neutral.body)&&!/quase finalizad|às aula(?!s)/i.test(raw)&&t.neutral.backLabel.length>0&&t.seo.title.length>=20;if(!ok)process.exit(1);console.log("T1.1_OK")' && rg -q 'thankYou: z' src/content.config.ts && echo T1.1_SCHEMA_OK`
  EXPECT: `T1.1_SCHEMA_OK`
  EVIDENCE: pending
  Steps:
    1. Read `~/.claude/skills/grupo-us/SKILL.md` (voz, público e proibições de copy), root `PRODUCT.md`, `src/content.config.ts:255-343` and `src/content/products/aula-semanal.json:74-140`; confirm there is no `thankYou` and that `registration.successState` has no `group`.
    2. Edit `src/content.config.ts` (protected; hook reason cites R6 and the provenance in § Decisões e proveniência, after confirming it in the user's own message). Add, as a sibling right after the `registration` object and before `faqs`, with a one-line JSDoc saying it feeds `/obrigado`:
       ```ts
       thankYou: z
       	.object({
       		seo: z.object({
       			title: z.string().min(20).max(70),
       			description: z.string().min(120).max(220),
       		}),
       		confirmed: z.object({
       			headline: z.string(),
       			body: z.string(),
       		}),
       		neutral: z.object({
       			headline: z.string(),
       			body: z.string(),
       			backLabel: z.string(),
       		}),
       	})
       	.optional(),
       ```
    3. Edit the JSON (tabs, LF). Inside `registration.successState`, add `"group": { "title": "Próximo passo", "description": "Entre no grupo VIP do WhatsApp da aula.", "label": "Entrar no grupo vip!", "href": "https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4" }`. After the `registration` object, add top-level `"thankYou"` with exactly: `seo.title` = `Próximo passo | Na Mesa com Sacha`; `seo.description` = `Próximo passo da inscrição no Na Mesa com Sacha, as aulas gratuitas ao vivo com a Dra. Sacha Gualberto, toda terça-feira no Zoom.`; `confirmed.headline` = `Inscrição confirmada`; `confirmed.body` = `Recebemos sua inscrição nas aulas gratuitas de terça-feira no Zoom. Acompanhe seu e-mail e WhatsApp para receber as orientações de acesso às aulas. Como próximo passo, entre no grupo VIP do WhatsApp.`; `neutral.headline` = `Participe do Na Mesa com Sacha`; `neutral.body` = `Se você já se inscreveu, acompanhe seu e-mail e WhatsApp. Se ainda não, preencha seus dados na página inicial para participar das aulas gratuitas de terça-feira no Zoom.`; `neutral.backLabel` = `Ir para o formulário de inscrição`.
    4. Format only the two owned files with `bunx biome check --write src/content.config.ts src/content/products/aula-semanal.json`, then run CHECK and paste the deciding lines into EVIDENCE.

- [ ] **T1.2** — Create the shared thank-you constants module (R1, R2, R8)
  Owns: src/lib/thank-you.ts
  Needs: none
  Acceptance: `src/lib/thank-you.ts` exporta exatamente `THANK_YOU_PATH = "/obrigado"`, `THANK_YOU_MARKER_KEY = "mesa_inscricao_confirmada"` e `THANK_YOU_MARKER_VALUE = "1"`, sem outro export
  Agent: graph-powers:frontend-specialist · Skill: none · Effort: mechanical
  TDD: not-applicable (três constantes sem lógica; o import com asserção de valores é a prova)
  CHECK: `bun -e 'const m=await import(process.cwd()+"/src/lib/thank-you.ts");if(m.THANK_YOU_PATH!=="/obrigado"||m.THANK_YOU_MARKER_KEY!=="mesa_inscricao_confirmada"||m.THANK_YOU_MARKER_VALUE!=="1"||Object.keys(m).length!==3)process.exit(1);console.log("T1.2_OK")'`
  EXPECT: `T1.2_OK`
  EVIDENCE: pending
  Steps:
    1. Read `src/lib/consent.ts` to mirror its style: a JSDoc explaining why one shared literal exists.
    2. Create `src/lib/thank-you.ts` with the three `export const` values from Acceptance and a JSDoc stating: the form writes the marker only after durable proof, `/obrigado` reads it, the value carries no PII and no lead id, and `scripts/check-form-states.mjs` and `scripts/chrome-geometry.mjs` repeat the key as a literal because a plain `.mjs` cannot import `.ts`.
    3. Run `bunx biome check --write src/lib/thank-you.ts`, then CHECK.

### Phase 1 gate

- [ ] **G1.1** — every T1.x met its acceptance with evidence
  CHECK: `./node_modules/.bin/astro sync >/dev/null 2>&1 && bun -e 'const d=JSON.parse(await Bun.file("src/content/products/aula-semanal.json").text());const t=d.thankYou,g=d.registration.successState.group,raw=JSON.stringify(d),ty=JSON.stringify(t);const ok=g.label==="Entrar no grupo vip!"&&g.href==="https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4"&&(raw.match(/chat\.whatsapp\.com/g)||[]).length===1&&t.confirmed.headline==="Inscrição confirmada"&&!("eyebrow" in t.confirmed)&&!/vaga|garantid/i.test(ty)&&/inscrição/i.test(t.confirmed.body)&&!/confirmad|recebemos/i.test(t.neutral.headline+" "+t.neutral.body)&&!/quase finalizad|às aula(?!s)/i.test(raw)&&t.neutral.backLabel.length>0&&t.seo.title.length>=20;if(!ok)process.exit(1);console.log("T1.1_OK")' && rg -q 'thankYou: z' src/content.config.ts && echo T1.1_SCHEMA_OK && bun -e 'const m=await import(process.cwd()+"/src/lib/thank-you.ts");if(m.THANK_YOU_PATH!=="/obrigado"||m.THANK_YOU_MARKER_KEY!=="mesa_inscricao_confirmada"||m.THANK_YOU_MARKER_VALUE!=="1"||Object.keys(m).length!==3)process.exit(1);console.log("T1.2_OK")'`
  EXPECT: `/T1\.1_SCHEMA_OK[\s\S]*T1\.2_OK/`
  EVIDENCE: pending
- [ ] **G1.2** — the project still type-checks and lints as a whole
  CHECK: `./node_modules/.bin/astro check && bun run lint && echo G1.2_OK`
  EXPECT: `G1.2_OK`
  EVIDENCE: pending
- [ ] **G1.3** — nothing outside Phase 1 Owns changed and the preexisting dirty README is byte-identical
  CHECK: `test -z "$( { git diff --name-only --no-renames -z ac0521f --; git ls-files --others --exclude-standard -z; } | tr '\0' '\n' | sort -u | grep -vxF -e .codex/rules/README.md -e docs/plans/2026-09-24-pagina-obrigado/spec.md -e docs/plans/2026-09-24-pagina-obrigado/PLAN.md -e src/content.config.ts -e src/content/products/aula-semanal.json -e src/lib/thank-you.ts )" && [ "$(git hash-object .codex/rules/README.md)" = 01113d96ead02d092843a0248609a421fe9929f7 ] && echo G1.3_SCOPE_OK`
  EXPECT: `G1.3_SCOPE_OK`
  EVIDENCE: pending
- [ ] **G1.4** — the interfaces Phase 2 Needs exist
  CHECK: `bun -e 'const m=await import(process.cwd()+"/src/lib/thank-you.ts");const d=JSON.parse(await Bun.file("src/content/products/aula-semanal.json").text());if(typeof m.THANK_YOU_PATH!=="string"||typeof m.THANK_YOU_MARKER_KEY!=="string"||typeof m.THANK_YOU_MARKER_VALUE!=="string"||!d.thankYou?.confirmed?.headline||!d.thankYou?.neutral?.backLabel||!d.thankYou?.seo?.description||!d.registration?.successState?.group?.href)process.exit(1);console.log("G1.4_OK")'`
  EXPECT: `G1.4_OK`
  EVIDENCE: pending

## Phase 2 — Página, registro da rota e prova geométrica  [SEQUENTIAL]

- [ ] **T2.1** — Build the static /obrigado page, exclude it from the sitemap and prove its bottom-chrome geometry (R1, R5, R6, R7, R8, R9)
  Owns: src/pages/obrigado.astro, astro.config.mjs, scripts/chrome-geometry.mjs
  Needs: T1.1 (reads: thankYou.seo, thankYou.confirmed, thankYou.neutral and registration.successState.group), T1.2 (reads: THANK_YOU_MARKER_KEY and THANK_YOU_MARKER_VALUE)
  Acceptance: o build gera `dist/client/obrigado/index.html` com `noindex, nofollow`, um único `<h1`, todo `[data-thank-you-state="confirmed"]` com `hidden`, nenhum neutro com `hidden`, o `href` exato do convite e o link `/#inscricao`; o sitemap não lista `/obrigado` e mantém `/termos/`; a fonte da página não tem `prerender`, `client:`, `ClientRouter`, leitura de `location.search/hash`, literal `chat.whatsapp.com` nem hex; `node scripts/chrome-geometry.mjs http://127.0.0.1:4334/obrigado/` (marcador semeado só nesse path) sai 0 com `GEOMETRIA OK` em 390x844, 768x1024 e 1440x1000, com consentimento pendente e concedido, provando por interseção e hit-test que o CTA não fica sob o aviso de cookies nem sob o botão flutuante; a mesma ferramenta em `http://127.0.0.1:4334/` continua `GEOMETRIA OK`
  Agent: graph-powers:frontend-specialist · Skill: landing-page-design · Effort: design
  TDD: not-applicable (marcação estática; a inspeção do HTML gerado e o `check:geometry` em `/obrigado/` neste CHECK são a prova; o comportamento do fluxo é testado em T3.1)
  CHECK: `bun run build >/dev/null 2>&1 && f=dist/client/obrigado/index.html && test -f "$f" && rg -qF '<meta name="robots" content="noindex, nofollow"' "$f" && [ "$(rg -o '<h1[ >]' "$f" | wc -l)" -eq 1 ] && [ "$(rg -o 'data-thank-you-state="confirmed"[^>]*>' "$f" | wc -l)" -ge 2 ] && [ "$(rg -o 'data-thank-you-state="confirmed"[^>]*>' "$f" | wc -l)" -eq "$(rg -o 'data-thank-you-state="confirmed"[^>]*\shidden(="")?(\s[^>]*)?>' "$f" | wc -l)" ] && ! rg -q 'data-thank-you-state="neutral"[^>]*\shidden(="")?(\s[^>]*)?>' "$f" && rg -q 'CeAhWrPt7D7G7rpHy0uFSY\?s=cl&(amp;)?p=i&(amp;)?mlu=4&(amp;)?ilr=4' "$f" && rg -qF 'href="/#inscricao"' "$f" && ! rg -q '/obrigado' dist/client/sitemap-0.xml && rg -qF '/termos/' dist/client/sitemap-0.xml && ! rg -q 'prerender|client:|ClientRouter|location\.(search|hash)|URLSearchParams|chat\.whatsapp\.com' src/pages/obrigado.astro && ! rg -q '#[0-9a-fA-F]{3,8}\b' src/pages/obrigado.astro && [ "$(rg -c 'mesa_inscricao_confirmada' scripts/chrome-geometry.mjs)" -eq 1 ] && glog=$(mktemp) && llog=$(mktemp) && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; node scripts/chrome-geometry.mjs http://127.0.0.1:4334/obrigado/ >"$glog" 2>&1; grc=$?; node scripts/chrome-geometry.mjs http://127.0.0.1:4334/ >"$llog" 2>&1; lrc=$?; kill "$srv"; cat "$glog" "$llog"; [ "$grc" -eq 0 ] && [ "$lrc" -eq 0 ] && rg -q 'GEOMETRIA OK' "$glog" && rg -q 'GEOMETRIA OK' "$llog" && echo T2.1_OK; }`
  EXPECT: `T2.1_OK`
  EVIDENCE: pending
  Steps:
    1. Read `src/pages/404.astro`, `src/components/landing/Hero.astro:1-36`, `src/components/shared/MesaMark.astro`, `src/components/shared/WhatsAppFloatingButton.astro`, `src/layouts/Layout.astro:24-54`, `:240-260`, `astro.config.mjs:40-66`, `src/scripts/motion.ts:158-270`, `scripts/chrome-geometry.mjs:28-60`, `:540-580`, `src/styles/global.css:20-60`, `:150-160`, `:300-310`, plus root `DESIGN.md` and `.claude/rules/DESIGN.md`.
    2. Create `src/pages/obrigado.astro`. Frontmatter:
       ```astro
       import { getImage } from "astro:assets";
       import { getEntry } from "astro:content";
       import background from "../assets/na-mesa/authority-background.png";
       import MesaMark from "../components/shared/MesaMark.astro";
       import Layout from "../layouts/Layout.astro";

       const product = await getEntry("products", "aula-semanal");
       if (!product) throw new Error("Product aula-semanal not found");
       const d = product.data;
       const ty = d.thankYou;
       const group = d.registration.successState?.group;
       if (!ty || !group) throw new Error("/obrigado exige thankYou e registration.successState.group no JSON");
       const [desktopBg, mobileBg] = await Promise.all([
       	getImage({ src: background, width: 1920, format: "webp", quality: 80 }),
       	getImage({ src: background, width: 1080, format: "webp", quality: 80 }),
       ]);
       ```
    3. Markup — `<Layout title={ty.seo.title} description={ty.seo.description} noindex={true}>`, no `slot="bottom-cta"`. Always write `data-thank-you-state="…"` before `hidden` in each tag:
       ```astro
       <section class="obrigado" aria-labelledby="obrigado-title" data-thank-you-root>
       	<picture class="obrigado-bg">
       		<source media="(max-width: 767px)" srcset={mobileBg.src} width={background.width} height={background.height} />
       		<img src={desktopBg.src} alt="" width={background.width} height={background.height} loading="eager" fetchpriority="high" decoding="async" class="obrigado-bg-image" />
       	</picture>
       	<div class="obrigado-content">
       		<MesaMark brand={d.shell.brand} />
       		<h1 id="obrigado-title">
       			<span data-thank-you-state="neutral">{ty.neutral.headline}</span>
       			<span data-thank-you-state="confirmed" hidden>{ty.confirmed.headline}</span>
       		</h1>
       		<div data-thank-you-state="neutral">
       			<p>{ty.neutral.body}</p>
       			<a href="/#inscricao" data-thank-you-back class="obrigado-back">{ty.neutral.backLabel}</a>
       		</div>
       		<div data-thank-you-state="confirmed" hidden>
       			<p>{ty.confirmed.body}</p>
       			<a href={group.href} target="_blank" rel="noopener noreferrer" data-thank-you-cta data-conversion-zone class="obrigado-cta">{group.label}</a>
       		</div>
       	</div>
       </section>
       ```
    4. Page-scoped `<style>` using only `var(--color-*)` tokens:
       - The section has `position: relative`, `isolation: isolate`, `overflow: hidden` and a navy base (`var(--color-navy)`). Its min-height fills the first viewport below the header.
       - The background `img` is absolutely positioned with `object-fit: cover`. Under `@media (max-width: 767px)` it gets a different `object-position`, so the gold curves stay visible.
       - The content column is readable at 390 px and centered on desktop. Composition targets are frames 1080×628 and 390×837, with no Figma A/B.
       - `.obrigado-cta`:
         - `background: var(--color-whatsapp)`, hover `var(--color-whatsapp-hover)`;
         - `color: var(--color-navy)`;
         - `min-height: 2.75rem`;
         - full width on mobile.
       - `.obrigado-back` is also at least 2.75rem tall.
       - Keep the CTA's rect clear of `[data-float-wa]` (bottom-right) at 390x844, 768x1024 and 1440x1000. If a `check:geometry` B1 detail names `waFloat`, add bottom padding to the content column. Do not edit the float or `motion.ts`.
       - The consent row cedes over `[data-conversion-zone]` by itself (`motion.ts` `bandBlocked`). Prefer a resting CTA position above the bottom band at 390x844, so the cookie notice is not withheld while the page sits at rest.
       - Keep the global `:focus-visible` ring; do not set `outline: none`.
       - Put any transition or animation only inside `@media (prefers-reduced-motion: no-preference)`. No `data-reveal` on state elements.
       - Do not touch `global.css` or `.btn-whatsapp`.
    5. Page `<script>` (bundled, not `is:inline`):
       ```ts
       import { THANK_YOU_MARKER_KEY, THANK_YOU_MARKER_VALUE } from "../lib/thank-you";

       let confirmed = false;
       try {
       	confirmed = sessionStorage.getItem(THANK_YOU_MARKER_KEY) === THANK_YOU_MARKER_VALUE;
       } catch {
       	/* storage indisponível: estado neutro, que nunca afirma gravação */
       }
       if (confirmed) {
       	for (const el of document.querySelectorAll<HTMLElement>("[data-thank-you-state]")) {
       		el.hidden = el.dataset.thankYouState !== "confirmed";
       	}
       	window.dispatchEvent(new Event("bottomchrome:change"));
       }
       ```
       Do not remove the marker.
    6. Edit `astro.config.mjs` (protected; hook reason cites R9 and the provenance in § Decisões e proveniência, after confirming it in the user's own message). Replace only the `filter` with:
       ```js
       filter: (page) => {
       	const pathname = new URL(page).pathname.replace(/\/$/, "") || "/";
       	return !pathname.startsWith("/admin") && pathname !== "/obrigado";
       },
       ```
       Extend the comment above it: `/obrigado` já emite noindex; `public/robots.txt` fica sem Disallow de propósito, para o crawler conseguir ler o noindex. Leave `public/robots.txt` unchanged.
    7. Edit `scripts/chrome-geometry.mjs` in two places only.
       - Add `const THANK_YOU_MARKER = "mesa_inscricao_confirmada";` right after `CONSENT_KEY`. Its comment says: `/obrigado` só tem zona de conversão no estado confirmado, que é o estado medido; a landing não é afetada.
       - In `runCase`, extend the storage `cdp.evaluate` template so that, after the consent `try{…}catch(e){};`, it appends ``try{if(/^\\/obrigado\\/?$/.test(location.pathname))sessionStorage.setItem(${JSON.stringify(THANK_YOU_MARKER)},"1")}catch(e){};`` before the final `1`. The existing `Page.reload` then renders the confirmed state.
       - Add one usage line to the header comment: `node scripts/chrome-geometry.mjs http://127.0.0.1:4334/obrigado/`.
       - Change nothing else: no viewport, mode or assertion changes.
    8. Run `bunx biome check --write src/pages/obrigado.astro astro.config.mjs scripts/chrome-geometry.mjs`, then CHECK.

### Phase 2 gate

- [ ] **G2.1** — T2.1 met its acceptance with evidence
  CHECK: `bun run build >/dev/null 2>&1 && f=dist/client/obrigado/index.html && test -f "$f" && rg -qF '<meta name="robots" content="noindex, nofollow"' "$f" && [ "$(rg -o '<h1[ >]' "$f" | wc -l)" -eq 1 ] && [ "$(rg -o 'data-thank-you-state="confirmed"[^>]*>' "$f" | wc -l)" -ge 2 ] && [ "$(rg -o 'data-thank-you-state="confirmed"[^>]*>' "$f" | wc -l)" -eq "$(rg -o 'data-thank-you-state="confirmed"[^>]*\shidden(="")?(\s[^>]*)?>' "$f" | wc -l)" ] && ! rg -q 'data-thank-you-state="neutral"[^>]*\shidden(="")?(\s[^>]*)?>' "$f" && rg -q 'CeAhWrPt7D7G7rpHy0uFSY\?s=cl&(amp;)?p=i&(amp;)?mlu=4&(amp;)?ilr=4' "$f" && rg -qF 'href="/#inscricao"' "$f" && ! rg -q '/obrigado' dist/client/sitemap-0.xml && rg -qF '/termos/' dist/client/sitemap-0.xml && ! rg -q 'prerender|client:|ClientRouter|location\.(search|hash)|URLSearchParams|chat\.whatsapp\.com' src/pages/obrigado.astro && ! rg -q '#[0-9a-fA-F]{3,8}\b' src/pages/obrigado.astro && [ "$(rg -c 'mesa_inscricao_confirmada' scripts/chrome-geometry.mjs)" -eq 1 ] && glog=$(mktemp) && llog=$(mktemp) && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; node scripts/chrome-geometry.mjs http://127.0.0.1:4334/obrigado/ >"$glog" 2>&1; grc=$?; node scripts/chrome-geometry.mjs http://127.0.0.1:4334/ >"$llog" 2>&1; lrc=$?; kill "$srv"; cat "$glog" "$llog"; [ "$grc" -eq 0 ] && [ "$lrc" -eq 0 ] && rg -q 'GEOMETRIA OK' "$glog" && rg -q 'GEOMETRIA OK' "$llog" && echo T2.1_OK; }`
  EXPECT: `T2.1_OK`
  EVIDENCE: pending
- [ ] **G2.2** — the project still type-checks and lints as a whole
  CHECK: `./node_modules/.bin/astro check && bun run lint && echo G2.2_OK`
  EXPECT: `G2.2_OK`
  EVIDENCE: pending
- [ ] **G2.3** — nothing outside the cumulative Owns through Phase 2 changed and the preexisting dirty README is byte-identical
  CHECK: `test -z "$( { git diff --name-only --no-renames -z ac0521f --; git ls-files --others --exclude-standard -z; } | tr '\0' '\n' | sort -u | grep -vxF -e .codex/rules/README.md -e docs/plans/2026-09-24-pagina-obrigado/spec.md -e docs/plans/2026-09-24-pagina-obrigado/PLAN.md -e src/content.config.ts -e src/content/products/aula-semanal.json -e src/lib/thank-you.ts -e src/pages/obrigado.astro -e astro.config.mjs -e scripts/chrome-geometry.mjs )" && [ "$(git hash-object .codex/rules/README.md)" = 01113d96ead02d092843a0248609a421fe9929f7 ] && echo G2.3_SCOPE_OK`
  EXPECT: `G2.3_SCOPE_OK`
  EVIDENCE: pending
- [ ] **G2.4** — the DOM contract and marker bundle Phase 3 Needs exist in the build
  CHECK: `bun run build >/dev/null 2>&1 && f=dist/client/obrigado/index.html && rg -q 'data-thank-you-root' "$f" && rg -q 'id="obrigado-title"' "$f" && rg -q 'data-thank-you-cta' "$f" && rg -q 'data-thank-you-back' "$f" && rg -q 'data-cro="success_join_group"' dist/client/index.html && [ "$(rg -l 'mesa_inscricao_confirmada' dist/client | wc -l)" -ge 1 ] && echo G2.4_OK`
  EXPECT: `G2.4_OK`
  EVIDENCE: pending

## Phase 3 — Teste CDP (RED) → formulário (GREEN) e gates finais  [SEQUENTIAL]

- [ ] **T3.1** — Specify the flow in check-form-states and observe it RED, then navigate from confirmLead and fix the in-page group CTA contrast until GREEN (R2, R3, R4, R7, R10)
  Owns: scripts/check-form-states.mjs, src/components/landing/RegistrationForm.astro
  Needs: T1.1 (reads: registration.successState.group rendered in-page as a[data-cro="success_join_group"]), T1.2 (reads: THANK_YOU_PATH, THANK_YOU_MARKER_KEY and THANK_YOU_MARKER_VALUE), T2.1 (reads: DOM contract at /obrigado — data-thank-you-root, data-thank-you-state, h1#obrigado-title, data-thank-you-cta, data-thank-you-back)
  Acceptance: RED primeiro — com `RegistrationForm.astro` ainda idêntico a `ac0521f`, o script adaptado sai ≠ 0 com `ESTADOS FALHOU`, imprime `FAIL  sucesso: navegou para /obrigado` e `FAIL  storage bloqueado: CTA do grupo in-page com contraste ≥ 4.5:1`, toda linha `FAIL` pertence à allowlist (`sucesso: `, `recarga: `, `opcionais: inscrição confirmada`, `storage bloqueado: CTA do grupo in-page com contraste`) e passam as labels de falha (`503`/`sem prova`/`HTML`/`sem persisted` `: sem navegação e sem marcador`), `storage bloqueado: sucesso in-page sem navegação`, `acesso direto: estado neutro sem convite do grupo`, `página confirmada: CTA do grupo com rótulo e href exatos` e as nove labels `<WxH>:` em 1440x1000, 768x1024 e 390x844; GREEN depois — `confirmLead` grava o marcador em `try/catch` e faz um único push de `lead_submit`, com `eventCallback`/`eventTimeout` só quando o marcador foi gravado; mantém `fireGa4Lead` e `cro("form_submit_success")`; navega uma vez com `window.location.assign(THANK_YOU_PATH)`; o literal `lead_submit` aparece em uma só linha do formulário; uma regra `<style>` com escopo do componente dá a `[data-cro="success_join_group"]` o texto `var(--color-navy)`, sem tocar `.btn-whatsapp` global; nenhuma linha alterada contra `ac0521f` toca `durableLeadId`, `readJson`, `STORE_CODES`, `CLIENT_TIMEOUT_MS` ou `fail`; o gate de PII da fonte passa; o mesmo script sai 0 com `ESTADOS OK`, nenhuma linha `FAIL` e todas as labels novas em `PASS`
  Agent: graph-powers:frontend-specialist · Skill: webapp-testing · Effort: design
  TDD: required
  CHECK: `bun run check:pii && s=scripts/check-form-states.mjs && f=src/components/landing/RegistrationForm.astro && rg -qF 'sucesso: navegou para /obrigado' "$s" && rg -qF 'storage bloqueado: CTA do grupo in-page com contraste' "$s" && rg -qF 'success_join_group' "$s" && rg -qF 'mesa_inscricao_confirmada' "$s" && rg -q 'location\.assign\(THANK_YOU_PATH\)' "$f" && [ "$(rg -c 'lead_submit' "$f")" = "1" ] && rg -q 'eventCallback\?: \(\) => void' "$f" && rg -q '\[data-cro="success_join_group"\]' "$f" && [ -z "$(git diff -U0 ac0521f -- "$f" | rg '^[-+][^-+]' | rg 'durableLeadId|readJson|STORE_CODES|CLIENT_TIMEOUT_MS|const fail =|fail\(')" ] && bun run build >/dev/null 2>&1 && log=$(mktemp) && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; node scripts/check-form-states.mjs http://127.0.0.1:4334/ >"$log" 2>&1; rc=$?; kill "$srv"; cat "$log"; [ "$rc" -eq 0 ] && ! rg -q '^FAIL' "$log" && rg -q '^PASS  sucesso: navegou para /obrigado' "$log" && rg -q '^PASS  sucesso: estado confirmado visível, neutro oculto, um h1' "$log" && rg -q '^PASS  sucesso: lead_submit uma vez com lead_id do servidor' "$log" && rg -q '^PASS  sucesso: sem PII em eventos, URL e sessionStorage' "$log" && rg -q '^PASS  recarga: estado confirmado mantido na mesma aba' "$log" && rg -q '^PASS  503: sem navegação e sem marcador' "$log" && rg -q '^PASS  sem persisted: sem navegação e sem marcador' "$log" && rg -q '^PASS  storage bloqueado: sucesso in-page sem navegação' "$log" && rg -q '^PASS  storage bloqueado: CTA do grupo in-page com contraste' "$log" && rg -q '^PASS  acesso direto: estado neutro sem convite do grupo' "$log" && rg -q '^PASS  página confirmada: CTA do grupo com rótulo e href exatos' "$log" && [ "$(rg -c '^PASS  (1440x1000|768x1024|390x844): ' "$log")" -eq 9 ] && rg -q '^ESTADOS OK' "$log" && echo T3.1_OK; }`
  EXPECT: `T3.1_OK`
  EVIDENCE: pending
  Steps:
    1. Read `scripts/check-form-states.mjs` completely. Keep the CDP plumbing, the `check()` output format (`PASS  <label>` / `FAIL  <label>`), every failure-branch, consent and payload assertion, and the final `ESTADOS OK`/`ESTADOS FALHOU` line. The server is `python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client` over a fresh `bun run build`; it redirects `/obrigado` to `/obrigado/`, so match paths with `/^\/obrigado\/?$/`. Do not edit `src/components/landing/RegistrationForm.astro` before Step 14 records RED.
    2. Add constants: `MARKER = "mesa_inscricao_confirmada"` (comment: literal repeated from `src/lib/thank-you.ts` because `.mjs` cannot import `.ts`), `INVITE = "https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4"`, `CTA_LABEL = "Entrar no grupo vip!"`, `THANK_YOU_RE = /^\/obrigado\/?$/`, `PII_RE = /qa@exemplo|QA Teste|62999990909|lead_name|lead_email|lead_phone/`, and a `contrast(fg, bg)` helper evaluated in the page: parse the computed `rgb()`/`rgba()` channels, linearize each channel with the WCAG 2.x formula (`c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4`), `L = 0.2126R + 0.7152G + 0.0722B`, ratio `(Lmax+0.05)/(Lmin+0.05)`.
    3. Rewrite `fill` so it returns right after the click (no internal wait — navigation would destroy the awaited context). Keep the substring `set("experience","De 1 a 3 anos"); set("revenue","De R$ 5 mil a R$ 10 mil");` and `c.checked=true` so the existing `.replace` variants still work. Before the click, mirror events into `sessionStorage.__qa_events` so they survive same-tab navigation (JSON drops the `eventCallback` function):
       ```js
       const S=sessionStorage, SET=Storage.prototype.setItem;
       const rec=(e)=>{try{const a=JSON.parse(S.getItem("__qa_events")||"[]");a.push(e);SET.call(S,"__qa_events",JSON.stringify(a));}catch{}};
       window.__dl=[]; window.dataLayer=window.dataLayer||[];
       const orig=window.dataLayer.push.bind(window.dataLayer);
       window.dataLayer.push=(o)=>{window.__dl.push(o);rec({dl:o});return orig(o);};
       window.__ga=[]; window.gtag=(...a)=>{window.__ga.push(a);rec({ga:a});};
       ```
       Add `fillBlocked`: the same fill plus, after `SET` is captured, `Storage.prototype.setItem=function(k,v){if(k==="mesa_inscricao_confirmada")throw new DOMException("bloqueado","SecurityError");return SET.call(this,k,v);};`.
    4. Every form scenario runs the same way.
       - Setup: `Page.navigate` to BASE, sleep 2200 ms, `evalp("sessionStorage.clear(),1")`, then run the fill.
       - Success scenarios then poll up to 6000 ms, every 200 ms, with `evalp("({p:location.pathname,rs:document.readyState})")`, catching rejections from the destroyed context. They stop when the path matches `THANK_YOU_RE` and `rs === "complete"`, then sleep 500 ms. If the poll times out, measure the current page as it is; the labels below then FAIL with a detail line.
       - Failure scenarios sleep a fixed 3000 ms (above the 1500 ms fallback).
       - Callers that relied on the old internal 1200 ms wait, including the no-consent block, now sleep explicitly.
    5. Success `201 persisted:true` replaces the old in-page labels (`sucesso: painel de sucesso visível`, `form escondido`, `erro escondido`, `fallback alternativo escondido`, `lead_submit com lead_id do servidor`, `SEM PII no dataLayer`, `generate_lead disparado`). Emit these exact labels:
       - `sucesso: navegou para /obrigado`: the path matches, `location.search === ""` and `location.hash === ""`.
       - `sucesso: estado confirmado visível, neutro oculto, um h1`:
         - every `[data-thank-you-state="confirmed"]` is not hidden and every neutral one is hidden;
         - `document.querySelectorAll("h1").length === 1`;
         - the trimmed `h1.innerText` equals the confirmed span text and is non-empty.
       - `sucesso: lead_submit uma vez com lead_id do servidor`: exactly one `dl.event === "lead_submit"` in `__qa_events`, with `lead_id === "lead_abc123"`.
       - `sucesso: generate_lead e form_submit_success uma vez cada`: exactly one `ga[1] === "generate_lead"` and one `ga[1] === "form_submit_success"`.
       - `sucesso: sem PII em eventos, URL e sessionStorage`:
         - `PII_RE` matches none of the events JSON, `location.href` and `JSON.stringify(Object.entries(sessionStorage))`;
         - `sessionStorage.getItem(MARKER) === "1"`.
       - Keep the `payload:` checks and `analytics: sem qualificadores`, now applied to the events JSON.
    6. Then `Page.reload` and sleep 2200 ms. Emit `recarga: estado confirmado mantido na mesma aba`: confirmed visible, neutral hidden.
    7. `201 sem qualificadores`: `opcionais: inscrição confirmada` now means navigated with confirmed visible; keep `opcionais: profession omitido`.
    8. Failure scenarios (503, sem prova, HTML, `lead_legacy`): keep every existing assertion and add `<prefix>: sem navegação e sem marcador` (`location.pathname === "/"` and `sessionStorage.getItem(MARKER) === null`) with prefixes `503`, `sem prova`, `HTML`, `sem persisted`.
    9. Run `fillBlocked` + `201 persisted:true` and wait 3000 ms. Emit:
       - `storage bloqueado: sucesso in-page sem navegação`: path `/`, `#registration-success` not hidden, form hidden.
       - `storage bloqueado: lead_submit e generate_lead uma vez`: counted from `window.__dl`/`window.__ga`.
       - `storage bloqueado: CTA do grupo in-page com contraste ≥ 4.5:1`:
         - `a[data-cro="success_join_group"]` exists and `getClientRects().length > 0`;
         - `getAttribute("href") === INVITE`;
         - `contrast(getComputedStyle(a).color, getComputedStyle(a).backgroundColor) >= 4.5`;
         - the detail line prints the ratio with two decimals.
    10. Direct access:
        - Navigate to BASE and run `sessionStorage.clear()`.
        - Navigate to `new URL("/obrigado", BASE).href` and sleep 2200 ms.
        - Emit `acesso direto: estado neutro sem convite do grupo`:
          - the neutral state is visible and the confirmed state hidden;
          - there is one `h1`, whose trimmed `innerText` equals the neutral span text;
          - every `a[href*="chat.whatsapp.com"]` has `getClientRects().length === 0`;
          - `a[data-thank-you-back]` has `getAttribute("href") === "/#inscricao"`.
    11. Confirmed page, independent of the form:
        - Navigate to BASE and run `evalp('sessionStorage.clear(); sessionStorage.setItem("mesa_inscricao_confirmada","1"); 1')`.
        - Navigate to `/obrigado` and sleep 2200 ms.
        - Emit `página confirmada: CTA do grupo com rótulo e href exatos`: `a[data-thank-you-cta]` has `getAttribute("href") === INVITE`, trimmed text `=== CTA_LABEL`, `target === "_blank"`, and a `rel` containing `noopener` and `noreferrer`.
    12. Responsive block, last, still on the seeded confirmed page:
        - Call `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`.
        - For `{1440,1000,mobile:false}`, `{768,1024,mobile:true}` and `{390,844,mobile:true}`, set `Emulation.setDeviceMetricsOverride`, run `Page.reload` and sleep 2200 ms.
        - Emit these labels with the `WxH` prefix:
          - `sem overflow horizontal`: `documentElement.scrollWidth <= innerWidth`.
          - `lockup e fundo renderizados`: `[data-thank-you-root] .mesa-mark img` has width > 0, and `[data-thank-you-root] picture img` has `complete` and `naturalWidth > 0`.
          - `CTA com foco visível via Tab`:
            - run `scrollTo(0,0)` and blur the active element;
            - send up to 40 Tab presses with `Input.dispatchKeyEvent` keyDown/keyUp (`key:"Tab"`, `code:"Tab"`, `windowsVirtualKeyCode:9`), stopping when `document.activeElement` matches `[data-thank-you-cta]`;
            - then require computed `outlineStyle !== "none"` and `parseFloat(outlineWidth) >= 2`.
        - Cookie/float/CTA intersection and hit-test are not repeated here: `check:geometry` on `/obrigado/` (T2.1, G3.5) owns them.
    13. Update the header comment to list the new scenarios and the static-server usage. Run `bunx biome check --write scripts/check-form-states.mjs`.
    14. RED — with the form still byte-identical to `ac0521f`, run exactly:
        ```bash
        git diff --quiet ac0521f -- src/components/landing/RegistrationForm.astro && bun run build >/dev/null 2>&1 && log=$(mktemp) && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; node scripts/check-form-states.mjs http://127.0.0.1:4334/ >"$log" 2>&1; rc=$?; kill "$srv"; cat "$log"; [ "$rc" -ne 0 ] && rg -q '^ESTADOS FALHOU' "$log" && rg -q '^FAIL  sucesso: navegou para /obrigado' "$log" && rg -q '^FAIL  storage bloqueado: CTA do grupo in-page com contraste' "$log" && [ -z "$(rg '^FAIL  ' "$log" | rg -v '^FAIL  (sucesso: |recarga: |opcionais: inscrição confirmada|storage bloqueado: CTA do grupo in-page com contraste)')" ] && rg -q '^PASS  503: sem navegação e sem marcador' "$log" && rg -q '^PASS  sem persisted: sem navegação e sem marcador' "$log" && rg -q '^PASS  storage bloqueado: sucesso in-page sem navegação' "$log" && rg -q '^PASS  acesso direto: estado neutro sem convite do grupo' "$log" && rg -q '^PASS  página confirmada: CTA do grupo com rótulo e href exatos' "$log" && [ "$(rg -c '^PASS  (1440x1000|768x1024|390x844): ' "$log")" -eq 9 ] && echo T3.1_RED_OK; }
        ```
        It must print `T3.1_RED_OK`. Paste into EVIDENCE, under `RED:`, the command, `FAIL  sucesso: navegou para /obrigado`, `FAIL  storage bloqueado: CTA do grupo in-page com contraste ≥ 4.5:1` (with the ratio) and `ESTADOS FALHOU`. The leading `git diff --quiet` proves the form was still untouched.
        - A `FAIL` outside the allowlist caused by this script: fix the script and rerun Step 14.
        - A page-level label failing (`acesso direto`, `página confirmada`, `<WxH>:`): stop and return BLOCKED naming the label. `src/pages/obrigado.astro` belongs to T2.1.
        - If `git diff --quiet` fails because the form was already edited, stop and return BLOCKED: RED can no longer be observed honestly.
    15. Read `src/components/landing/RegistrationForm.astro:255-290`, `:333-340`, `:363-390`, `:555-564`, `:597-624`, `:683-711`; confirm `confirmLead` pushes `lead_submit` once and `fail` owns every non-durable outcome.
    16. Add to the `<script>` import block, after the attribution import: `import { THANK_YOU_MARKER_KEY, THANK_YOU_MARKER_VALUE, THANK_YOU_PATH } from "../../lib/thank-you";`.
    17. Change only the type at `:384` to `type AnalyticsEvent = { event: string; lead_id?: string; eventCallback?: () => void; eventTimeout?: number } & NoPii;` — no other key.
    18. Replace `confirmLead` (`:597-608`) with this, keeping the existing PII comment above the push and adding no other `lead_submit` literal (not even in comments):
        ```ts
        // Tempo máximo para o GTM confirmar o evento antes de sair da página; sem
        // GTM (bloqueador/offline) a reserva navega do mesmo jeito.
        const NAV_FALLBACK_MS = 1500;

        const confirmLead = (leadId: string) => {
        	setState("confirmed");
        	setStatus("", false);
        	const w = window as WindowWithTrackers;
        	w.dataLayer = w.dataLayer || [];
        	// Marcador sem PII (só "1"). Se o storage lança, o sucesso fica no painel in-page.
        	let canNavigate = false;
        	try {
        		sessionStorage.setItem(THANK_YOU_MARKER_KEY, THANK_YOU_MARKER_VALUE);
        		canNavigate = true;
        	} catch {
        		/* storage bloqueado: sem navegação */
        	}
        	let navigated = false;
        	const go = () => {
        		if (navigated) return;
        		navigated = true;
        		window.location.assign(THANK_YOU_PATH);
        	};
        	// Só o id do lead. Nome/e-mail/telefone NUNCA entram no dataLayer — o
        	// match do Meta já acontece hasheado no servidor (meta-capi.ts).
        	w.dataLayer.push({
        		event: "lead_submit",
        		lead_id: leadId,
        		...(canNavigate ? { eventCallback: go, eventTimeout: NAV_FALLBACK_MS } : {}),
        	});
        	fireGa4Lead();
        	cro("form_submit_success");
        	if (successEl) reveal(successEl);
        	if (canNavigate) setTimeout(go, NAV_FALLBACK_MS);
        };
        ```
        The marker is written before the push because the callback must travel in that same single push; a second push would duplicate the event (REVIEW.md B5).
    19. Append one component-scoped `<style>` block at the end of the file (Astro scopes it and emits it outside Tailwind's utilities layer, so it wins over `@utility btn-whatsapp` without `!important`):
        ```astro
        <style>
        	/* Convite do grupo no painel in-page: texto navy sobre o verde do WhatsApp
        	   (≈ 8,0:1; hover ≈ 6,4:1). O texto claro herdado de .btn-whatsapp fica
        	   ≈ 1,9:1 e reprova WCAG 1.4.3. O .btn-whatsapp global segue intocado. */
        	[data-cro="success_join_group"] {
        		color: var(--color-navy);
        	}
        </style>
        ```
    20. Do not edit markup, `durableLeadId`, `readJson`, `STORE_CODES`, `fail`, `CLIENT_TIMEOUT_MS` or the submit handler.
    21. Run `bunx biome check --write src/components/landing/RegistrationForm.astro`.
    22. GREEN: run CHECK. It must print `T3.1_OK`. Paste into EVIDENCE, under `GREEN:` and next to the RED block from Step 14, `PASS  sucesso: navegou para /obrigado`, `PASS  storage bloqueado: CTA do grupo in-page com contraste ≥ 4.5:1` (with the ratio) and `ESTADOS OK`.

### Phase 3 gate

- [ ] **G3.1** — T3.1 turned its recorded RED into GREEN with evidence
  CHECK: `bun run check:pii && s=scripts/check-form-states.mjs && f=src/components/landing/RegistrationForm.astro && rg -qF 'sucesso: navegou para /obrigado' "$s" && rg -qF 'storage bloqueado: CTA do grupo in-page com contraste' "$s" && rg -qF 'success_join_group' "$s" && rg -qF 'mesa_inscricao_confirmada' "$s" && rg -q 'location\.assign\(THANK_YOU_PATH\)' "$f" && [ "$(rg -c 'lead_submit' "$f")" = "1" ] && rg -q 'eventCallback\?: \(\) => void' "$f" && rg -q '\[data-cro="success_join_group"\]' "$f" && [ -z "$(git diff -U0 ac0521f -- "$f" | rg '^[-+][^-+]' | rg 'durableLeadId|readJson|STORE_CODES|CLIENT_TIMEOUT_MS|const fail =|fail\(')" ] && bun run build >/dev/null 2>&1 && log=$(mktemp) && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; node scripts/check-form-states.mjs http://127.0.0.1:4334/ >"$log" 2>&1; rc=$?; kill "$srv"; cat "$log"; [ "$rc" -eq 0 ] && ! rg -q '^FAIL' "$log" && rg -q '^PASS  sucesso: navegou para /obrigado' "$log" && rg -q '^PASS  sucesso: estado confirmado visível, neutro oculto, um h1' "$log" && rg -q '^PASS  sucesso: lead_submit uma vez com lead_id do servidor' "$log" && rg -q '^PASS  sucesso: sem PII em eventos, URL e sessionStorage' "$log" && rg -q '^PASS  recarga: estado confirmado mantido na mesma aba' "$log" && rg -q '^PASS  503: sem navegação e sem marcador' "$log" && rg -q '^PASS  sem persisted: sem navegação e sem marcador' "$log" && rg -q '^PASS  storage bloqueado: sucesso in-page sem navegação' "$log" && rg -q '^PASS  storage bloqueado: CTA do grupo in-page com contraste' "$log" && rg -q '^PASS  acesso direto: estado neutro sem convite do grupo' "$log" && rg -q '^PASS  página confirmada: CTA do grupo com rótulo e href exatos' "$log" && [ "$(rg -c '^PASS  (1440x1000|768x1024|390x844): ' "$log")" -eq 9 ] && rg -q '^ESTADOS OK' "$log" && echo T3.1_OK; }`
  EXPECT: `T3.1_OK`
  EVIDENCE: pending
- [ ] **G3.2** — the project still type-checks and lints as a whole
  CHECK: `./node_modules/.bin/astro check && bun run lint && echo G3.2_OK`
  EXPECT: `G3.2_OK`
  EVIDENCE: pending
- [ ] **G3.3** — nothing outside the plan Owns changed; README byte-identical; LF only; no whitespace errors
  CHECK: `test -z "$( { git diff --name-only --no-renames -z ac0521f --; git ls-files --others --exclude-standard -z; } | tr '\0' '\n' | sort -u | grep -vxF -e .codex/rules/README.md -e docs/plans/2026-09-24-pagina-obrigado/spec.md -e docs/plans/2026-09-24-pagina-obrigado/PLAN.md -e src/content.config.ts -e src/content/products/aula-semanal.json -e src/lib/thank-you.ts -e src/pages/obrigado.astro -e astro.config.mjs -e scripts/chrome-geometry.mjs -e scripts/check-form-states.mjs -e src/components/landing/RegistrationForm.astro )" && [ "$(git hash-object .codex/rules/README.md)" = 01113d96ead02d092843a0248609a421fe9929f7 ] && git diff --check ac0521f -- src/content.config.ts src/content/products/aula-semanal.json astro.config.mjs scripts/chrome-geometry.mjs scripts/check-form-states.mjs src/components/landing/RegistrationForm.astro && ! rg -l $'\r' src/lib/thank-you.ts src/pages/obrigado.astro src/content.config.ts src/content/products/aula-semanal.json astro.config.mjs scripts/chrome-geometry.mjs scripts/check-form-states.mjs src/components/landing/RegistrationForm.astro && echo G3.3_SCOPE_OK`
  EXPECT: `G3.3_SCOPE_OK`
  EVIDENCE: pending
- [ ] **G3.4** — build, PII (source and bundle) and Vercel upload set pass
  CHECK: `bun run build >/dev/null 2>&1 && bun run check:pii && bun scripts/check-no-pii-analytics.ts --dist && bun run verify:vercel && [ -z "$(git ls-files --others --ignored --exclude-from=.vercelignore -- src/pages/obrigado.astro src/lib/thank-you.ts)" ] && echo G3.4_OK`
  EXPECT: `G3.4_OK`
  EVIDENCE: pending
- [ ] **G3.5** — serial final browser gates, second geometry round included (test runner NOT DECLARED; the project's CDP gates substitute it)
  CHECK: `bun run build >/dev/null 2>&1 && { python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client >/dev/null 2>&1 & srv=$!; sleep 1; bun run check:states http://127.0.0.1:4334/ && bun run check:geometry http://127.0.0.1:4334/ && bun run check:geometry http://127.0.0.1:4334/obrigado/; rc=$?; kill "$srv"; [ "$rc" -eq 0 ] && echo G3.5_OK; }`
  EXPECT: `G3.5_OK`
  EVIDENCE: pending
- [ ] **G3.6** — REVIEW.md §3 mechanical checks stay clean (Markdown excluded; B1 included)
  CHECK: `! rg -n 'bg-\[#|text-\[#|border-\[#' src -g '!*.md' && [ -z "$(rg -n 'prerender = false' src/pages | rg -v 'src/pages/(api|admin)/')" ] && ! rg -n 'console\.log|debugger' src -g '!*.md' && [ -z "$(rg -n 'wa\.me/' src -g '*.astro' -g '*.ts' -g '*.tsx' | rg -v 'lib/whatsapp.ts')" ] && ! rg -nP '[\x{1F300}-\x{1FAFF}]' src/components src/pages && ! rg -n 'ClientRouter' src -g '!*.md' && ! grep -nvE '^(#|$|/|!|node_modules$|\.astro$|dist$|\.cache$|\.env|\*\.log$|\.DS_Store$|Thumbs\.db$|\.vscode$|\.idea$)' .vercelignore && echo G3.6_OK`
  EXPECT: `G3.6_OK`
  EVIDENCE: pending

## Verification

- **Gates declarados em `tooling.commands`:** `./node_modules/.bin/astro check`, `bun run lint` e
  `bun run build` (G*.2, G3.4). `tooling.testRunner` é `null`: **NOT DECLARED**, nunca reportado
  como aprovado. Os gates CDP do REVIEW.md §1 o substituem, com ciclo RED (T3.1 Step 14, formulário
  ainda em `ac0521f`) → GREEN (CHECK de T3.1 e G3.1), e G3.5 (segunda rodada de geometria).
- **Negativos do projeto** (`.claude/rules/lead-e-pii.md`):
  - `bun run check:states`;
  - `bun run check:pii` e `bun scripts/check-no-pii-analytics.ts --dist`;
  - `bun run check:geometry` em `/` e em `/obrigado/`;
  - `bun run verify:vercel`;
  - as checagens mecânicas do REVIEW.md §3, incluindo B1 (G3.6).
- **Baseline mecânico medido na hora do plano, só leitura:** as sete checagens de G3.6 retornaram
  sem acerto em `ac0521f`. Com `-g '!*.md'`, `src/AGENTS.md:35` deixa de ser falso positivo de
  `ClientRouter`.
- **Visual A/B contra o Figma: NOT AVAILABLE** até existirem frames legíveis. A evidência visual
  automatizada vem de três fontes:
  - as labels `<WxH>:` de T3.1 (overflow, lockup/fundo, foco) em 1440x1000, 768x1024 e 390x844;
  - `check:geometry` em `/obrigado/` (interseção + hit-test do CTA contra aviso de cookies e
    flutuante, antes e depois do consentimento, reduced motion e sem JS);
  - a label de contraste in-page.
- **Capturas** de `/obrigado` confirmado e neutro, feitas com `Skill("webapp-testing")` nos três
  viewports sobre `http://127.0.0.1:4334/`, ficam em
  `.graph-powers/logs/sdd/2026-09-24-pagina-obrigado/` (ignorado pelo Git). São **advisory**,
  para o usuário revisar, e não viram PASS.
- **Advisory:** `bun run lighthouse:audit http://127.0.0.1:4334`, que não bloqueia.
- **Produção:** só depois de P1 resolvida e de commit/push aprovados pelo usuário. Então conferir
  `lead_submit` no GTM Preview (F1). `bun run smoke` continua proibido sem autorização própria.
- **Pós-sucesso:** `/evolve auto`.

## Rollback

- **Regras gerais:**
  - não há commit entre fases; tudo vive na árvore de trabalho;
  - descartar é destrutivo e exige aprovação explícita do usuário;
  - todo comando abaixo nomeia paths explícitos e nunca inclui `.codex/rules/README.md`.
- **Phase 3:** `git restore --source=ac0521f -- src/components/landing/RegistrationForm.astro scripts/check-form-states.mjs`.
  - Devolve o sucesso in-page; sem marcador, `/obrigado` fica sempre neutra.
  - Restaurar só o formulário deixa o script adaptado de novo em RED, o que é esperado; para
    abandonar a navegação, restaurar os dois paths juntos.
- **Phase 2:** `git restore --source=ac0521f -- astro.config.mjs scripts/chrome-geometry.mjs` e
  remover `src/pages/obrigado.astro`.
- **Phase 1:** só depois da Phase 2.
  - `git restore --source=ac0521f -- src/content.config.ts src/content/products/aula-semanal.json`
    e remover `src/lib/thank-you.ts`, porque página e formulário dependem deles.
  - Restaurar o JSON remove o `group` e, com ele, o CTA in-page.
- **Depois de commit/push aprovados:** `git revert <sha>` com `AULAOTB_ALLOW_COMMIT=1`, e push
  com `AULAOTB_ALLOW_PUSH=1 AULAOTB_ALLOW_PUSH_MAIN=1` no mesmo comando, cada um no turno aprovado.
  Não há migração de dados; marcadores em abas de visitantes ficam inertes.

## Out of scope

| Item | Trigger que reabre |
|---|---|
| Novo endpoint, token/auth, verificação no servidor | usuário exigir confirmação entre dispositivos ou abas novas |
| SSR / `prerender = false` em `/obrigado`, `ClientRouter`/SPA, ilha React | nenhum — invariantes do projeto (B8) |
| Nova dependência (servidor de QA usa `python3 -m http.server`) | ferramenta do sistema indisponível no ambiente de QA |
| Nova coluna, destino do lead, env, IDs de tracking, `bun run smoke` | decisão explícita do usuário |
| Migração operacional Git/Vercel (Production Branch, verificação de deploy automático) | pré-condição P1, tarefa do controlador fora deste plano e do gauntlet |
| Redesign da landing; `.btn-whatsapp` global (painel de erro `:217`, lembrete `:292`) | usuário aprovar a correção de contraste global (F3) |
| `Disallow: /obrigado` no `robots.txt` | auditoria mostrar indexação apesar do `noindex` |
| Evento CRO no clique do CTA de `/obrigado` | usuário pedir rastreio desse clique |
| Fidelidade exata ao Figma / Visual A/B | frames Figma legíveis |
| Apagar o marcador após exibir | usuário querer que a recarga volte ao neutro |
| Atualizar `docs/planilha-leads.md` §4.2 | o texto deixar de ser verdadeiro (hoje continua: os cinco desfechos seguem cobertos) |

## Not yet specified

- **F1 — tags do GTM em produção.** Não se sabe como as tags do container GTM tratam `lead_submit`
  em produção, nem se atrasam o callback. O atraso é limitado pelo `eventTimeout` de 1500 ms.
  Resolve-se com o GTM Preview depois de P1 e de um deploy aprovado.
- **F2 — fidelidade visual aos frames 1080×628 e 390×837.** O Visual A/B está NOT AVAILABLE sem
  frames Figma legíveis. As capturas são advisory e ficam para revisão do usuário.
- **F3 — contraste preexistente de `.btn-whatsapp`.** O texto `#fafaf9` sobre verde (≈ 1,9:1)
  continua no painel de erro (`RegistrationForm.astro:217`) e no lembrete (`:292`). O lembrete só
  renderiza se `successState.reminderWhatsapp` existir, e ele está ausente no JSON hoje. O convite
  do grupo (`:279`), que este plano passa a renderizar, é corrigido localmente em T3.1. Corrigir o
  estilo global exige decisão do usuário e não bloqueia R1–R10.
