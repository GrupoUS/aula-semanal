# Plano — Issue #2: conversão, privacidade e atribuição da Aula OTB

## Context

A issue #1 entregou a landing: hero Sacha + Carol, cinco docentes, narrativa, aula em **09/09/2026 às 19h**, OTB Boston em **19–21/04/2027**, formulário, WhatsApp, grupo, calendário, SEO/legal e responsividade. A página live responde `200`, sem overflow e sem erro de console. **Esta issue não refaz a landing.**

O que sobrou são quatro furos verificados, cada um com evidência `path:line`:

1. **Conversão obstruída.** O banner de consentimento é `position: fixed` com `z-[60]` e cobre o submit no desktop (banner `889–1000` ∩ submit `947–995` em 1440×1000) e o CTA do hero no mobile (`627–764` ∩ `705–753` em 390×844). Já foi "corrigido" duas vezes por offset — `bottom-0` → `md:bottom-0` → `bottom: 5rem` — e quebrou nas duas.
2. **Confirmação falsa.** `RegistrationForm.astro:582-596`: no `catch`, o site chama `window.open(waFallback)` **depois de um `await`** (bloqueável por popup blocker) e em seguida `succeed()` incondicional. A pessoa lê "Inscrição confirmada!" sem prova de gravação nem de envio pelo WhatsApp. Pior: `fireGa4Lead()` roda no `catch`, então uma planilha fora do ar **infla a conversão do GA4**.
3. **PII crua em analytics.** `RegistrationForm.astro:568-575` empurra `lead_name`, `lead_email` e `lead_phone` para o `dataLayer`, observado pelo container GTM `GTM-MVQW6VLD` que carrega sem gate nenhum (`Layout.astro:137-141`).
4. **Atribuição v2 não comprovada.** `docs/aula-otb-changelog.md:164` registra literalmente: *"Não verificado ainda em produção: `migrar()` na planilha real e um lead ponta-a-ponta"*. Além disso, as colunas P/Q/R da planilha são **write-only** — painel, CSV e CRM recalculam a regra em TypeScript, cada um com um host diferente.

**Resultado pretendido:** conversão sem obstrução em qualquer viewport e qualquer scroll, estados de UI honestos, zero PII crua em qualquer sink de analytics/log, e a atribuição `instagram / bio / aula-otb-0909` validada ponta a ponta com evidência sanitizada.

---

## Decisões travadas (respondidas pelo usuário)

| # | Decisão |
|---|---|
| D1 | **Pilha inferior medida + limiar derivado.** O aviso de cookies entra a partir de `y ≥ T` (0px mobile/tablet, ~75px desktop) e ganha um botão "Preferências de cookies" no rodapé. |
| D2 | **Código + runbook agora.** Implemento tudo que é código; os passos na planilha ficam para o usuário executar com acompanhamento, por gate go/no-go. |
| D3 | **Painel lê o valor gravado.** `toLead_` passa a devolver P/Q/R, `API_VERSION` sobe para 3, e painel/CSV/CRM exibem o que a planilha guarda. |
| D4 | **GTM fica como está.** Remover a PII do `dataLayer` resolve o que a issue pede; a assimetria de consentimento do container vira decisão registrada, não mudança agora. |

## Fora de escopo (guard)

- Redesenho da landing, narrativa, oferta, datas, docentes ou credenciais.
- Trocar IDs de tracking, o endpoint de lead ou o carregamento do GTM.
- Enhanced conversions server-side do Google Ads (integração nova).
- `landingPath` de primeiro toque — **rejeitado**: regride o `event_source_url` da CAPI (`inscricao.ts:120-122`) e muda a semântica da coluna O no meio da campanha, sem benefício enquanto houver uma landing só.
- Reinscrição sem UTM preservar a origem original — contradiz `docs/planilha-leads.md:150`; anotar como follow-up.

## Aprovações que este plano consome

Declarar no commit; são arquivos protegidos ou mudanças de contrato:

| Item | Razão |
|---|---|
| `src/content.config.ts` | Cardinal #5 — copy de erro exige schema + JSON + leitor na mesma mudança. |
| `package.json`, `lefthook.yml`, `biome.json` | Registrar os gates novos (`check:pii`, `smoke`, `verify:vercel`) e trazer `scripts/` para o lint. |
| Revogar o "sucesso-no-erro" | Está documentado como decisão deliberada em `docs/aula-otb-changelog.md:302`, `docs/planilha-leads.md:216` e `docs/analise-a-issue-1-harmonic-fiddle.md:112`. Os três precisam ser reescritos no mesmo commit. |
| `API_VERSION` 2 → 3 | `docs/planilha-leads.md:168` diz `"version":2`; atualizar junto. |

---

# Fase 1 — Chrome inferior: pilha medida + limiar derivado

## Por que offset não resolve

Seja `vh` a altura da viewport, `H` a altura do chrome inferior, `B(e)` a base do elemento protegido em coordenadas de documento e `y` o `scrollY`:

```
e fica ocluído  ⟺  B(e) − y > vh − H  ⟺  y < B(e) + H − vh
```

Em `y = 0` isso vira `B(e) + H ≤ vh`:

| viewport | `B(e)` protegido | folga `vh − B(e)` | `H` viável |
|---|---|---|---|
| 390×844 | 753 (CTA do hero) | 91px | marginal |
| 1440×1000 | 995 (submit) | **5px** | **nenhum** |

Banda no topo não escapa — ela empurra `B(e)` para baixo em exatamente `H`, produzindo a mesma desigualdade. Os dois "consertos" anteriores foram tentativas de resolver uma equação insatisfazível; é por isso que quebraram duas vezes.

`y`, porém, é variável livre. A desigualdade vale para todo `y` se e somente se o chrome só existir a partir de `T = max(0, max(B(e) + H − vh))` — e `B(e)`, `H` e `vh` são todos mensuráveis em runtime. A garantia sai do eixo espacial (offsets, que envelhecem a cada mudança de copy/fonte/zoom) para o eixo de scroll, onde um escalar derivado substitui toda constante mágica.

## Três invariantes, três mecanismos

| | Invariante | Mecanismo | Por que é prova, não ajuste |
|---|---|---|---|
| **I1** | chrome nunca sobrepõe chrome | todos os fixos de baixo viram **filhos de um único container `fixed`**, em fluxo normal | caixa do CSS: blocos irmãos em fluxo normal não se sobrepõem. Somem `5rem`, `5.5rem` e a disputa `z-[60]` vs `z-50`. |
| **I2** | chrome nunca sobrepõe zona de conversão | pilha só aparece em `y ≥ T` | consequência algébrica direta da desigualdade. `T` se recalcula sozinho a cada mudança de layout. |
| **I3** | nada fica inacessível | `--bottom-stack-h` medido alimenta `body { padding-bottom }` **e** `html { scroll-padding-bottom }` | o padding cresce o scroll máximo em exatamente `H`; o `scroll-padding-bottom` faz o **próprio navegador** honrar a pilha em âncoras, `scrollIntoView` e na rolagem automática do Tab. |

`T` com a geometria de hoje: `≈0px` em 390×844 e 768×1024, `≈75px` em 1440×1000 (uma rolada de mouse). O limiar do CTA fixo (`0.8 × vh`) só pode ser **empurrado para depois**, nunca antecipado — comportamento de produto intacto.

## Mudanças

**`src/lib/consent.ts` (novo)** — `CONSENT_KEY`, `CONSENT_GRANTED`, `CONSENT_REVOKED`. Hoje o literal `otb_aula_cookie_consent` está triplicado (`CookieConsent.astro:22`, `Layout.astro:75`, e o script novo do `<head>`).

**`src/styles/global.css`** — em `:root` (fora do `@theme`, que poda variáveis não usadas):
- escala de empilhamento `--z-header: 50`, `--z-chrome: 55`, `--z-menu: 60`, `--z-progress: 70`. `.skip-link` fica fora da escala com `9999` de propósito (WCAG 2.4.1).
- `--bottom-stack-h: 0px` (medida de runtime, não token) e `--safe-bottom: env(safe-area-inset-bottom, 0px)`.
- `html:not(.js).has-bottom-chrome { --bottom-stack-h: 5rem }` — reserva sem JS.
- `html { scroll-padding-bottom: calc(var(--bottom-stack-h) + var(--safe-bottom) + 1rem) }` e `body { padding-bottom: calc(var(--bottom-stack-h) + var(--safe-bottom)) }`.
- `#bottom-chrome` = `position: fixed; inset-inline: 0; bottom: 0; display: flex; flex-direction: column; pointer-events: none`.
- `.chrome-row` colapsa por `grid-template-rows: 0fr → 1fr` com `visibility` + `pointer-events` no `.chrome-row-clip`. O split `clip` / `content` é estrutural: com `0fr` o clip mede `0`, então a altura natural tem que ser lida do neto.
- bloco `@media (prefers-reduced-motion: reduce)` com `transition: none` — mesmo padrão já usado por `.wa-float` e `[data-sticky-cta]`.

**`src/components/landing/CookieConsent.astro`** — perde `fixed`, `bottom-[calc(5rem+…)]`, `z-[60]` e `hidden`; vira `.chrome-row[data-chrome-row="consent"]`. O `<style>` inteiro (keyframes `consent-in`) some — a transição da linha é a entrada agora. Ganha `tabindex="-1"` e um listener para `[data-consent-open]`. Contrato com o `motion.ts`: este script é dono da **decisão** (`data-consent-pending` no `<html>`), o `motion.ts` é dono da **visibilidade**.

**`src/components/landing/MobileCTABar.astro`** — perde `fixed inset-x-0 bottom-0 z-50` e o `padding-bottom` inline; vira `.chrome-row[data-chrome-row="cta"]`.

**`src/components/shared/WhatsAppFloatingButton.astro`** — `bottom` passa a ser `calc(var(--bottom-stack-h) + var(--safe-bottom) + 1.5rem)`. O `<noscript>` com `5.5rem` some. A prop `hasBottomBar` — que o próprio componente já documenta como inócua (`:10-17`) — some.

**`src/layouts/Layout.astro`** — script inline no `<head>` que seta `.js` **e** `data-consent-pending` antes do primeiro paint (sem flash, sem CLS). `CookieConsent` e o slot `bottom-cta` entram dentro de `<div id="bottom-chrome">` depois do `<Footer />`. A prop `hasBottomBar` e o `pb-[calc(5rem+…)]` do body somem — o CSS é dono da reserva. `pageViewScript` passa a usar `CONSENT_KEY`; **o gate `choice === "revoked"` não muda**.

**`src/components/layout/Header.astro`** — z-index por token; `openMenu`/`closeMenu` inertizam `#bottom-chrome`. Hoje o `aria-modal="true"` é mentira: o `<header>` em `z-50` cria contexto de empilhamento, então o diálogo não consegue subir acima da pilha sozinho.

**`src/components/layout/Footer.astro`** — botão "Preferências de cookies" na `<nav>` legal (`:215-224`). Copy de chrome legal, fica fora do `productJson` pela mesma justificativa já escrita em `CookieConsent.astro:1-6`.

**`Hero.astro:144-151` e `RegistrationForm.astro:236-242`** — atributo `data-conversion-zone` nos dois botões. Só declaração, zero lógica.

**`src/scripts/motion.ts`** — nova primitiva `initBottomChrome()` substituindo a metade `stickyCta` de `initScroll` (`:161-163`). Mede altura pelo neto, posição por `offsetTop` acumulado (`getBoundingClientRect` mentiria: `[data-hero-fade]` translada até 46px), calcula `T`, publica `--bottom-stack-h`, e aplica `inert` nas linhas colapsadas. Remedição por `ResizeObserver` no **conteúdo** (que não anima), `resize`, `document.fonts.ready` e o evento `bottomchrome:change`. O `frame()` continua `O(1)` — leitura de layout só acontece em mudança de estado.

## A11y

- **Não é focus trap, de propósito.** É `role="region"`, não `dialog`. Trapar foco em região não-modal é falha de WCAG 2.1.2 e mente sobre a modalidade da página. O modelo do site é opt-out; o aviso informa, não bloqueia.
- `#bottom-chrome` continua sendo o último elemento do `<body>` — ordem do DOM = ordem visual (WCAG 1.3.2 / 2.4.3).
- Linhas colapsadas saem da ordem de tabulação via `inert` + `visibility: hidden`. **Isso corrige um bug que já existe**: hoje `translateY(100%)` deixa o CTA fixo focável fora da tela.
- Revelação **não rouba foco** (WCAG 3.2.1/3.2.5). O foco só se move quando a pessoa clica no botão do rodapé — e depois de dois `requestAnimationFrame`, porque focar elemento `inert` falha em silêncio.
- Sem `aria-live` na região: anúncio polite não solicitado no meio do scroll é ruído. Descoberta fica por conta do botão do rodapé.
- Esc não dispensa — teria que significar "aceitar" ou "recusar", e nenhum dos dois é defensável.

> **Achado incidental (registrar, não corrigir aqui):** `Layout.astro:145` não tem `viewport-fit=cover`, então **todo `env(safe-area-inset-bottom)` do repo avalia como `0` hoje**. As chamadas ficam (corretas no dia em que o `viewport-fit` entrar), mas não acredite que o tratamento de safe-area atual faça algo.

---

# Fase 2 — Estados honestos + zero PII

## Prova de persistência durável

```
res.ok && body.ok === true && body.persisted === true && typeof body.leadId === "string" && body.leadId.trim() !== ""
```

**Não usar `leadId.startsWith("lead_")` como checagem primária.** O prefixo nasce em `Code.gs:422-423` — detalhe de implementação de uma planilha que muda com um "Nova versão" no Apps Script, sem code review nem deploy deste repo. Acoplar o browser a ele transforma **toda gravação real em falha silenciosa na UI**. E ele não prova nada que `body.ok === true` já não prove: `inscricao.ts:138` só é alcançado depois de `captureLead()` resolver, e `captureLead` só resolve depois do `LockService` ter escrito a linha (`Code.gs:450-451,481,491`).

Aceitação transitória de **um release**: tolerar `body.persisted === undefined && leadId.startsWith("lead_")`, para o caso de function antiga responder a HTML novo servido do CDN. Marcar `// TRANSITÓRIO` grepável.

**Nunca cair para o `eventId`.** O `:561-566` atual é a raiz da falsa confirmação.

## Máquina de estados

`setState(next)` é o **único** escritor de DOM de estado. Hoje `submitting` (`:503`) e `submitBtn.disabled` (`:518-521`) **nunca resetam**, porque os dois caminhos terminam em `succeed()`, que esconde o form.

| Estado | `disabled` | label | `form.hidden` | `#registration-error` | `#registration-success` | `#form-whatsapp-alt` |
|---|---|---|---|---|---|---|
| `idle` | `false` | `submitLabel` | `false` | oculto | oculto | visível |
| `submitting` | **`true`** | `sendingLabel` | `false` | oculto | oculto | visível |
| `confirmed` | `false` | `submitLabel` | **`true`** | oculto | **visível + foco** | **oculto** |
| `failed` | `false` | `submitLabel` | `false` | **visível + foco** | oculto | **oculto** |

```
idle ──submit──▶ validating ──inválido──▶ idle
                     └──válido──▶ submitting
submitting ──durável──▶ confirmed  (TERMINAL)
submitting ──senão──▶ failed
failed ──"Tentar de novo" (type=submit)──▶ validating
failed ──input em qualquer campo──▶ idle
```

Resultado: **no máximo um link de WhatsApp da Laura visível por vez**, em qualquer estado. Hoje o link permanente de `:355-365` duplica o `successState.talkWhatsapp` no painel de sucesso.

Adicional: `AbortController` com 12s (acima do budget de 7s do store + folga da CAPI/webhook). Hoje não existe timeout — uma function pendurada deixa "Enviando..." para sempre.

**Ambiguidade `store_timeout`:** uma gravação que deu certo mas estourou o budget devolve 502 e a UI mostra erro. O Retry é seguro por construção — `capture` é upsert por e-mail, então a segunda tentativa devolve `created:false` + o mesmo `leadId` + `ok:true`, e confirma. Documentar no código.

## Painel de falha

Vive **dentro do `<form>`**, depois de `#form-status` e **depois** do botão primário na ordem do documento (para Enter num campo continuar ativando o primário, não o retry). Três razões: os dados digitados continuam na tela; o retry é `type="submit"` e reusa o mesmo handler; nada de `requestSubmit()` ou lógica duplicada.

- `role="alert"` (assertive) — distinto do `#form-status`, que é `role="status"` (polite, para "Revise os campos destacados").
- `aria-labelledby` + `tabindex="-1"` + `.focus({preventScroll:true})` — sem foco, o teclado não **chega** ao retry nem ao link.
- Link do WhatsApp é `<a href>` real, clicado pela **pessoa**. Nada de `window.open` depois de `await`.
- `border-error/40`, `bg-error/5`, `text-error` — derivados de `--color-error` no `@theme`, zero hex.
- `scrollIntoView` com `behavior: "auto"` sob `prefers-reduced-motion`.

**Mensagem do WhatsApp fica estática, sem os dados digitados.** Colocar nome/e-mail/telefone no `?text=` grava PII no histórico do navegador e na barra de endereços (dispositivo compartilhado é a norma no público da landing), expõe na cadeia de redirect `wa.me → api.whatsapp.com → web.whatsapp.com`, e persiste depois do incidente — enquanto um evento de analytics é efêmero. O ganho é quase nulo porque **o lead já foi salvo por outro canal**: em toda falha que o servidor viu, `reportDegraded()` (`inscricao.ts:53-70`) já disparou o webhook e o CRM com o contato completo. Continua começando com `"Olá, Laura!"` e é construída com `whatsappUrlWithText()`.

## Conteúdo

`src/content.config.ts` — `errorMessage` (declarado em `:249`, ausente do JSON, lido por ninguém) vira `errorState` **obrigatório**: `{ title, body, retryLabel, whatsapp{label,message}, validationSummary, validation{name,email,phone,consent} }`. As mensagens de validação hoje são strings hardcoded no `<script>` (`:462-467`) — violação de Cardinal #5 que aproveitamos para fechar.

Copy **PROPOSTA** (precisa da validação da Laura / voz Dra. Sacha):

> **Título:** "Não conseguimos confirmar sua inscrição"
> **Corpo:** "Seus dados continuam preenchidos aqui — nada foi perdido. Tente enviar de novo. Se não funcionar, fale com a Laura no WhatsApp que ela garante sua vaga manualmente."
> **Retry:** "Tentar enviar de novo" · **WhatsApp:** "Garantir minha vaga no WhatsApp"

## Servidor — `src/pages/api/inscricao.ts`

- **Parar de vazar nomes de env no 503** (`:91-98`). Nada consome `missing` da resposta HTTP — `admin/leads.astro:166` chama `getLeadStoreConfigStatus()` direto, atrás de auth. Vazar `["SHEETS_WEBAPP_URL", …]` para caller anônimo é reconhecimento de infra de graça. Os nomes vão para o `console.error`.
- **`persisted: true` no 201** (`:138`) e `persisted: false` no 502 — contrato explícito em vez de o cliente inferir pelo formato do id. Aditivo e retrocompatível.
- `reportDegraded` (`:57-61`) já é modelar (só `code`, `landingPath`, `emailDomain`) — **não mexer**, e virar caso positivo na fixture do gate.

## Contrato de analytics corrigido

| Momento | Canal | Evento | Payload | Muda? |
|---|---|---|---|---|
| 1º focus | `cro()` | `form_start` | `{}` | não |
| clique no primário | `data-cro` | `form_submit_click` | `{}` | não |
| validação falhou | `cro()` | **`form_validation_error`** | `{ fields: "email,phone" }` — só **nomes** | **novo** |
| gravação provada | `dataLayer` | `lead_submit` | `{ event, lead_id }` | **remove `lead_name`/`lead_email`/`lead_phone`** |
| gravação provada | `gtag` | `generate_lead` | `{}` | **passa a disparar SÓ aqui** |
| gravação provada | `cro()` | `form_submit_success` | `{}` | não |
| endpoint não confirmou | `cro()` | `form_submit_error` | `{ reason, store_code? }` — allowlist fechada, nada de `err.message` cru | **passa a carregar motivo** |
| clique em retry | `data-cro` | **`form_submit_retry`** | `{}` | **novo** |
| clique no WhatsApp do erro | `data-cro` | **`form_error_whatsapp`** | `{}` | **novo** |

`form_submit_fallback` **sai do caminho automático** — ele afirmava que o fallback aconteceu quando só um `window.open()` bloqueável tinha sido tentado. O funil substituto é estritamente melhor:

- falha do endpoint = `form_submit_error / (form_submit_error + form_submit_success)`
- **recuperação = `form_error_whatsapp / form_submit_error`** — antes impossível de medir
- retry = `form_submit_retry / form_submit_error`

**Sequência segura no GTM.** Não dá para inspecionar o container a partir do repo. **Antes do merge**, conferir manualmente: Variáveis → DLVs `lead_name`/`lead_email`/`lead_phone`; Tags → quem as usa (tipicamente Enhanced Conversions do Google Ads, Advanced Matching do Meta). **Modo de falha se o passo for pulado:** as DLVs resolvem `undefined`, as tags **continuam disparando** (o gatilho é o evento `lead_submit`, cujo nome não muda) — só cai a taxa de match. Nenhuma tag quebra. O Meta já está coberto pela CAPI hasheada (`inscricao.ts:117-135`), então o Advanced Matching via GTM era redundante.

**Não** reintroduzir os dados como SHA-256 no `dataLayer`: hash no cliente ainda é dado pessoal atravessando container de terceiro.

**Notas registradas, não corrigidas (D4):** (i) o `event_id` da CAPI `Lead` não pareia com nada — o `fbq('track','Lead',…,{eventID})` do browser saiu em `9648e48`; (ii) o GTM não é env-gated nem consent-gated enquanto Pixel e GA4 são.

---

# Fase 3 — Atribuição v2 (código, sem tocar produção)

**`scripts/apps-script/Code.gs`:**

- **`conflitoDerivadas_`** — fechar o gap verificado: com `P1 = "fonte"`, `Q1`/`R1` em branco e dado do time em `Q7`, `nossos > 0` faz short-circuit da varredura de corpo e o `setValues` passa por cima. Causa raiz: tratar "já migrada" como propriedade da *janela* quando é propriedade de *cada coluna*. Correção: varrer o corpo apenas nas colunas **sem cabeçalho**. Casos novos para o harness: `P1=fonte` + `Q7` preenchido → **abort**; `P1/Q1/R1` nossas + `Q7` preenchido → **sem abort**.
- **`migrarDryRun()`** — extrair o corpo de `migrar()` para `migrarInterno_(simulacao)` e adicionar wrapper de aridade zero (o editor do Apps Script só executa funções sem argumento). O caminho simulado **não pode chamar `sheet_()`** (ele cria cabeçalhos e insere colunas = mutação); lê a aba na largura real via `linhasBrutas_()` e completa em memória. Usa **o mesmo** `conflitoDerivadas_` do caminho real, então o gate G3 prova o G4. Loga contagem, quantas linhas mudariam e o resumo por origem — nunca nome, e-mail ou telefone.
- **`toLead_`** — devolver `fonte`/`midia`/`campanha`. Linha anterior à `migrar()` tem as três vazias, e aí `source_()` roda na hora, para a API nunca devolver origem em branco durante a janela da migração.
- **`capture_`** — carimbar a origem na resposta. Sem isso, numa reinscrição o `Object.assign({}, toLead_(existente), base)` devolve a origem **antiga** enquanto `toRow_` grava a **nova**, e o CRM recebe a campanha anterior.
- `API_VERSION = 3`.

> **Contrato que fica explícito:** P/Q/R são derivadas e machine-owned — `toRow_` recalcula em toda gravação da linha. Edição manual ali volta a ser sobrescrita. É o comportamento de hoje; a mudança só para de escondê-lo do painel. **Não** "otimizar" `toRow_` para reusar `l.fonte` — isso congelaria a origem antiga numa reinscrição com UTM nova.

**`src/lib/server/leads-store.ts`** — `EXPECTED_STORE_VERSION = 3`, código `store_version_mismatch`, e `pingLeadStore()` lançando quando a versão diverge. É o único jeito de detectar "colei o script novo mas esqueci de publicar Nova versão" — o sintoma sem isso é silencioso: campo vazio no painel, ninguém percebe. Seguro porque `pingLeadStore` não tem call site no caminho de conversão.

**`src/lib/leads/schema.ts`** — `fonte`/`midia`/`campanha` opcionais em `storedLeadSchema`. Opcional de propósito: torna os dois deploys (Vercel e Apps Script) independentes de ordem.

**`src/lib/leads/attribution.ts`** — nova `leadSource(lead)`: o valor gravado vence; o recálculo em TS é rede de segurança e **sempre com o host canônico**, nunca com o host da requisição. Call sites: `admin/leads.astro:299-303`, `api/admin/leads.csv.ts:71`, `crm-inbound.ts:59` — os três perdem `Astro.url.hostname` / `url.hostname`. Corrigir também o comentário obsoleto de `:4-7` (diz `fonte_`/`midia_`/`campanha_`; a função real é `source_()`).

**`src/layouts/Layout.astro`** — chamar `captureAttribution()` também do layout. Hoje ela só roda no script do formulário, então primeiro toque em `/termos` ou `/politica-de-privacidade` com UTM **não é gravado**. É idempotente (`if (readStore()) return;`) e não grava nada sem parâmetro na URL. Custo em bytes ≈ zero (o Vite faz code-split do módulo compartilhado).

**`scripts/smoke.ts`** — assert de `version === 3` com mensagem de recuperação ("Implantar > Gerenciar implantações > lápis > Versão: Nova versão"), e asserts de `fonte`/`midia`/`campanha` que hoje não existem — o `meta.utm = {utm_source:"smoke"}` não é conferido em lugar nenhum.

---

# Fase 4 — Gates e verificação

## `scripts/chrome-geometry.mjs` (novo)

Zero dependência nova: `chrome-launcher` já é devDependency (usado por `scripts/lighthouse-audit.mjs`) e o Node ≥22 do `engines` traz `WebSocket` global, então CDP não precisa de `ws` nem de Playwright. Segue a forma de `scripts/verify-vercel-upload.mjs`.

Roda em 390×844, 768×1024 e 1440×1000 × {consent pendente, consent respondido} × {default, `prefers-reduced-motion`} × {JS on, JS off}. A sonda devolve retângulo, estado (`visibility`/`display`/`inert`) **e um hit-test** (`elementFromPoint` resolvido contra o elemento) — interseção de retângulo é o que um offset ajustado satisfaz; **hit-test é o que prova clicabilidade**, porque dobra z-index, `pointer-events`, `visibility` e `inert` na mesma asserção.

- **A** (repouso em `y = 0`): banner ∩ CTA do hero = ∅; banner ∩ submit = ∅; banner ∩ barra fixa = ∅; hit-test dos três resolve para si mesmo.
- **B** (varredura de scroll, incluindo `T ± 1` lido da página, não hardcoded): disjunção par a par de todo o chrome em toda amostra (I1); todo `[data-conversion-zone]` alcançável em algum `y` (I2); `body.paddingBottom ≥ --bottom-stack-h` sempre (I3); `scrollHeight` consistente (pega loop de feedback).
- **C** (âncoras de `.claude/config.json`): alvo inteiramente dentro de `[scrollPaddingTop, vh − stackH]`.
- **D** (teclado, Tab ×60): foco nunca cai em elemento fora da tela nem em linha colapsada. **D2 falha no `HEAD` de hoje** — é teste de regressão real, não tautologia.
- **E/F**: nenhuma animação rodando sob reduced-motion; sem JS o aviso mede 0 e o CTA fica visível.

**Disciplina de baseline: rodar contra o `HEAD` ANTES de implementar.** Saída esperada: **A FAIL em 1440×1000** (banner `889–1000` ∩ submit `947–995`), **A FAIL em 390×844** (banner ∩ CTA `705–753`), **D2 FAIL em todos**. Um gate que não falha no build sabidamente quebrado não prova nada.

## `scripts/check-no-pii-analytics.ts` (novo)

Três camadas: **tipo** (um `NoPii` que torna `lead_name`/`lead_email`/`lead_phone` `never` no tipo do `dataLayer`, pego pelo `bunx astro check`), **fonte** (este script) e **bundle** (`--dist`, pega o que o grep de fonte deixou passar depois do bundling).

Regras: chave banida em qualquer lugar; sink de analytics/log com PII na janela de 3 linhas; arquivo client-side importando `src/lib/server/**`; console server-side citando `name`/`phone`/`email` (só `emailDomain` passa). Waiver explícito e revisável no diff via `// pii-gate-allow: <motivo>`.

**Validar o gate antes de mergear:** rodar contra o `HEAD` — ele **precisa** falhar em `RegistrationForm.astro:568-575`.

## Tooling

- `biome.json` — `files.includes` ganha `scripts/**`. Verificado agora: `biome check scripts` reporta `× No files were processed`. Os quatro scripts já usam tabs e aspas duplas, então o diff deve ser mínimo ou zero.
- **`Code.gs` fica fora do linter, e isso é decisão.** Verificado: `oxlint scripts/apps-script/Code.gs` retorna `Finished in 6ms on 0 files` — ele não reconhece a extensão `.gs` e ignora em silêncio. Incluir `scripts/**` **não** cobre o `Code.gs`; e mesmo que cobrisse, o runtime é outro (globals implícitos, hoisting, sem módulos) e só produziria falso positivo. Rodar o lint e achar que o `Code.gs` foi conferido seria pior do que não rodar. O substituto é `scripts/check-source-mirror.ts` (prioridade média), que avalia `source_()` num escopo isolado com stubs e compara com `deriveSource()`.
- `package.json` — `check:pii`, `smoke`, `verify:vercel`. **`smoke` fica fora do `predeploy` e do lefthook**: ele exige segredos de produção e grava/apaga uma linha na planilha real; virar pré-commit transformaria cada commit em escrita em produção.
- **`scripts/verify-vercel-upload.mjs` precisa ser commitado.** `.claude/rules/commit.md:40-42` já o cita como passo 9 obrigatório, mas `git status` mostra `?? scripts/verify-vercel-upload.mjs` — um gate citado que não existe no repo só funciona nesta máquina.

## Gate padrão

```bash
bun run lint && bun run check:pii && bunx astro check && bun run build
node scripts/chrome-geometry.mjs
node scripts/verify-vercel-upload.mjs
bun run lighthouse:audit    # contra `bun run preview`
```

Complemento humano: subagente `verification` (Playwright MCP) com screenshots em `y=0`, `y=T+1` e `y=0.8·vh` nos três viewports, para evidência no changelog.

---

# Fase 5 — Runbook de produção (executado pelo usuário, por gate)

Regras para todos os passos: nenhum passo mutante sem "GO" explícito; evidência registrada usa `$URL` e `$S` **não expandidos**; nenhum print da planilha inteira; telefone do lead de teste é sintético; resposta de `capture`/`getLead` contém telefone — não colar crua em issue ou PR.

**G0 — pré-voo (não muta).** Gates verdes + `verify-vercel-upload` + `ping`. Anotar `rows: N`. Se vier HTML em vez de JSON: implantação em `/dev` ou acesso não é "Qualquer pessoa" — resolver antes de tudo.

**G1 — rede de segurança.** Planilha → Arquivo → Histórico de versões → Nomear versão atual → `pre-migracao-v3-AAAA-MM-DD`. Anotar também o **número da versão publicada atual** — é o alvo do rollback do G2.

**G2 — republicar o Web App.** Colar o `Code.gs` do repo → **Implantar → Gerenciar implantações → lápis → Versão: Nova versão**. **Nunca** "Nova implantação": gera outra URL e quebra o site. GO se `ping` devolve `version: 3`, a URL não mudou e `rows` = N.

**G3 — `migrarDryRun()`.** Executar no editor e ler o Registro de execução. GO se nenhuma linha `ABORTADO`, o total bate com `rows: N`, e o resumo por origem não é absurdo (100% `direto` numa campanha com tráfego marcado = coluna L vazia; investigar **antes** de escrever). NO-GO em qualquer `ABORTADO` → rollback 1.

**G4 — `migrar()`.** Executar **imediatamente** após G2/G3: entre o deploy e o `migrar`, um lead que chegue já grava P/Q/R na própria linha. GO se o N do log bate com o do dry-run (± leads do intervalo) e P1/Q1/R1 = `fonte`/`midia`/`campanha`.

**G5 — smoke.** `bun run smoke` com env descartável (`ADMIN_USERS` **nunca** o de produção). GO se `SMOKE OK` e a linha de teste não está mais na planilha.

**G6 — lead E2E `instagram / bio / aula-otb-0909`.** Aba anônima → `?utm_source=instagram&utm_medium=bio&utm_campaign=aula-otb-0909` → identidade **sintética** (`QA Atribuicao`, `qa-0909@aula-otb.local`, `62999990909`). Efeitos colaterais que exigem ciência prévia: dispara o webhook do time, cria um lead no CRM NeonDash, e gera **um** evento `Lead` no Meta CAPI (contabilizado na otimização do anúncio — avisar quem cuida da campanha).

**G7 — purge.** `purgeByEmail` limpa **só a planilha**. Manualmente: apagar o lead do CRM, apagar a mensagem do webhook se ele entrega em canal humano, e apagar qualquer CSV baixado (contém todos os leads reais). O evento do Meta não é removível — registrar como ruído conhecido de 1 evento.

## Matriz de aceite — 5 hops

| # | Hop | Onde ler | Esperado | Falseador |
|---|---|---|---|---|
| 1 | `localStorage` | `localStorage.getItem("otb_aula_attr")` | `{"t":<epoch>,"v":{"utm_source":"instagram","utm_medium":"bio","utm_campaign":"aula-otb-0909"}}`; `r` ausente com link colado | `null` → módulo não rodou. `utm_term`/`gclid` presentes → link errado |
| 2 | `POST /api/inscricao` | DevTools → Payload | `meta.utm` com os 3 campos · `landingPath: "/"` · resposta `201` `{"ok":true,"persisted":true,"leadId":"lead_…"}` | `meta.utm = {}` → fallback de querystring e a URL já tinha perdido os parâmetros |
| 3 | planilha L/M/O/P/Q/R | linha nova | L = JSON dos 3 · M vazio · O = `/` · **P = `instagram`** · **Q = `bio`** · **R = `aula-otb-0909`**, alinhados à esquerda | P = `direto` → utm chegou vazia. Alinhado à direita → `setNumberFormat("@")` não pegou |
| 4a | painel `?q=QA+Atribuicao` | coluna Origem | `instagram` / `bio · aula-otb-0909` | divergente da planilha → `toLead_` não está lendo P/Q/R |
| 4b | CSV | `grep` do e-mail sintético | `"instagram","bio","aula-otb-0909",…` (apagar o arquivo depois) | idem 4a |
| 4c | **falseador do bug de host** | abrir o painel na **URL de preview** com lead sem UTM e referrer do host de produção | `direto`, igual à planilha | se divergir, sobrou algum `url.hostname` num call site |
| 5 | CRM customFields | lead `externalId = lead_…` | `fonte: instagram` · `midia: bio` · `campanha: aula-otb-0909` · `landing_path: /` · sem `captura` | `captura: "store_…"` → o lead entrou pelo canal degradado |

---

# Rollback

| Fase | Rollback |
|---|---|
| 1 (chrome) | `git revert` do commit. Escalonado, do menos ao mais bruto: (a) forçar `consentAt = 0` no `measure()` — o aviso volta a aparecer no load e a pilha medida + `inert` + `scroll-padding-bottom` sobrevivem; (b) kill switch só de CSS (`grid-template-rows: 1fr !important` + `--bottom-stack-h: 5rem`), que também é a saída se a animação de `grid-template-rows` se comportar mal em algum engine. |
| 2 (estados) | Reverter `errorState` exige reverter schema + JSON + Props **juntos** — reverter um só quebra o `astro check`, que é o comportamento desejado. **`persisted` no servidor não pode ser revertido sozinho depois que o aceitador transitório sair** (viraria 100% de falso-negativo). **A remoção da PII do `dataLayer` não se reverte** — o forward-fix, se o match rate for crítico, é enhanced conversions server-side. |
| 3 (atribuição) | Abort do `migrar` é o caso **bom**: nada foi escrito, a guarda funcionou; mover o conteúdo do time para a coluna S e rodar de novo. Valor errado com a guarda nova: P/Q/R são 100% derivadas — corrigir `source_()`, republicar, rodar `migrar` de novo (idempotente); **não** restaurar a planilha, seria trocar problema reversível por perda de leads recentes. Anotação destruída: Ctrl+Z → copiar as células afetadas do histórico de versões → restaurar a versão inteira só como último recurso (desfaz leads capturados na janela). |
| Republish quebrou o site | **Não perde lead**: `/api/inscricao` cai em `reportDegraded` e o lead segue para webhook e CRM. Reverter versão em Gerenciar implantações → lápis → número anotado no G1 → volta ao ar em ~30s com a mesma URL. |

---

# Ordem de execução

1. **Baseline** — rodar `chrome-geometry.mjs` e `check-no-pii-analytics.ts` contra o `HEAD` e registrar as falhas esperadas.
2. **Servidor** (aditivo e inofensivo): `persisted` no 201, remoção do `missing` no 503.
3. **Gates** (`check:pii`, `chrome-geometry`, commitar `verify-vercel-upload.mjs`, `biome.json`, `package.json`, `lefthook.yml`).
4. **Conteúdo** (`errorState`: schema + JSON).
5. **Cliente do formulário** — máquina de estados + contrato de analytics num commit só (são a mesma mudança semântica).
6. **Chrome inferior** — `consent.ts`, `global.css`, `motion.ts`, `Layout`, `CookieConsent`, `MobileCTABar`, `WhatsAppFloatingButton`, `Header`, `Footer`, `Hero`, `RegistrationForm`.
7. **Atribuição** — `Code.gs`, `leads-store.ts`, `schema.ts`, `attribution.ts` + call sites, `smoke.ts`.
8. **Docs** — `docs/planilha-leads.md` (dry-run, tabela de logs, v3, `bun run smoke`), `docs/utm.md`, `PRODUCT.md:121`, `docs/aula-otb-changelog.md` (substituir `:164`, revogar `:302`, registrar a desigualdade de oclusão e o `T` medido por viewport).
9. **Runbook G0→G7** — com o usuário, por gate.

Commit, push e deploy **só quando pedido** (main-only, sem force-push).

---

## Arquivos críticos

**Fase 1:** `src/scripts/motion.ts` · `src/styles/global.css` · `src/layouts/Layout.astro` · `src/components/landing/CookieConsent.astro` · `src/components/landing/MobileCTABar.astro` · `src/components/shared/WhatsAppFloatingButton.astro` · `src/lib/consent.ts` (novo)

**Fase 2:** `src/components/landing/RegistrationForm.astro` · `src/pages/api/inscricao.ts` · `src/content/products/aula-otb.json` · `src/content.config.ts`

**Fase 3:** `scripts/apps-script/Code.gs` · `src/lib/leads/attribution.ts` · `src/lib/server/leads-store.ts` · `src/lib/leads/schema.ts` · `scripts/smoke.ts`

**Fase 4:** `scripts/chrome-geometry.mjs` (novo) · `scripts/check-no-pii-analytics.ts` (novo) · `scripts/verify-vercel-upload.mjs` (commitar)
