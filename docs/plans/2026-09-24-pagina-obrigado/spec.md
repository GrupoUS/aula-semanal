# Página de obrigado `/obrigado` — Design spec

> **Autoridade de design:** este spec + o ledger de triagem da issue #1 (reproduzido em
> `PLAN.md § Issue Triage`). Escopo fechado em R1–R10.
>
> Data: 2026-09-24. Branch `main`, baseline `ac0521f`. Tier L4. Superfície de risco: PII.

## Destination

Pronto quando, com o build estático servido localmente, valem os seis pontos abaixo.

1. **Sucesso com prova durável** (`HTTP ok` + `body.ok === true` + `leadId` não vazio +
   `persisted === true`):
   - o navegador vai, na mesma aba, a `/obrigado`, sem query nem fragmento;
   - a página mostra "Inscrição confirmada" e o CTA "Entrar no grupo vip!", apontando exatamente
     para `https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4`.
2. **Qualquer outro desfecho** (4xx, 5xx, timeout, rede, corpo não JSON, sem `persisted`)
   permanece em `/`:
   - com o painel de erro, os dados digitados e o retry;
   - sem marcador e sem `lead_submit`.
3. **Eventos.** `lead_submit` (com o `lead_id` do servidor), `generate_lead` e
   `form_submit_success` disparam exatamente uma vez por inscrição confirmada, sem PII.
4. **Sem evidência.** Acesso direto ou nova aba mostra o estado neutro, que nunca afirma gravação e
   não exibe o convite.
5. **Indexação.** `/obrigado` emite `noindex` e não aparece no sitemap.
6. **Gates** (além dos declarados em `AGENTS.md`):
   - `bun run check:states` (adaptado) primeiro falha (RED) antes da mudança do formulário e depois
     imprime `ESTADOS OK` (GREEN);
   - `bun run check:geometry` imprime `GEOMETRIA OK` em `/` e em `/obrigado/`.

## Context

- **Hoje.** O formulário confirma no próprio painel (`RegistrationForm.astro:597-608`). A issue #1
  pede uma página própria de obrigado depois da confirmação.
- **Erros já pagos.** O projeto já pagou por afirmar "confirmada" sem persistência (REVIEW.md B2) e
  por PII em analytics (B3). Por isso:
  - a navegação só pode nascer do mesmo ramo que hoje prova a gravação;
  - a evidência levada até a página não pode conter dado pessoal.

### Decisões e proveniência

- **Branch.** O controlador informou que renomeou `master` → `main` no GitHub. A leitura local,
  sem escrita, confirma `main` em `ac0521f`.
- **Pré-condição externa P1, fora do escopo e dos gates.** O projeto Vercel `aula-semanal` ainda
  reporta `link.productionBranch: master`, segundo o controlador.
  - Até o usuário ajustar o dashboard, push em `main` não é deploy automático.
  - Nada neste trabalho edita configuração Vercel, `vercel.json` ou `.vercelignore`, e nenhum gate
    afirma deploy.
  - P1 precisa estar resolvida antes de qualquer push de implementação.
- **Direção visual.** O Figma não é legível e não há acesso a ele, então a composição reutiliza
  `src/assets/na-mesa/authority-background.png` + `MesaMark`. Visual A/B contra o Figma:
  **NOT AVAILABLE**.
- **Copy principal:** "Inscrição confirmada", não "vaga garantida".
- **Proveniência.** Depois da pergunta sobre visual/design, o usuário respondeu "pode seguir para
  concluir tudo". A frase chegou repassada pelo controlador em 2026-09-24; o planejador não viu a
  mensagem original. Uma atribuição anterior a um "default do usuário" foi removida porque não
  tinha origem.
- **Arquivos protegidos**, com aprovação registrada no ledger (R6, R9):
  - `noindex` + exclusão do sitemap, editando `astro.config.mjs`;
  - objeto opcional `thankYou` no schema, editando `content.config.ts`.

  O executor confirma a aprovação na mensagem do próprio usuário antes de editar, e uma negação do
  hook significa parar e perguntar.
- **Arquivo sujo preexistente.** `.codex/rules/README.md` (hash
  `01113d96ead02d092843a0248609a421fe9929f7`) fica fora de todo escopo e é verificado byte a byte.

## Reuse ledger

| # | Necessidade | Ativo existente (`path:line`) | Veredito | Por que estender não basta (só NEW) |
|---|---|---|---|---|
| 1 | Prova de gravação durável | `src/components/landing/RegistrationForm.astro:555-564` (`durableLeadId`) | REUSE sem mudança | — |
| 2 | Ponto de confirmação | `RegistrationForm.astro:597-608` (`confirmLead`) | EXTEND | — |
| 3 | Guarda de tipo sem PII | `RegistrationForm.astro:369-384` (`NoPii`, `AnalyticsEvent`) | EXTEND (campos opcionais `eventCallback`/`eventTimeout`) | — |
| 4 | Schema do convite do grupo | `src/content.config.ts:321-331` (`successState.group`, valida `chat.whatsapp.com`) | REUSE; preencher JSON | — |
| 5 | CTA do grupo no painel in-page | `RegistrationForm.astro:262-285` (`data-cro="success_join_group"`, `.btn-whatsapp`) | EXTEND só a cor do texto, por `<style>` com escopo do componente | — |
| 6 | Shell, SEO, `noindex` | `src/layouts/Layout.astro:24-37`, `:184-187` | REUSE | — |
| 7 | Padrão de página utilitária | `src/pages/404.astro:1-24` (`getEntry` + `noindex`) | REUSE padrão | — |
| 8 | Lockup | `src/components/shared/MesaMark.astro:1-15` | REUSE | — |
| 9 | Arte de fundo | `src/assets/na-mesa/authority-background.png` (2160×1120) + padrão `getImage`/`<picture>` de `src/components/landing/Hero.astro:17-27` | REUSE | — |
| 10 | Módulo de constantes | padrão de `src/lib/consent.ts:10-12` | NEW `src/lib/thank-you.ts` | `consent.ts` é dono da chave de cookies; misturar o marcador de inscrição acoplaria dois contratos distintos |
| 11 | Filtro do sitemap | `astro.config.mjs:42-46` | EXTEND | — |
| 12 | Tokens e foco | `src/styles/global.css:26` (`--color-navy`), `:57` (`--color-text-primary`), `:155-156` (`--color-whatsapp*`), `:306-309` (`:focus-visible` global) | REUSE | — |
| 13 | Estado oculto robusto | `node_modules/tailwindcss/preflight.css:391-393` (`[hidden]` com `display:none !important`) | REUSE | — |
| 14 | Proteção do chrome inferior | `src/scripts/motion.ts:196-212` (`measure`, `bandBlocked`), `:269` (`bottomchrome:change`) | REUSE | — |
| 15 | Harness CDP de estados | `scripts/check-form-states.mjs:18-135` | EXTEND | — |
| 16 | Gate de geometria (interseção + hit-test; 390x844, 768x1024, 1440x1000; consentimento pendente e concedido) | `scripts/chrome-geometry.mjs:41-55`, `:280-290`, `:560-575` | EXTEND: semeia o marcador só quando o path é `/obrigado` | — |
| 17 | Servidor local sobre o build | `docs/planilha-leads.md:232` ("qualquer servidor sobre dist/client") | REUSE com `python3 -m http.server` (ferramenta do sistema, sem dependência) | — |
| 18 | Rota `/obrigado` | nenhuma em `src/pages/` | NEW `src/pages/obrigado.astro` | não há página equivalente para estender (R1) |

## Regression watchlist

| # | Comportamento existente | Prova |
|---|---|---|
| W1 | Ramos de falha inalterados: painel de erro, dados preservados, retry | `check:states` (503, sem prova, HTML, `lead_legacy`) + sonda de diff do T3.1 |
| W2 | Nenhum `lead_submit`/`generate_lead` em falha | linhas `NENHUM lead_submit`/`NENHUM generate_lead` do `check:states` |
| W3 | Sucesso in-page quando `sessionStorage` lança | `storage bloqueado: sucesso in-page sem navegação` do `check:states` |
| W4 | Geometria do chrome inferior da landing (B4) | `node scripts/chrome-geometry.mjs http://127.0.0.1:4334/` → `GEOMETRIA OK` depois da semente de `/obrigado` |
| W5 | Nenhuma PII em analytics, fonte e bundle (B3) | `bun run check:pii` + `bun scripts/check-no-pii-analytics.ts --dist` |
| W6 | `lead_submit` não duplicado (B5) | contagem de linha no T3.1 + "uma vez" no `check:states` |
| W7 | Sem consentimento, nenhuma captura | linhas "sem consentimento" existentes |
| W8 | Payload (`profession` rotulado, `landingPath` `/`) | linhas "payload:" existentes |
| W9 | Estático; sem `prerender = false` público, `ClientRouter` ou ilha | sonda do T2.1 + checagens mecânicas do REVIEW.md §3 (sem Markdown; B1 incluída) |
| W10 | Sitemap segue com `/`, `/termos`, `/politica-de-privacidade`, sem `/admin` | sonda do sitemap no T2.1 |
| W11 | Conjunto de upload Vercel, arquivos novos não ignorados, `.vercelignore` sem padrão solto | `bun run verify:vercel` + sonda de não rastreados + B1 |
| W12 | Arquivo sujo preexistente intocado | `git hash-object .codex/rules/README.md` = `01113d96…` em todo gate de escopo |

## Background research

- **`sessionStorage`** tem 0 ocorrências em `src/`, então não há contrato existente a preservar.
- **GTM.** O container `GTM-MVQW6VLD` é sempre carregado (`Layout.astro:146-150`), sem gate de
  consentimento.
  - Com o GTM carregado, `dataLayer.push` aceita `eventCallback`/`eventTimeout` [fato externo da
    documentação do GTM, não reverificado nesta sessão sem rede; confiança 4].
  - Sem GTM (bloqueador, offline), o push é `Array.prototype.push` e nenhum callback dispara; daí o
    temporizador de reserva.
- **Gate de PII.** Trata `dataLayer.push`, `gtag`, `fbq`, `cro` e `console` como sinks
  (`scripts/check-no-pii-analytics.ts:40-44`). `sessionStorage.setItem` não é sink, e o valor
  gravado é o literal `"1"`.
- **Servidor de QA.** `astro preview` não serve este build [ASSUMED A3]: o adapter
  `@astrojs/vercel` gera rotas on-demand (`/api`, `/admin`) e não expõe preview. Rodadas anteriores
  de QA usaram `http://127.0.0.1:4334/` sobre o build estático
  (`docs/aula-semanal-implementacao.md:67`, `:92`).
- **`[hidden]`.** O preflight do Tailwind o força a `display:none !important`, então classes de
  layout não reexibem um estado oculto.
- **Chrome inferior.** `motion.ts` só protege zonas marcadas com `data-conversion-zone`, e mede de
  novo ao receber `bottomchrome:change`; a troca de estado precisa disparar esse evento. O botão
  flutuante `[data-float-wa]` (`Layout.astro:247`) aparece em toda página e só recolhe com a pilha
  aberta, então a composição mantém o CTA fora do canto inferior direito.
- **Geometria.** `scripts/chrome-geometry.mjs` já mede interseção e hit-test em 390x844, 768x1024 e
  1440x1000, com consentimento pendente, concedido, reduced motion e sem JS. A regra B3 conta toda
  zona, inclusive oculta; por isso, ao medir `/obrigado`, a ferramenta precisa semear o marcador e
  medir o estado confirmado.
- **Contraste.** `.btn-whatsapp` (`global.css:1910`) usa texto `--color-text-primary` (`#fafaf9`)
  sobre `--color-whatsapp` (`#25d366`): ≈ 1,9:1, reprovando WCAG 1.4.3. Com `navy` (`#0b2434`) fica
  ≈ 8,0:1, e ≈ 6,4:1 no hover `#20bd5a`.
  - O convite in-page (`RegistrationForm.astro:279`) só renderiza quando `successState.group`
    existe, e este trabalho passa a preenchê-lo.
  - `<style>` com escopo do Astro sai fora da camada `utilities` do Tailwind, então vence o
    `@utility` sem `!important` [ASSUMED A7].
- **`verify:vercel`** lê só arquivos rastreados (`scripts/verify-vercel-upload.mjs:40-47`); arquivos
  novos ainda não commitados exigem sonda própria.
- **Contradição resolvida.** `.claude/rules/astro.md §4` pede atualizar `robots.txt` junto de rota
  nova, mas `/obrigado` **não** entra em `Disallow`: um crawler bloqueado não lê o `noindex` da
  página. É desvio deliberado, registrado aqui e no PLAN.
- **`ClientRouter` em Markdown.** A busca por `ClientRouter` acerta `src/AGENTS.md:35`, que é
  documentação, então as checagens mecânicas excluem `*.md`.

## Approach (chosen)

**No formulário.**

- O ramo `confirmLead`, o único alcançado com prova durável, grava em `sessionStorage` a chave
  `mesa_inscricao_confirmada` com valor `"1"`, sem PII e sem `leadId`.
- Se gravou:
  - faz um único push de `lead_submit` com `eventCallback` + `eventTimeout`;
  - navega para `/obrigado` com `window.location.assign`, no primeiro entre o callback do GTM e um
    temporizador de 1500 ms, com guarda de execução única.
- Se a gravação lança, nada navega e o painel de sucesso in-page atual permanece. O convite do
  grupo nesse painel ganha texto navy por `<style>` com escopo do componente.

**Na página.** `/obrigado` é estática: o HTML do servidor mostra o estado neutro e traz o
confirmado com `hidden`. Um script empacotado lê o marcador e só então troca o estado.

**Alternativas rejeitadas** (ADR no PLAN):

- query string ou fragmento com id: viola R1 e põe PII na URL;
- verificação no servidor ou token: exige endpoint novo, fora de escopo;
- página on-demand: viola B8;
- manter só o painel in-page: não atende R1.

## Architecture

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Dados — schema | `src/content.config.ts` | objeto opcional `thankYou` (abaixo) |
| Dados — conteúdo | `src/content/products/aula-semanal.json` | valores de `thankYou` e `registration.successState.group` |
| Constantes compartilhadas | `src/lib/thank-you.ts` (NEW) | `THANK_YOU_PATH = "/obrigado"`, `THANK_YOU_MARKER_KEY = "mesa_inscricao_confirmada"`, `THANK_YOU_MARKER_VALUE = "1"` — só esses três exports |
| Apresentação — página | `src/pages/obrigado.astro` (NEW) | `Layout` com `noindex={true}`, sem slot `bottom-cta`; dois estados; script de troca |
| Registro da rota | `astro.config.mjs` | filtro do sitemap exclui `/obrigado` |
| Verificação — geometria | `scripts/chrome-geometry.mjs` | semeia o marcador só quando o path é `/obrigado`; nenhuma asserção nova |
| Verificação — estados | `scripts/check-form-states.mjs` | prova navegação, estados, eventos, contraste do convite in-page e ausência de navegação em falha |
| Cliente — formulário | `src/components/landing/RegistrationForm.astro` | marcador + navegação dentro de `confirmLead`; `<style>` com escopo para o texto do convite |

Shape do schema, dentro do objeto raiz de `products` e irmão de `registration`:

```ts
thankYou: z.object({
  seo: z.object({ title: z.string().min(20).max(70), description: z.string().min(120).max(220) }),
  confirmed: z.object({ headline: z.string(), body: z.string() }),
  neutral: z.object({ headline: z.string(), body: z.string(), backLabel: z.string() }),
}).optional(),
```

**Valores.** A copy parte do planejador e segue a decisão "Inscrição confirmada". Ela atende R6,
não afirma data, preço, credencial nem resultado, e não usa "vaga" nem "garantida". O executor lê
`~/.claude/skills/grupo-us/SKILL.md` antes de gravar.

| Campo | Valor |
|---|---|
| `thankYou.seo.title` | `Próximo passo \| Na Mesa com Sacha` |
| `thankYou.seo.description` | `Próximo passo da inscrição no Na Mesa com Sacha, as aulas gratuitas ao vivo com a Dra. Sacha Gualberto, toda terça-feira no Zoom.` |
| `thankYou.confirmed.headline` | `Inscrição confirmada` |
| `thankYou.confirmed.body` | `Recebemos sua inscrição nas aulas gratuitas de terça-feira no Zoom. Acompanhe seu e-mail e WhatsApp para receber as orientações de acesso às aulas. Como próximo passo, entre no grupo VIP do WhatsApp.` |
| `thankYou.neutral.headline` | `Participe do Na Mesa com Sacha` |
| `thankYou.neutral.body` | `Se você já se inscreveu, acompanhe seu e-mail e WhatsApp. Se ainda não, preencha seus dados na página inicial para participar das aulas gratuitas de terça-feira no Zoom.` |
| `thankYou.neutral.backLabel` | `Ir para o formulário de inscrição` |
| `registration.successState.group.title` | `Próximo passo` |
| `registration.successState.group.description` | `Entre no grupo VIP do WhatsApp da aula.` |
| `registration.successState.group.label` | `Entrar no grupo vip!` |
| `registration.successState.group.href` | `https://chat.whatsapp.com/CeAhWrPt7D7G7rpHy0uFSY?s=cl&p=i&mlu=4&ilr=4` |

(O `\|` no título acima é escape de tabela; o valor real é `Próximo passo | Na Mesa com Sacha`.)

Contrato de DOM de `/obrigado`, consumido pelo script da página, pelo `check:states` e pelo
`check:geometry`:

| Seletor | Conteúdo | Estado inicial no HTML |
|---|---|---|
| `section[data-thank-you-root][aria-labelledby="obrigado-title"]` | composição inteira | visível |
| `picture` dentro da raiz | `authority-background.png` via `getImage` (webp; desktop 1920 px, mobile ≤ 1080 px), `alt=""`, `width`/`height` explícitos, `loading="eager"`, `fetchpriority="high"`, `object-fit: cover`, `object-position` ajustado em `max-width: 767px` | visível |
| `.mesa-mark` (via `MesaMark`) dentro da raiz | lockup | visível |
| `h1#obrigado-title` — **único `<h1>` da página** | dois `span`: `[data-thank-you-state="neutral"]` com `neutral.headline` e `[data-thank-you-state="confirmed"][hidden]` com `confirmed.headline` | só o span neutro visível |
| `[data-thank-you-state="confirmed"]` (corpo, CTA) | `confirmed.body`, `a[data-thank-you-cta][data-conversion-zone]` com `href={group.href}`, `target="_blank"`, `rel="noopener noreferrer"`, texto `group.label` | `hidden` |
| `[data-thank-you-state="neutral"]` (corpo, link) | `neutral.body`, `a[data-thank-you-back][href="/#inscricao"]` com `neutral.backLabel` | visível |

**Estilo do CTA.**

- O estado neutro não contém link `chat.whatsapp.com`.
- O CTA usa uma classe da página (`<style>` com escopo), só com tokens:
  - fundo `var(--color-whatsapp)` (hover `var(--color-whatsapp-hover)`);
  - texto `var(--color-navy)`;
  - `min-height` ≥ 44 px;
  - o anel `:focus-visible` global (2 px dourado + offset 2 px).
- O retângulo do CTA fica livre do `[data-float-wa]` nos três viewports.
- Qualquer movimento fica sob `@media (prefers-reduced-motion: no-preference)`; nada de
  `data-reveal` nos estados.
- Sem hex, sem alteração em `global.css` ou no `.btn-whatsapp` global.

## Data flow

1. Submit → `fetch` → `durableLeadId(res, body)` (inalterado).
2. `leadId` nulo → `fail(...)` (inalterado): fica em `/`, sem marcador e sem `lead_submit`.
3. `leadId` válido → `confirmLead(leadId)`, nesta ordem:
   1. `setState("confirmed")`;
   2. `setStatus("", false)`;
   3. `try { sessionStorage.setItem(KEY, "1") }`;
   4. **um** `dataLayer.push({ event: "lead_submit", lead_id, eventCallback, eventTimeout: 1500 })`,
      com callback/timeout só se o marcador foi gravado;
   5. `fireGa4Lead()`;
   6. `cro("form_submit_success")`;
   7. `reveal(successEl)`;
   8. se gravou, `setTimeout(go, 1500)`.

   `go` executa uma vez: `window.location.assign(THANK_YOU_PATH)`. O marcador é gravado antes do
   push porque o callback precisa viajar no mesmo push; um segundo push duplicaria `lead_submit`
   (B5).
4. `/obrigado` carrega com o estado neutro do servidor.
   - O script lê o marcador dentro de `try/catch`. Se for `"1"`, alterna `hidden` dos
     `[data-thank-you-state]` e dispara `bottomchrome:change`.
   - O marcador não é apagado. Recarregar na mesma aba mantém o confirmado; nova aba ou acesso
     direto não tem marcador e fica neutro.

**Estados.**

- O formulário mantém `idle → validating → submitting → confirmed | failed`.
- A página vai de `neutral` (padrão, inclusive sem JS) para `confirmed` (somente com marcador).

## Error handling

| Falha | Comportamento |
|---|---|
| `setItem` lança (storage bloqueado/cota) | sem navegação; painel de sucesso in-page, com o convite do grupo em texto navy (≥ 4.5:1) |
| GTM ausente ou sem callback | temporizador de 1500 ms navega; guarda impede dupla navegação |
| GTM chama o callback e o temporizador também dispara | `go` retorna na segunda chamada |
| Navegação falha (offline) | pessoa permanece no painel de sucesso in-page |
| `getItem` lança em `/obrigado` | estado neutro (nunca afirma gravação) |
| JS desligado em `/obrigado` | estado neutro do HTML do servidor |
| `thankYou` ou `successState.group` ausente no JSON | `obrigado.astro` lança no build (falha visível, não página quebrada) |
| Flash neutro → confirmado antes do script | aceito: a direção é segura, nunca mostra confirmação falsa |

## Testing

Não há test runner (`tooling.testRunner: null`, REVIEW.md §1). O script CDP
`scripts/check-form-states.mjs` é o teste executável, e o ciclo TDD fica explícito no plano.

- **RED.** Antes de mudar o formulário, o script é adaptado para exigir:
  - navegação para `/obrigado` no sucesso;
  - estado confirmado com um `<h1>` "Inscrição confirmada";
  - eventos contados uma vez através da navegação (espelho em `sessionStorage.__qa_events`);
  - nenhuma PII em eventos, URL e `sessionStorage`;
  - recarga mantendo o confirmado;
  - contraste ≥ 4.5:1 do convite in-page com storage bloqueado.

  Ele deve falhar só nessas labels, enquanto passam:
  - as falhas sem navegação e sem marcador;
  - o sucesso in-page com storage bloqueado;
  - o acesso direto neutro sem convite;
  - o CTA com rótulo e `href` exatos na página confirmada semeada;
  - por viewport (1440x1000, 768x1024, 390x844): sem overflow horizontal, lockup e fundo
    renderizados, e foco visível no CTA via Tab.
- **GREEN.** A mudança do formulário torna o mesmo script `ESTADOS OK`, sem nenhuma linha `FAIL`.
- **Geometria.** `check:geometry` em `/obrigado/`, com o marcador semeado pela própria ferramenta
  só nesse path, prova por interseção e hit-test que o CTA não fica sob o aviso de cookies nem sob
  o botão flutuante. Cobre 390x844, 768x1024 e 1440x1000, com consentimento pendente e concedido,
  mais reduced motion e sem JS. A mesma ferramenta em `/` prova a landing inalterada.
- **Gates finais:**
  - `lint`, `astro check`, `build`;
  - `check:pii` (fonte e `--dist`);
  - `verify:vercel`;
  - `check:states`;
  - `check:geometry` (`/` e `/obrigado/`);
  - checagens mecânicas do REVIEW.md §3 sem Markdown e com B1.
- **Visual A/B contra o Figma: NOT AVAILABLE.** As capturas desktop/mobile com `webapp-testing` são
  advisory.

## Assumptions

- [ASSUMED A1] `astro sync` valida as entradas da collection contra o Zod e sai com código ≠ 0 em
  dado inválido; `astro check` no gate de fase é a rede de segurança.
- [ASSUMED A2] O Astro renderiza `hidden` como atributo booleano e escapa `&` como `&amp;` em
  `href`; as sondas aceitam `&` e `&amp;`.
- [ASSUMED A3] `astro preview` não atende este build.
  - O servidor de QA é `python3 -m http.server 4334 --bind 127.0.0.1 --directory dist/client`.
  - Ele redireciona `/obrigado` para `/obrigado/`, e as asserções aceitam `^/obrigado/?$`.
  - A Vercel serve `/obrigado` (`vercel.json`: `cleanUrls`, `trailingSlash: false`).
- [ASSUMED A4] O GTM chama `eventCallback` no máximo uma vez por push e respeita `eventTimeout`.
- [ASSUMED A5] `sessionStorage` é por aba, sobrevive a navegação e recarga na mesma aba e começa
  vazio em aba nova. "Duplicar aba" copia o marcador, o que é aceitável (mesma pessoa, mesma
  sessão).
- [ASSUMED A6] Os textos de `thankYou` e `group.title/description` são proposta do planejador,
  dentro da decisão "Inscrição confirmada"; rótulo e `href` do CTA são requisito (R7). Mudar texto
  depois é só JSON.
- [ASSUMED A7] O `<style>` com escopo do Astro não entra em `@layer`, então vence
  `@utility btn-whatsapp` (camada `utilities`) sem `!important`. A label de contraste do
  `check:states` prova no navegador.

## Out of scope

- Novo endpoint; token/autenticação; verificação no servidor.
- SSR ou `prerender = false` na página; `ClientRouter`/SPA; ilha React.
- Nova dependência; nova coluna na planilha.
- Mudança de destino do lead, env ou IDs de tracking; `bun run smoke`.
- Redesign da landing; mudança global de `.btn-whatsapp`.
- `Disallow` de `/obrigado` no `robots.txt`.
- Evento CRO novo no CTA de `/obrigado`.
- Fidelidade exata ao Figma.
- Apagar o marcador após exibir.
- Migração operacional Git/Vercel: Production Branch e verificação de deploy automático
  (pré-condição P1, do controlador).

## Not yet specified

- **F1 — tags do GTM em produção.** Não se sabe quais tags o container dispara em `lead_submit` em
  produção, nem se atrasam o callback. O atraso é limitado pelo `eventTimeout` de 1500 ms.
  Conferir com GTM Preview depois de P1 e de um deploy autorizado pelo usuário.
- **F2 — fidelidade visual aos frames 1080×628 e 390×837.** Visual A/B NOT AVAILABLE sem acesso ao
  Figma. As capturas são advisory, para revisão do usuário.
- **F3 — contraste preexistente de `.btn-whatsapp`.** O texto claro sobre verde (≈ 1,9:1) continua
  no painel de erro (`RegistrationForm.astro:217`) e no lembrete (`:292`). O lembrete só renderiza
  com `reminderWhatsapp`, hoje ausente no JSON. O convite do grupo (`:279`) é corrigido localmente.
  Corrigir o estilo global exige decisão do usuário e não bloqueia R1–R10.

## Rollback

- **Antes do commit:** descartar exige aprovação explícita do usuário, porque apaga trabalho da
  árvore.
  - Usar `git restore --source=ac0521f --` com paths explícitos e remover os dois arquivos novos.
  - Nunca incluir `.codex/rules/README.md`.
- **Depois do commit:** `git revert <sha>` + push, cada um com aprovação e com os opt-ins do
  projeto.
- **Reversão parcial segura:** reverter só `RegistrationForm.astro` devolve o sucesso in-page. Sem
  o marcador, `/obrigado` fica sempre neutra e inofensiva.
- **Schema opcional:** remover o `thankYou` do JSON sem remover a página quebra o build de
  propósito, então reverter página e conteúdo juntos.

## References

- Ledger de triagem da issue #1 (autoridade, em `PLAN.md § Issue Triage (upstream mandate)`).
- `AGENTS.md`, `.claude/CLAUDE.md`, `src/AGENTS.md`, `src/components/landing/AGENTS.md`,
  `PRODUCT.md`, `DESIGN.md`, `REVIEW.md`.
- `.claude/rules/astro.md`, `lead-e-pii.md`, `seo.md`, `frontend.md`, `DESIGN.md`.
- `~/.claude/skills/grupo-us/SKILL.md` (voz e copy; skill do usuário, não roteável pelo validador).
- `docs/plans/2026-08-12-issue-1-evolucao-aula-otb.md` — plano histórico herdado de outro produto;
  não é autoridade.
