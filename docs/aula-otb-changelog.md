# Changelog — Aula OTB

## 2026-08-19 — Adoção do plugin `graph-powers`: o harness sai do repositório

### Decisões do usuário

- Instalar a partir do repositório remoto `GrupoUS/graph-powers`, e não do diretório local
  `~/orca/gpus-harness`, para receber atualização por `claude plugin update`.
- **Escopo user (global)**, com preferência pelo plugin sobre cópias locais.
- Config migrada para `.graph-powers/config.json`, o caminho canônico do plugin.
- Escrever config mínima nos outros quatro repositórios, para que o install global não os deixe
  nos defaults.
- Reescrever `docs/prompts/` para o plugin novo, em vez de trocá-los por um ponteiro.

### O que mudou

| | antes | depois |
|---|---|---|
| `.claude/agents/` | 10 | 2 (`code-reviewer`, `orchestrator`) |
| `.claude/skills/` | 11 | 0 |
| `.claude/commands/` | 15 | 0 |
| `.claude/hooks/` | 9 | 0 |
| `.claude/templates/` | 6 | 0 |
| `.claude/rules/` | 9 | 10 (−`commands.md`, +`lead-e-pii.md`, +`deploy-vercel.md`) |
| `.claude/CLAUDE.md` | 129 linhas | 91 |
| `AGENTS.md` | 146 linhas | 77 |
| `~/.claude/skills/` | 7 duplicavam o plugin | arquivadas em `skills-pre-graph-powers/` |

`REVIEW.md` criado do histórico do repositório. `DESIGN.md` e `PRODUCT.md` melhorados no lugar, com
as seções que a spec do plugin exige e faltavam. `impeccable` deixou de ser snapshot vendorizado
(62 arquivos) e passou a vir do instalador oficial, em escopo global, na v4.1.1.

### Aprendizados técnicos

- **Precedência não é uniforme, e a doc interna do grupo generalizava.** Agents sofrem shadowing por
  `name:` do frontmatter (`Project > User > Plugin`); skills e commands são namespaced
  (`graph-powers:astro`) e **coexistem**; hooks se somam e rodam os dois. Só a limpeza de agents é
  requisito técnico — o resto é redução de duplicação.
- **O escopo user também sombreia o plugin.** Limpar só `.claude/` do projeto deixava 7 skills e 1
  agent de `~/.claude/` no caminho. Os prompts antigos não cobriam isso.
- **`_deep_merge` substitui array inteiro em vez de concatenar.** Declarar
  `protectedFiles.contains: ["bun.lock"]` apagava o default `.env` do plugin, e `segments: []`
  apagava `.git` e `node_modules`. Era inerte enquanto nenhum hook rodava; com o plugin instalado,
  `.env` ficaria desprotegido. Os defaults agora estão repetidos explicitamente, com o porquê no
  `_comment`.
- **Docstring corrigida e código não corrigido é o pior dos dois mundos.** `launch_chrome_debug.py` e
  `chrome_screenshot.py` montavam `Path(project_dir) / ".claude" / "config.json"` à mão; depois da
  migração leriam arquivo inexistente e cairiam em localhost em silêncio.
- **Cópia velha afirma coisa que o repositório já não faz.** O overlay da skill `astro` local dizia
  "No `prerender = false`" e "No SSR adapter" — mas há 8 ocorrências num carve-out aprovado, e o
  adapter é `@astrojs/vercel`. Apagar a cópia removeu uma contradição, não perdeu contexto.
- **Nem toda duplicata é redundância.** Quatro hooks de `~/.claude/hooks/` são mais completos que os
  do plugin: denies de `DROP DATABASE`/`TRUNCATE` em `smart_bash_approver`, correção do
  `select.select()` no Windows em `session_context`, motor `lint_core` com `safe_autofix` em
  `ultracite`, e toast nativo em `notify`. Foram mantidos — removê-los rebaixaria quatro guardrails.
  Viram contribuição upstream.
- **`npx impeccable install --help` executa a instalação** em vez de mostrar ajuda.
- **`graph-powers` não está no npm**, então `bunx graph-powers` não funciona; a via é o marketplace
  do GitHub. O repositório é privado e o clone usa a credencial do `gh`.

### Verificação (evidência)

- `test_hooks.py` do plugin: 32 asserções, `EVERY GUARANTEE HELD`, exit 0.
- Gate de commit nega citando `AULAOTB_ALLOW_COMMIT=1`; push em `main` cita `AULAOTB_ALLOW_PUSH=1`.
- `protect_files` nega `.env` e `src/lib/whatsapp.ts`, e permite `src/pages/index.astro`.
- `_config.config_path()` resolve `.graph-powers/config.json`, `workBranch=main`.
- Os quatro comandos de `tooling.commands` rodados um a um: todos `exit=0`.
- Os cinco repositórios leem a própria config, com prefixos distintos (`AULAOTB`, `SACHABIO`,
  `BOTOXLAB`, `OTBUSA`, `NEONDASH`).
- Zero colisão de nome entre projeto, escopo user e plugin.
- Gates do projeto: `lint`, `astro check`, `build`, `verify:vercel`, `check:pii` verdes.

### Registrado, não corrigido

- `examples/*.json` do plugin apontam `$schema` para a branch `main`, que não existe (default é
  `graph-powers-1.0`) — URL dá 404.
- `ultracite.py` do plugin implementa um ramo `Stop` que `plugin.json` não declara: nunca dispara.
- Quatro hooks disparam em duplicidade (global + plugin). Aceito conscientemente: as versões globais
  são melhores, e não há como desabilitar hook individual de plugin.
- Métricas de conversão em `PRODUCT.md` ficaram como `Não decidido`, com o que as resolveria.

## 2026-08-18 — Issue #2: conversão sem obstrução, estados honestos e zero PII em analytics

### Decisões

| # | Decisão |
|---|---|
| D1 | **Pilha inferior medida que cede a zonas de conversão.** Todo elemento fixo ancorado embaixo virou filho de `#bottom-chrome`; a pilha só aparece quando nenhuma `[data-conversion-zone]` está na faixa que ela ocuparia. |
| D2 | **Código + runbook.** As mutações na planilha (republish, `migrar`, lead E2E) ficam para execução manual, por gate go/no-go. |
| D3 | **A planilha é a fonte da verdade da origem.** `toLead_` devolve P/Q/R, `API_VERSION` sobe para 3, painel/CSV/CRM leem o valor gravado. |
| D4 | **GTM fica como está.** A PII sai do `dataLayer`; a assimetria de consentimento do container vira decisão registrada, não mudança agora. |

### Por que offset não resolvia o banner

Com `vh` a altura da viewport, `H` a altura do chrome e `B(e)` a base do elemento protegido em coordenadas de documento:

```
e fica ocluído  <=>  scrollY < B(e) + H - vh
```

Em `scrollY = 0` isso exige `B(e) + H <= vh`. Em 1440×1000 o submit termina em y=995: **sobram 5px**. Banda no topo não escapa — ela empurra `B(e)` pelo mesmo `H`. As duas correções anteriores (`bottom-0` → `bottom: 5rem`) tentavam resolver uma equação insatisfazível.

Um limiar de scroll também não bastou, e o gate provou: ele protege só a primeira dobra. Em 768×1024, com scroll em 820, o submit sobe para a faixa de baixo e o aviso passa por cima (872..920 contra 860..940). A regra final é dinâmica — a pilha **cede**: só aparece quando nenhuma zona de conversão está em `[y + vh - H, y + vh]`. Checagem aritmética por frame, com as posições em cache.

### Entregue

**Chrome inferior** — `#bottom-chrome` com linhas em fluxo normal (`grid-template-rows: 0fr↔1fr`); `--bottom-stack-h` medido pelo `motion.ts` alimenta `body { padding-bottom }` e `html { scroll-padding-bottom }`; escala de z-index em tokens; linhas colapsadas saem da tabulação via `inert`; `src/lib/consent.ts` acaba com a chave triplicada; botão "Preferências de cookies" no rodapé (a escolha era irreversível); menu mobile inertiza a pilha (o `aria-modal` era mentira — o `<header>` cria contexto de empilhamento).

**Estados honestos** — máquina `idle → validating → submitting → {confirmed | failed}` com `setState` como único escritor de DOM; sucesso exige `persisted: true` + `leadId` do servidor (sem queda para o `eventId` do cliente); painel de erro `role="alert"` dentro do form, com retry `type="submit"` e link de WhatsApp que a pessoa clica; `AbortController` de 12s; nunca mais de um fallback de WhatsApp visível. `errorState` entra no schema + JSON (as mensagens de validação eram string literal no script).

**Privacidade** — `lead_name`/`lead_email`/`lead_phone` saem do `dataLayer`; sobra `lead_id`. `generate_lead` passa a disparar só no sucesso (antes inflava a conversão do GA4 quando a planilha caía). O 503 parou de ecoar os nomes das env faltando. Guarda de tipo `NoPii` torna a violação erro de compilação.

**Atribuição** — `migrarDryRun()`; guarda de conflito por coluna; `API_VERSION = 3` com assert em `pingLeadStore`; `leadSource()` único (some `Astro.url.hostname`/`url.hostname`); `captureAttribution()` em toda página.

### Evidência

- Gate de geometria (`scripts/chrome-geometry.mjs`, CDP + `chrome-launcher`, zero dependência nova): **104/104** em 390×844, 768×1024 e 1440×1000 × {consent pendente, respondido} × {reduced} × {sem JS}.
- **Baseline no `HEAD` anterior: 22 falhas.** Achados que ninguém tinha visto: `aviso × botão WhatsApp` e `CTA fixo × botão WhatsApp` se sobrepunham em quatro situações, e o foco caía em elementos fora da tela.
- **Gate falsificado**: reinjetando o CSS antigo no build, ele volta a reprovar com os sintomas exatos da issue (aviso cobrindo o CTA do hero em 390×844 e o submit em 768×1024).
- Gate de PII (`scripts/check-no-pii-analytics.ts`): fonte **e** bundle limpos; reprovava 3 linhas no `HEAD` anterior.
- Estados do formulário (`scripts/check-form-states.mjs`): 20/20 em cinco desfechos.
- `bun run lint` · `bunx astro check` · `bun run build` · `bun run verify:vercel` limpos.

### Aprendizados

1. **Elemento fixo novo não se resolve com offset.** Ou entra na pilha medida, ou cede por geometria. Offset é ajuste, não garantia — e envelhece a cada mudança de copy, fonte ou zoom.
2. **Um limiar estático só protege a primeira dobra.** Qualquer coisa fixa embaixo cobre o que rola por baixo dela; a cessão tem que ser avaliada em todo scroll.
3. **Gate que não falha no build sabidamente quebrado não prova nada.** Rodar o baseline antes de corrigir, e reinjetar o bug depois, é o que separa gate de teatro.
4. **Interseção de retângulo não prova clicabilidade.** Hit-test (`elementFromPoint`) dobra z-index, `pointer-events`, `visibility` e `inert` numa asserção só.
5. **Prova de persistência é contrato do servidor, não formato de id.** O prefixo `lead_` nasce no Apps Script e muda sem passar por code review; acoplar o browser a ele transformaria gravação real em falha silenciosa.
6. **`window.open()` depois de um `await` é bloqueável.** Afirmar sucesso com base nele foi uma premissa não verificada que sobreviveu a uma issue inteira.
7. **`requestAnimationFrame` não dispara em aba headless invisível** — sonda de teste tem que usar `setTimeout`, e com `setScriptExecutionDisabled` a sonda precisa ser síncrona.
8. **"Já migrada" é propriedade de cada coluna, não da janela.** O short-circuit por `nossos > 0` deixava anotação humana ser sobrescrita numa migração parcial.

### Runbook de produção — executado em 2026-08-19

G1 a G5 concluídos. Evidência (sem PII):

- `ping` responde `{"ok":true,"version":3,"sheet":"leads","rows":17}` — Web App republicado.
- `migrarDryRun`: `17 linha(s) seriam reescritas em P/Q/R; 0 com valor diferente do atual`, com `direto -> 15`, `ig / paid / <id de campanha> -> 1`, `l.instagram.com / referral -> 1`.
- `migrar`: `17 linha(s) com fonte/midia/campanha.`
- `bun run smoke`: 18/18, incluindo `Web App na v3` e `origem P fonte` / `Q midia` / `R campanha` voltando **da planilha**. Linha de teste criada e removida pelo próprio smoke; `rows` de volta a 17.
- Primeiro toque conferido em produção pelo link da bio: `otb_aula_attr` grava os três `utm_*`, e uma segunda visita com UTM diferente **não** sobrescreve.

G6 (lead E2E pelo formulário) e G7 (purge) **dispensados por decisão**: os elos que faltavam eram renderização no painel/CSV e gravação no CRM, ambos já exercitados por leads reais em produção, e o único elo genuinamente não coberto — a captura no `localStorage` — foi provado acima sem enviar nada. O custo era um evento `Lead` irremovível no Meta, um registro no CRM e uma notificação ao time.

> **Achado do runbook.** As 8 linhas até 17/08 tinham P/Q/R preenchidas e as 9 seguintes não. Causa: em 17/08 o `Code.gs` novo foi colado no editor e `migrar()` rodou (o `migrar` usa o código do editor), mas a implantação publicada continuou na versão antiga de 15 colunas — então o `doPost` que atende o site gravava só até a coluna O. Paste sem publish, sem erro e sem sintoma óbvio. É exatamente o que o assert de versão no `pingLeadStore` passou a pegar.

### Registrado, não corrigido

- O container GTM `GTM-MVQW6VLD` é hardcoded e carrega sem gate de consentimento, enquanto Pixel e GA4 são gated por env (decisão D4).
- O `event_id` da CAPI `Lead` não pareia com nada desde `9648e48`.
- `Layout.astro` não tem `viewport-fit=cover`, então **todo `env(safe-area-inset-bottom)` do repo avalia como 0** hoje.
- Reinscrição sem UTM sobrescreve a origem da linha com `direto`.

---

Histórico desta instância. Governança portável vive em `AGENTS.md` / `.claude/`; aqui ficam só os aprendizados e decisões específicos do projeto.

---

## 2026-08-18 — Deploy quebrado por `.vercelignore`: padrão sem barra inicial

Depois do commit do registro v2, o deploy de produção falhou. O relato foi "parou o deploy automático" — a integração nunca parou: ela disparou 13 segundos depois do push e o **build** é que morreu.

```
Cloning github.com/GrupoUS/aula-otb (Branch: main, Commit: f35a412)
Found .vercelignore
Removed 287 ignored files defined in .vercelignore
[ERROR] [vite] ✗ Build failed in 78ms
Could not resolve "../scripts/motion.ts" from "src/layouts/Layout.astro"
```

### Causa

`.vercelignore` tinha a linha `scripts` **sem barra inicial**. Em sintaxe gitignore isso casa com **qualquer pasta chamada `scripts`, em qualquer profundidade** — e o motor de movimento tinha acabado de nascer em `src/scripts/motion.ts`. A Vercel apagou a pasta no upload; o Rollup não achou o import.

Os três gates locais passam verdes nesse cenário: **`.vercelignore` não é aplicado por `bun run build`**. É um ponto cego estrutural, não um descuido pontual.

### Correção

Padrões de pasta de tooling da raiz foram ancorados — `/.claude`, `/.planning`, `/docs`, `/evals`, `/scripts`. Padrões de artefato (`node_modules`, `dist`, `*.log`) seguem soltos de propósito: ali casar em qualquer nível é o comportamento desejado. Comentário no arquivo registra o porquê, para ninguém "limpar" a barra depois.

### Guarda contra reincidência

`scripts/verify-vercel-upload.mjs` (novo) reproduz o filtro com o matcher do git e falha se qualquer arquivo de `src/`, `public/` ou config de build sumir do upload. Passo 9 do gate manual em `.claude/rules/commit.md`. Com `--build`, copia só o conjunto que sobe e roda o pipeline da Vercel isolado.

### Verificação (evidência)

- **Simulação fiel**: o conjunto de upload calculado localmente deu **287 arquivos removidos** — exatamente o número do log da Vercel. Depois da correção: 286, com `src/scripts/motion.ts` preservado e as pastas da raiz ainda ignoradas.
- **Controle positivo**: `bun install --frozen-lockfile && bun run build` sobre uma cópia contendo só os 113 arquivos que sobem → **exit 0**, com `#virada`, 8 placas, marquee, `data-enter` e as fotos novas no HTML.
- **Controle negativo**: a mesma cópia sem `src/scripts/` → **exit 1** com a mensagem idêntica à da Vercel. O simulador reproduz a falha nos dois sentidos.
- **Guarda**: `verify-vercel-upload.mjs` retorna 1 e nomeia `src/scripts/motion.ts` com o `.vercelignore` antigo; 0 com o corrigido.
- **Produção**: deploy do fix `● Ready`; `aulaotb.gpus.com.br` responde 200 servindo `theme-color #000000`, `#virada`, 8 placas e a faixa do acervo.

### Aprendizados técnicos (continuação)

34. **`.vercelignore` é um gate que nenhum gate local roda.** Lint, `astro check` e `build` operam sobre a árvore completa; a Vercel builda um subconjunto. Toda pasta nova dentro de `src/` precisa ser confrontada com esse arquivo — ou o build verde local vira deploy vermelho.
35. **Padrão de ignore sem barra inicial é recursivo.** `scripts` ≠ `/scripts`. A diferença é invisível enquanto não existe uma pasta homônima aninhada, e é catastrófica no dia em que passa a existir.
36. **"O deploy automático parou" quase nunca é a integração.** O alias `…-git-main-…` no deployment e o `Cloning … Commit: <sha>` no log provam que o gatilho funcionou. O que muda é o status do build — e a Vercel mantém o deploy anterior no domínio, então o site fica *parado*, não fora do ar.
37. **`vercel link` edita o `.gitignore`.** Acrescentou `.env*` no fim do arquivo, depois da negação `!.env.example` — e em gitignore o último padrão vence, então passou a ignorar o `.env.example` que o projeto versiona de propósito. Linha removida; as regras de env das linhas 16–18 já cobriam tudo.

---

## 2026-08-18 — Registro visual OTB USA v2: canvas preto, acento crimson e motor de movimento

Pedido: aprimorar o visual e o front-end da landing a partir do projeto de design `OTB USA Landing v2` (claude.ai/design, lido via `DesignSync`). O projeto é o **modelo de design** desta instância (`config.json::project.designModelRepo` → `../otb-usa`), e foi escrito para o repo irmão que vende o MBA. Nada de conteúdo migrou: entrou linguagem visual e vocabulário de movimento. Plano: `docs/analise-o-prompt-abaixo-vast-locket.md`.

### Decisões do usuário

| # | Decisão |
|---|---|
| D1 | **Canvas migra para o quase-preto do v2** — `#000000 / #080808 / #111111`. Navy desce para superfície de card, glass e cor-base de sombra. |
| D2 | **Crimson no registro completo** — placa numerada de seção, gradiente da barra de progresso, anel pulsante da contagem, wash radial, numeral de lista, faixa de credenciais. Gold segue o único acento de CTA/foco. |
| D3 | **As quatro primitivas de movimento** — cascata + fade do hero, parallax + reveal `mask`/`wipe`, tilt + shine, marquee + sticky CTA em todas as larguras. |
| D4 | **As quatro seções novas** — seção de tensão, placas numeradas, faixa de fotos, barra de transparência. |

### O que mudou

- `global.css` — 4 tokens `--color-ink-*`; as 3 utilities de banda reapontadas; `--shadow-panel/lift` passam a misturar sobre `ink-950`; keyframes `reveal-mask`, `reveal-wipe`, `enter-rise`, `marquee-scroll`, `cta-shine`, `ping-ring`; seletores `[data-enter]`, `[data-marquee]`, `[data-shine]`, `[data-tilt]`, `[data-sticky-cta]` e as utilities `section-plate` / `ping-ring`.
- `src/scripts/motion.ts` (novo) — motor único do movimento dirigido por scroll. Absorveu o IntersectionObserver de reveal e o preenchimento da barra de progresso, que viviam soltos em `Layout.astro`, e o script próprio do botão flutuante do WhatsApp: de 3 listeners de `scroll` para 1 (visual) + 1 (tracking, intocado).
- Seções novas: `Virada.astro` (placa 01, tensão antes da oferta), `GalleryMarquee.astro` (faixa do acervo), `TransparencyBar.astro` (3 recortes verificáveis do `legal.disclaimer`).
- `SectionPlate.astro` (novo) — placa numerada + rótulo, consumida por `SectionHeading` e por quem monta o próprio cabeçalho. A espinha passou de 3 seções numeradas para 8 contínuas.
- `ProofBar.astro` — de card de vidro para banda crimson full-bleed com marquee, preservando o `note` de cada item como segmento secundário da mesma linha.
- Schema + JSON numa só mudança: `virada`, `gallery`, `transparency`. `gallery.photos[].key` é enum de `GALLERY_KEYS` (`src/lib/gallery.ts`), com o mapa de assets em `src/lib/gallery-images.ts`, no molde de `speakers.ts` / `speaker-portraits.ts`.
- `MobileCTABar` deixou de ser mobile-only; `Header`/`Footer`/`config.json` ganharam a âncora `#virada`; `<meta theme-color>` passou a espelhar `ink-950`.

### Aprendizados técnicos

25. **Dois efeitos disputando o mesmo pseudo-elemento: um simplesmente some.** `data-shine` nasceu em `::after` e nunca apareceu no CTA — `.btn-primary::after` já usava o slot com a mesma especificidade (0,1,1) e vem depois no arquivo. Mover o sweep contínuo para `::before` (com `isolation: isolate` e `z-index: -1`) resolve, e a regra vira vocabulário: efeito novo em elemento que já tem pseudo-elemento precisa checar o slot antes, não depois.
26. **Marquee sem contrato de estado anima metade vazia.** A animação só pode ligar depois que o JS duplicou os filhos — daí `.marquee-ready`. E `padding-inline` no trilho quebra a emenda do `-50%`: o padding não se repete na cópia. O estado empilhado (sem JS, ou sob `reduce`) fica com o padding; o trilho zera.
27. **`data-enter` cobra LCP em milissegundo de `opacity: 0`.** O Chrome não conta como pintado um elemento invisível, então a cascata do hero adia o candidato a LCP pelo próprio delay. Contar o delay a partir do índice 1 (`(n − 1) × 50ms`) mantém a cascata legível e devolve o primeiro item ao frame inicial.
28. **Servidor local sem compressão exagera a regressão de peso em ~4×.** A auditoria contra `python -m http.server` mostrou LCP 3,0 s → 3,5 s; nos bytes que a Vercel realmente entrega (gzip) o acréscimo é de 3,0 KB de HTML e 1,5 KB de CSS. Medir peso em servidor sem `Content-Encoding` mede o artefato errado.
29. **Migrar o fundo para preto melhora contraste, não piora.** O par crítico é o inverso: o mesmo `text-secondary` sai de ~9:1 sobre navy para ~11,5:1 sobre preto, enquanto os cards perdem separação do fundo (`navy-light` sobre `ink-900` = 1,43:1) e passam a depender da borda gold. Quem falhou AA foi o crimson: nota sobre a banda a 70% de opacidade dava 4,16:1 (subiu para 80% → 5,06:1) e o numeral `crimson-bright/85` sobre preto dava 2,80:1 (opacidade cheia → 3,57:1).

### Segunda passada — acervo fotográfico e revisão adversarial

Depois do registro visual, duas frentes: o acervo real do Drive entrou na página, e uma revisão adversarial de 5 lentes sobre o diff devolveu 30 achados (a fase de refutação do workflow tinha um bug de script e não rodou; os achados foram verificados um a um no código).

**Fotos.** O acervo (`OTB - T1 Harvard`, `OTB T2 - 2025`, `Boston`) foi varrido por contact sheet de thumbnails — 80 miniaturas em 5 folhas, em vez de baixar 180 arquivos de 8 a 41 MB. Dez fotos entraram, escolhidas por área: `aula-plateia` (fundo da Virada — plateia vista de trás diz "sala cheia" sem legenda), `aula-anfiteatro` (fundo novo da Learn, que era a única seção sem lastro fotográfico), `turma-escadaria` (fundo do NextStep — a turma inteira é a prova social da oferta) e sete para a faixa do acervo.

**Compliance de imagem.** Boa parte do acervo mostra marca institucional legível — parede "HARVARD MEDICAL SCHOOL", moletons e canecas com o brasão. Nenhuma delas entrou: o `legal.disclaimer` declara que **não há vínculo, patrocínio ou endosso de instituições de ensino locais**, e uma foto com a placa da instituição atrás afirma na imagem o que o texto nega. As escolhidas mostram sala, turma e participantes — não a fachada.

**Vídeo.** `Vídeo OTB.mov` (108 MB, 1280×720, 2min06) ficou de fora: legenda queimada no frame, resolução abaixo das fotos (24 MP) e peso incompatível com uma landing estática. Publicá-lo exigiria recorte, recompressão e decisão de hospedagem — escopo e aprovação que não estavam no pedido.

### Achados da revisão que viraram correção

| Sev | Achado | Correção |
|---|---|---|
| P1 | Nomes do plate duplo do hero presos em `opacity: 0` | A dobra trocou `data-reveal` por `data-enter` e as regras filhas continuavam ancoradas em `[data-reveal].revealed`. Mesma classe de bug do `chip-stagger`, que já tinha sido corrigido — e não foi propagado. |
| P1 | Banner de cookies (z-60) cobria o sticky CTA a partir de 768px | O `md:bottom-0` do banner era seguro enquanto o sticky era mobile-only. Removido: o banner senta acima da barra em todas as larguras. |
| P2 | Sticky cobria a última linha do rodapé | O padding vivia num `<div>` que envolve só as seções; o Footer é irmão dele. Foi para o `<body>`, condicionado a `hasBottomBar`. |
| P2 | Flutuante do WhatsApp sumia para sempre em `/termos` e `/politica-de-privacidade` | O recolhimento passou a exigir que exista um sticky concorrente na página. |
| P2 | Flutuante focável pelo Tab com `opacity: 0` | `visibility: hidden` no estado oculto. |
| P2 | `gold-pulse-glow` nunca pintava nos CTAs primários | Disputava `::after` com `.btn-primary::after`, mesma especificidade, e perdia por ordem de arquivo. O halo passou a animar o `box-shadow` do próprio elemento — sem pseudo-elemento, sem disputa. |
| P2 | Header condensado ainda pintava navy sobre o canvas preto | `#site-header.scrolled` reapontado para `ink-950`. |
| P2 | Copy do sticky hardcoded no `.astro` | Virou `event.stickyTitle` no schema + JSON + leitor. |
| P3 | Marquee saltava metade do `gap` a cada volta | O `gap` do flex fica fora do `-50%`. No trilho o espaçamento virou margem do item, que acompanha a cópia. |
| P3 | Vinheta do hero clareava as bordas | `landing-vignette` usava navy, mais claro que o fundo `ink-950`. |
| P3 | `data-tilt` sem consumidor | Aplicado aos cards da Learn, com o lift do `card-glow-hover` neutralizado (§ 3.5). |
| P3 | `gallery.label` obrigatório e nunca lido | A faixa deixou de ser `aria-hidden`: virou lista rotulada, com alt real por foto e cópias `aria-hidden`. |
| P3 | `transparency.items[].icon` era `z.string()` livre | Virou enum sobre `src/lib/icons.ts`, que agora tipa também o mapa do `Icon.astro`. |
| P3 | Placa de seção hardcoded por componente | `index.astro` conta só as seções renderizadas — seção opcional ausente não abre buraco na espinha. |
| P3 | CSS órfã de `[data-proof-item]` e ícone `message-circle` sem uso | Removidos. |
| P3 | Nota da faixa crimson a 4,43:1 no extremo direito | Subiu para `text-primary/90`. |
| P3 | Meta do sticky em 11px | Subiu para 12px (piso do `DESIGN.md § 4`). |
| P3 | `<ol>`/`<ul>` sem `role="list"` | Safari remove a semântica de lista quando `list-style: none`. |

### Aprendizados técnicos (continuação)

30. **Trocar o gancho de reveal de um contêiner quebra silenciosamente todo filho ancorado nele.** `data-enter` no hero deixou órfãs `[data-duo-plate] figcaption` e `[data-portrait-photo]`, que só animavam sob `[data-reveal].revealed`. O sintoma é conteúdo invisível com build verde, lint verde e a11y 100 — nenhuma auditoria automática pega. Ao trocar o gancho, `grep` por quem depende dele é obrigatório.
31. **Uma barra fixa nova revalida TODO elemento fixo da página.** Sticky em todas as larguras colidiu com o banner de cookies (z-60 contra z-50), com o flutuante do WhatsApp e com a última linha do rodapé. Três regressões de um atributo só.
32. **Contact sheet de thumbnails é a forma barata de escolher foto em acervo grande.** 80 miniaturas do endpoint público do Drive em 5 folhas resolveram a curadoria de ~180 arquivos que somam mais de 2 GB; só as 17 finalistas foram baixadas em alta.
33. **Foto também afirma.** Metade do acervo carrega marca institucional legível, e o disclaimer do produto nega justamente esse vínculo. Compliance de imagem é critério de seleção, não revisão posterior.

### Verificação (evidência)

- `bun run lint` limpo · `bunx astro check` 0 erros (4 hints pré-existentes de zod deprecado) · `bun run build` completo.
- Lighthouse desktop sobre o build estático, `/`: **a11y 100 · best-practices 100 · SEO 100 · performance 88** (baseline em `HEAD`: 100/100/100/91). CLS **0** nas duas versões — parallax, tilt e sticky são só `transform`.
- Smoke por CDP em 1440×900, 1024×768 e 390×844: console limpo, `scrollWidth === clientWidth` no topo e no fim, 2/2 marquees ativos, 9/9 itens da cascata, sticky entra a 80% da viewport nas três larguras com o flutuante recolhendo junto, 42/42 reveals resolvidos ao fim da página.
- `prefers-reduced-motion: reduce`: 0 marquees em movimento, 0 reveals escondidos no topo, `hero-fade` em `opacity: 1`, parallax `none` — e o sticky continua funcionando (é conversão, não decoração).
- JavaScript desabilitado: 13 seções renderizadas, 0 reveals e 0 `data-enter` presos em `opacity: 0`, sticky sem `transform`, marquee empilhado, sem overflow horizontal.
- Scans do gate manual: nenhum hex fora do `@theme` (exceto o `theme-color` documentado), nenhum `wa.me/` fora de `src/lib/whatsapp.ts`, nenhum `console.log`, nenhuma copy nova hardcoded em `.astro`.
- Não verificado: navegação por teclado e leitor de tela reais nas seções novas; render em navegador não-Chromium.

---

## 2026-08-17 — Atribuição de tráfego: UTM de primeiro toque e colunas de origem

Pedido: usar `https://aulaotb.gpus.com.br/?utm_source=iese&utm_medium=paid&utm_campaign=aula-otb-0909` e ver a origem na planilha de leads. A captura de UTM já existia — o que faltava era ela **sobreviver** e ser **legível**.

### Decisões do usuário

| # | Decisão |
|---|---|
| D1 | Três colunas derivadas na planilha: **P `fonte` · Q `midia` · R `campanha`**. Anotações do time passam a começar em **S**. |
| D2 | Janela de atribuição: **primeiro toque (first-touch), 30 dias**, em `localStorage`. Clique no anúncio hoje e inscrição na semana seguinte continuam contando para o `iese`. |

### O que mudou

- `src/lib/leads/attribution.ts` (novo) — SSOT da atribuição: captura/leitura no navegador (`otb_aula_attr`) e `deriveSource()` para painel, CSV e CRM.
- `RegistrationForm.astro` — grava o primeiro toque no load; o submit lê o que foi gravado em vez de reler a querystring.
- `Code.gs` v2 — colunas P/Q/R derivadas da coluna L, `ensureTailHeaders_()` para planilha já existente e função manual `migrar()` que preenche as linhas antigas.
- `/admin/leads` ganhou a coluna **Origem**; o CSV, as colunas `fonte`/`midia`/`campanha`; o CRM, os mesmos três `customFields`.
- `docs/utm.md` (novo) — convenção de nomes e links prontos por canal.

### Aprendizados técnicos

22. **A UTM antiga só existia no instante do submit.** O código lia `window.location.search` dentro do handler: um reload, uma volta de `/termos` ou uma inscrição no dia seguinte gravavam origem vazia — e ninguém percebia, porque o lead chegava normalmente. Persistência é o que torna a UTM confiável, não a captura.
23. **A regra de origem vive espelhada em duas linguagens.** `deriveSource()` (TS) e `source_()` (Apps Script, sem `URL()` — host por regex). Divergir significa o mesmo lead com origens diferentes no painel e na planilha; um harness rodou os dois lados sobre 12 casos (UTM, `gclid`/`fbclid`, referrer externo, referrer do próprio host, referrer inválido) e obteve saída idêntica.
24. **`writeRow_` escreve a linha inteira, então "coluna do time" é contrato, não convenção.** Passar de 15 para 18 colunas move a fronteira de P para S. `migrar` audita P/Q/R **antes** de escrever qualquer coisa (`conflitoDerivadas_`) e aborta nomeando a célula (`P1 = "notas"`, `Q7`) quando encontra conteúdo que a v1 não poderia ter escrito — um aviso no runbook não impediria o `capture_` de apagar a anotação no primeiro lead novo.

### Verificação (evidência)

- `bun run lint` limpo · `bunx astro check` 0 erros · `bun run build` completo.
- Espelho TS ↔ Apps Script: 12/12 casos idênticos.
- Guarda de `migrar` sobre aba falsa: 6/6 (P/Q/R vazias, já migrada, cabeçalho do time, dado sem cabeçalho, aba de 15 colunas, aba vazia) + `colLetra_` 5/5.
- Bundle do script do formulário: 4,2 KB (inclui a atribuição).
- Não verificado ainda em produção: `migrar()` na planilha real e um lead ponta-a-ponta — ambos dependem do redeploy do Web App. **Resolvido em 2026-08-19**: Web App republicado (v3), `migrar` aplicado e atribuição conferida ponta a ponta. Ver a entrada de 2026-08-19 abaixo.

---

## 2026-08-17 — Fechamento da issue #1: resíduos, código morto e QA medido

Último quilômetro da [issue #1](https://github.com/GrupoUS/aula-otb/issues/1). O corpo do trabalho tinha sido entregue em 12–13/08; faltavam três resíduos visíveis ao lead, a limpeza do código que a própria issue aposentou, e a verificação que o critério 6 exige. Plano: `docs/analise-a-issue-1-harmonic-fiddle.md`.

### Decisões do usuário

| # | Decisão |
|---|---|
| D1 | A aula **não fica gravada**. O FAQ "Vou receber a gravação?" perdeu o marcador `[confirmar]` e passou a afirmar isso, transformando a resposta em argumento de presença. |
| D2 | Honorífico nos cinco: Dra. Sacha Gualberto, Dra. Carol Teixeira, Dr. Dieick de Sá, Dra. Rosana Vecchi, Dr. Kassyo Lobato. A titulação dos três que não constavam em nenhum material foi autorizada pelo usuário nesta data. |
| D2b | "Ana Carolina" → **"Carol Teixeira"**, o nome que ela usa. Só o campo `nome` mudou; a chave do retrato segue `speaker-carol`, então o plate da primeira dobra e o card do roster continuam apontando para o mesmo arquivo. |
| D3 | `Authority.astro` e `Testimonials.astro` deletados, junto com os campos `authority`, `testimonials`, `testimonialsMeta` e `authorityProof` do schema. |

### Também nesta entrega

- **Autoridade coletiva chegou às camadas que a issue não tinha varrido.** A página inteira já falava em corpo docente, mas a `description` do `EducationalOrganization` (`Layout.astro`) e a tagline do `Footer.astro` continuavam dizendo "com a Dra. Sacha Gualberto". O `founder` do JSON-LD e o `aria-label` do Instagram ficaram como estavam: são fatos institucionais dela, não autoria da aula.
- `sacha-authority.jpg` saiu com o componente que a usava.
- `scripts/lighthouse-audit.mjs` auditava `/otb`, rota que nunca existiu aqui — resíduo do fork do `otb-usa`. Agora audita `/`, `/termos` e `/politica-de-privacidade`.

### Aprendizados técnicos

19. **`facultySameAs` casa por nome exato.** O mapa de perfis sociais em `index.astro` é indexado pelo `nome` do docente. Renomear a Sacha para "Dra. Sacha Gualberto" sem atualizar a chave apagaria o `sameAs` do `Person` no JSON-LD **com o build verde** — o mapa simplesmente não encontraria ninguém. Conferido no HTML gerado: o único `sameAs` continua no lugar e os outros quatro seguem sem perfil inventado.
20. **O `lg:min-h-[2lh]` do `Faculty.astro` já pagava pelo honorífico.** Medido em Chrome headless: em 1440 os cinco nomes passaram a quebrar em 2 linhas — uniformemente — e os cinco `bioTops` fecharam em 6680px, exatamente alinhados. Em 390 e 768 todos cabem em 1 linha e as bios pareiam. O `figcaption` do `DuoPortrait` também segurou: "Dra. Sacha Gualberto" e "Dra. Carol Teixeira" ficam em 1 linha nas chapas de 154/184/216px. Nenhum ajuste de CSS foi necessário — o receio de wrap era real, a reserva de 2 linhas do audit anterior é que já cobria.
21. **O banner de consentimento cobre o submit do formulário em 1440×1000.** Medido: card em y 889–1000 / x 384–1056; botão "Quero garantir meu lugar!" do form em y 947–995, coluna x ~830–1360. É o irmão desktop do aprendizado #9 e é **pré-existente** — nada desta entrega mexeu na geometria. Não foi corrigido de propósito: com barra fixa de 111px e viewport de 1000px, toda alternativa medida troca um elemento da dobra por outro (ancorar à esquerda cobre os chips com a data da aula, que o critério 1 exige visíveis; ancorar à direita cobre o mesmo submit). O submit libera com qualquer scroll ou ao dispensar o banner.

### Verificação (evidência)

- `bun run lint` limpo, `bunx astro check` com 0 erros / 0 warnings, `bun run build` completo.
- Greps negativos vazios: `22 de abril|dubai|mariana|laranja`, `[confirmar]`, `Ana Carolina`, `console.log`, hex fora do `@theme`, `wa.me/` fora de `src/lib/whatsapp.ts`.
- Funil dirigido em headless com o endpoint ausente (nenhum lead de teste chegou à planilha): submit vazio devolve os 4 erros por campo com `aria-invalid`; submit válido cai no fallback WhatsApp com o prefixo "Olá, Laura!", esconde o form, revela `#registration-success` (`role="status"`, `tabindex="-1"`) com "Inscrição confirmada!", entrega o `.ics` como data URI e o convite do grupo. `lead_submit` **não** dispara nesse caminho — é do caminho de sucesso real, por desenho dos commits `4ac0750`/`9648e48`.

  > **Comportamento superado pela issue #2:** hoje o endpoint ausente leva ao painel de erro, não ao painel de sucesso. Ver `scripts/check-form-states.mjs`.
- Sem overflow horizontal em 390, 768 e 1440. Primeira dobra desktop: retratos 186–492, `h1` 516–813, formulário 338–1096 com submit em 947–995. Mobile 390×844: retratos 130–352, CTA do hero 705–753, barra fixa 780–832.
- `prefers-reduced-motion: reduce` emulado: 0 animações rodando, durações colapsadas, nenhum `[data-reveal]` preso em `opacity: 0`.
- Lighthouse (advisory): `/` 91 perf · **100 a11y** · 92 BP · 100 SEO; `/termos` 95/96/92/100; `/politica-de-privacidade` 96/96/92/100.

### Pendências que sobrevivem (fora da issue #1)

Pixel do OTB a definir, `apple-touch-icon.png` ainda do TRINTAE3, temas de palestra da Sacha e da Carol ("AINDA NÃO DEFINIU"), e o `RegistrationForm` mostrando sucesso quando o `fetch` rejeita — decisão consciente de conversão, mexer nela muda semântica de destino do lead.

---

## 2026-08-12 (tarde) — `/design-improve` no corpo docente: set fotográfico novo + 5 fases impeccable

O material real dos docentes chegou em `docs/Corpo Docente/` (fotos + temas de palestra em `.docx`). O set inteiro de retratos foi trocado e a seção passou pelo chain `audit → bolder → animate → colorize → overdrive`, cada fase com `frontend-specialist` e relatório em `.claude/agent-memory/design-improve/`.

### Fotos

Os cinco retratos saíram do acervo do `otb-usa` (cinco ensaios diferentes) e passaram a vir da sessão nova, que é coerente: fundo neutro de estúdio, figurino preto/bege, acentos gold. Recorte 1:1 em 1240px via `sharp`, enquadramento peito-acima igual para todos. Kassyo entrou de `IMG_5191`; a Sacha foi re-cropada uma segunda vez porque o primeiro corte a deixava em plano aberto e o rosto dela ficava menor que o dos outros quatro.

### Copy

Bios de Dieick, Rosana e Kassyo reescritas com o material que eles mandaram (raciocínio clínico de material/plano/dose; arquitetura tecidual e matriz extracelular; neocolagênese e biomateriais). Sacha e Carol responderam "AINDA NÃO DEFINIU" — bios mantidas.

O h2 da seção deixou de repetir o eyebrow: "Quem conduz a aula" (pergunta) → "Os mesmos profissionais que conduzem a imersão do OTB em Boston" (resposta), com o convite descendo para a subheadline.

### Aprendizados técnicos

14. **Fundo de estúdio inconsistente não se resolve com filete.** Os cinco retratos tinham matizes de fundo em 22°/39°/119°/78°/27° — Δ97°, o Dieick puxando para verde. A borda gold desenha o contorno, não corrige luminância. A saída foi uma `@utility portrait-plate` de duas camadas (grade fixa no campo de fundo + atmosfera que abre no hover), toda em `color-mix` sobre `--color-navy-deep`. Resultado medido: Δ97° → Δ41°, todos convergindo para os 283° da própria paleta, com perda máxima de 0.023 okL no rosto.
15. **`::before` some quando o irmão tem `transform`.** Elemento transformado vira contexto de empilhamento pintado em ordem de árvore, então o `scale()` da foto cobria a grade justamente no hover. `isolation: isolate` + `z-index` explícito resolve.
16. **`animation-timeline: view()` não avança quando declarado no pseudo-elemento** (Chrome): a `ViewTimeline` é criada e a `animation-range` resolve, mas o tempo fica parado. Precisa viver no elemento real e chegar ao pseudo por propriedade registrada (`@property`).
17. **Duas armadilhas do biome que moldam o CSS:** `noDescendingSpecificity` reprova qualquer seletor terminado em `img` depois de `#site-header img`, mesmo sem interseção — daí `[data-portrait-photo]`. E `noDuplicateCustomProperties` trata o `@keyframes` inteiro como um escopo, o que proíbe declarar a mesma custom property em `from` e `to`; a saída é um keyframe só + `animation-direction: alternate`.
18. **Chrome headless mente três vezes na medição de motion:** roda com `prefers-reduced-motion: reduce` por padrão; `Emulation.setEmulatedMedia` ignora `hover`/`pointer` (quem vira a chave é `isMobile`+`hasTouch` no `setViewport`); e `page.screenshot({clip})` reseta a `ViewTimeline` e derruba o `:hover`.

### Integridade do claim do h2 — confirmado

O h2 afirma que o corpo docente listado conduz a imersão de Boston. Quatro deles constam no roster do `otb-usa` (Sacha, Ana Carolina, Dieick, Rosana) e **Kassyo Lobato não constava**. Confirmado pelo usuário em 2026-08-12: ele entrou agora como professor novo e dará aula em Boston. A afirmação vale para os cinco; título mantido.

> O roster do repo irmão `otb-usa` (`src/content/products/otb.json:268-302`) segue com 4 speakers e está desatualizado em relação a este. Sincronizar lá é trabalho de outro projeto.

---

## 2026-08-12 — Issue #1: landing reescrita com a Ação OTB como referência

[Issue #1](https://github.com/GrupoUS/aula-otb/issues/1). A landing foi reorganizada para reproduzir a composição, o ritmo narrativo e os pontos de copy de `drasacha.com.br/acaootb/`, adaptados à edição atual. Plano: `docs/plans/2026-08-12-issue-1-evolucao-aula-otb.md`.

### O que mudou

| Mudança | Detalhe |
|---|---|
| **Nova ordem narrativa** | Hero → ProofBar → Learn → Audience → Comparison → Mechanism → **Faculty** → NextStep → FAQ → FinalCTA. Antes, `Learn` vinha depois de `Audience` e `Comparison` depois de `Authority`, quebrando o encadeamento promessa → acesso → dor → contraste → mecanismo → docentes → convite. |
| **`Authority` (pessoa única) → `Faculty` (corpo docente)** | A aula é entrega coletiva. Novo bloco `faculty` no schema + `Faculty.astro` (grid de 4). `Authority.astro` continua no disco, fora do render; `authority` virou opcional no schema. A âncora `#autoridade` foi herdada — nenhum link mudou. |
| **`DuoPortrait` na primeira dobra** | Sacha + Carol acima do h1. Não existe foto das duas juntas: o plate compõe os dois retratos editoriais. Trocável por uma foto composta sem tocar no Hero. |
| **`hero.duo` no schema** | Array de exatamente 2 chaves de `SPEAKER_KEYS`. Escolhe **quem** aparece na dobra; `faculty.lista` diz **como se chama**. Sem nome próprio em componente. |
| **`faculty.lista[].foto` virou `z.enum(SPEAKER_KEYS)`** | Era `z.string()`: chave errada sumia da página com build verde. |
| **JSON-LD coletivo** | `Person` singular → array de 4 `Person` + `Event.performer`. `sameAs` só para a Sacha — não se inventa perfil. |

### Aprendizados técnicos

8. **A headline de 7 linhas engolia a primeira dobra.** Com o plate abaixo do `h1`, Sacha e Carol começavam em y≈838 e não apareciam em 1366×768 nem em 1440×900. `order-*` não resolve: só reordena dentro do próprio flex container, e o `h1` é irmão anterior. A correção foi mover o plate no DOM para cima do `h1`. Medido em Edge headless: agora 186–412 em todos os desktops.
9. **Banner de consentimento em `bottom-0` cobria os dois CTAs do mobile.** Em 390×844 o `#cookie-consent` ocupava 635–844 e ocultava o CTA do hero **e** a `MobileCTABar` — 100% do tráfego frio chegava sem CTA clicável. Ancorado acima da barra (`bottom-[calc(5rem+safe-area)]`) e enxugado, a barra voltou a ser clicável. O CTA do hero (715–763) continua coberto enquanto o banner existe: com 80px de barra fixa embaixo, não há aritmética que liberte os dois em 844px de altura.
10. **`role="timer"` já implica `aria-live="off"`.** O `aria-live="polite"` declarado por cima transformava o countdown em live region e enfileirava um anúncio por segundo no leitor de tela. O aviso "ao vivo agora" ganhou `role="status"` próprio.
11. **`""` não é nullish.** `PUBLIC_FORM_ENDPOINT` vazio escapava do `??` e o form fazia POST para a própria página. Trocado por `.trim() || fallback`.
12. **`{/* … */}` dentro da lista de atributos quebra o parser do Astro** — `bun run build` passa, `astro check` acusa `ts(1005)`. Comentário de markup vai acima do elemento.
13. **Frontmatter de `.astro` não exporta.** Compartilhar o mapa de retratos entre `Faculty` e `DuoPortrait` exigiu extrair para `src/lib/speaker-portraits.ts`; as chaves ficaram em `src/lib/speakers.ts` porque `content.config.ts` não pode tocar `astro:assets`.

### Pendências desta entrega

- **Kassyo Lobato entrou na mesma sessão**: o material chegou em `docs/Corpo Docente/` durante a implementação (7 fotos + `Informações palestrante.docx`). Retrato gerado de `IMG_5191.JPG` com recorte 1:1 em 1240px via `sharp`, no mesmo enquadramento dos outros. Roster fechou em 5 e o grid do `Faculty` passou a derivar as colunas do tamanho do roster (5 → `lg:grid-cols-5`) para não deixar célula vazia.
- **Grafia divergente**: o material do Kassyo pede explicitamente "Dr. Kassyo Lobato", enquanto os outros quatro aparecem sem honorífico. Prevaleceu a grafia pedida pela pessoa. Normalizar (com ou sem "Dr./Dra." para todos) é uma decisão de marca pendente.
- **Fotos novas não aproveitadas**: `docs/Corpo Docente/` traz retratos inéditos de Sacha, Carol, Dieick e Rosana. Os retratos em uso continuam sendo os aprovados do `otb-usa`; trocar é opcional.
- **Temas de palestra recebidos** (Dieick, Rosana, Kassyo) ainda não entraram na landing — Sacha e Carol constam como "AINDA NÃO DEFINIU".
- `RegistrationForm` ainda mostra "Inscrição confirmada!" quando o `fetch` **rejeita** (offline/DNS/CORS) e o `window.open` do fallback é bloqueado fora da ativação do gesto. Comportamento pré-existente, fora do escopo da issue #1 — mudá-lo mexe na semântica de destino do lead.

---

## 2026-08-10 — Nascimento do projeto (fork de `aula-trintae3`)

`F:\Projetos\aula-otb` era uma cópia crua de arquivos do projeto `aula-trintae3` (landing da aula gratuita TRINTAE3, em produção em `aula33.gpus.com.br`). Convertido em site independente: **`aulaotb.gpus.com.br`**, landing de inscrição para a aula gratuita e ao vivo de **9 de setembro de 2026, 19h (Brasília), no Zoom**, com o **OTB Estados Unidos 3ª edição (Boston, 19–21 abr 2027)** como oferta de saída.

### Decisões estruturais

| Decisão | Por quê |
|---|---|
| Store de leads: **Google Sheets via Apps Script**, não NeonDB | O time comercial opera em planilha. Zero dependência npm, zero banco, zero conta nova. O painel `/admin` continua com login, filtros, marcação de contatado e CSV. |
| Canon visual: **OTB**, não TRINTAE3 | Sora + gold `#d4af37` + acento crimson + `radius-plate` 2px + seções bandeadas. A landing da aula precisa parecer o mesmo produto que ela vende. |
| **Depoimentos removidos da página** | Os 6 depoimentos herdados eram de alunos do TRINTAE3/M33 descrevendo uma formação presencial de 3 dias. Reetiquetá-los como prova social do OTB seria depoimento fabricado. Substituídos pelo fato confirmado "duas turmas já foram a Boston" na `proofBar`. |
| **`successState.group` omitido do JSON** | O schema valida só o domínio `chat.whatsapp.com`. Reaproveitar o convite do grupo do TRINTAE3 passaria em todos os gates e mandaria os leads do OTB para a sala errada — falha silenciosa. Melhor não renderizar o card do que renderizar errado. |
| Sem bloco de schema novo para a oferta | `nextStep` + `mechanism.pillars` + `comparison` + `faqs` carregam o OTB inteiro como prosa. Um bloco `otbOffer` custaria schema + JSON + componente + wiring para conteúdo que lê bem em três parágrafos. |

### Riscos herdados encontrados e corrigidos

- `.vercel/repo.json` ainda apontava para o projeto Vercel **`aula-trintae3`**. Um `vercel deploy` nessa pasta teria sobrescrito `aula33.gpus.com.br` em produção. Diretório removido.
- `.vercel/.env.production.local`, `.env.preview.local` e `.env.local` carregavam segredos de produção do aula33. Removidos.
- **Não existia `.gitignore`.** Um `git init` + `git add -A` teria commitado `node_modules/`, `dist/` e os segredos acima. Criado antes de qualquer comando git, endurecido com `.env.*` + `!.env.example` (o `.gitignore` do `otb-usa` só ignora `.env` e `.env.production`, deixando `.env.local` passar).
- `package.json` declarava `name: "otb-usa"` — colisão com o repo irmão, resquício de clone anterior.
- `node_modules/` copiado estava incompleto (`oxlint` faltando); `bun install` resolveu.

### Aprendizados técnicos

1. **`protectedFiles.exact` casa por basename.** O hook compara `PurePath(file_path).name`, então a entrada `"src/lib/whatsapp.ts"` **nunca casava** — o arquivo mais crítico do repo estava desprotegido desde sempre. Entradas com caminho precisam virar basename. `contains` faz substring no caminho inteiro, o que quebra no Windows (separador `\`).
2. **Tailwind v4 descarta classe desconhecida em silêncio.** Remover `--font-serif` com 32 `font-serif` vivos não gera erro: o build fica verde e os títulos caem para Inter. O gate real é `grep`, não CI.
3. **`var(--token, fallback)` esconde token removido.** Dois componentes usavam `var(--ease-out-soft, ease)`; renomear o token os degradaria para `ease` sem nenhum sinal.
4. **`animation-fill-mode: forwards` mascara hover.** O sistema de reveal herdado congelava o transform final e já tinha uma gambiarra ("o hover DEVE ser transform-free") escrita para conviver com o bug. Trocado por `backwards` + longhand, o que também eliminou os `!important` do stagger. Detalhe em `docs/motion-depth-playbook.md`.
5. **Apps Script sempre responde HTTP 200.** `ContentService` não define status. Erro de script volta HTML; deployment mal configurado volta 302 para a tela de login do Google. O cliente decide por `body.ok` e trata "corpo não começa com `{`" como `store_invalid_response`.
6. **`doPost(e)` não enxerga headers.** O segredo compartilhado viaja no corpo, não em header de autorização.
7. **O formulário mostrava sucesso mesmo falhando** — e isso está certo para conversão (o lead realmente chega na SDR pelo WhatsApp). O defeito era observabilidade: ninguém ficava sabendo. Agora há `console.error` sem PII no servidor, `notifyLeadOwner("lead_capture_failed", …)` como canal degradado, e o evento `form_submit_fallback` comparável a `form_submit_success` no GA4/Meta.

   > **REVOGADO pela issue #2 (2026-08-18).** A premissa "o lead realmente chega na SDR pelo WhatsApp" não se sustentava: o `window.open()` acontecia **depois** de um `await`, fora do gesto do usuário, então um popup blocker o barrava em silêncio — e a pessoa lia "Inscrição confirmada" sem nada gravado e sem conversa aberta. Além disso `fireGa4Lead()` rodava no `catch`, inflando `generate_lead` no GA4 justamente quando a planilha estava fora do ar. O comportamento atual está descrito na entrada de 2026-08-18 abaixo.

### Pendências

- Link do grupo de WhatsApp da aula OTB (ver acima).
- `.env.example` precisa de edição manual — o hook protege `.env*`. Bloco pronto em `docs/planilha-leads.md § 2`.
- Duração da aula (1h30) e o `endDateISO` derivado estão marcados como PROPOSTA.
- `public/apple-touch-icon.png` ainda é o do TRINTAE3 — não há fonte OTB.
- Meta Pixel `926368978957843` continua como fallback em `Layout.astro` e `meta-capi.ts`: é o pixel do aula33. Definir o do OTB ou zerar os dois juntos.
- FAQ "Vou receber a gravação?" está com marcador `[confirmar]`.
