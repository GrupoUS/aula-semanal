# Plano — Adoção do registro visual OTB USA v2 na landing Aula OTB

## Context

O projeto de design `OTB USA Landing v2` (claude.ai/design, importado via `DesignSync`) é o modelo visual aprovado da marca OTB. Ele foi escrito para o repo irmão `GrupoUS/otb-usa` (venda do MBA em Boston, abr/2027) — e `.claude/config.json::project.designModelRepo` já aponta para `../otb-usa` como modelo de design desta instância.

Este repo (`aula-otb`) é a landing de inscrição da **aula gratuita** de 9 set 2026. O v2 entra aqui como **linguagem visual e vocabulário de movimento**, nunca como conteúdo: nenhuma copy, oferta, data, preço, depoimento ou credencial do MBA migra.

Hoje a landing tem um sistema de reveal maduro (`up|left|right|scale` + stagger), `ScrollProgress`, `Countdown`, `MobileCTABar` e bandas tonais — mas está duas gerações atrás do v2 em três eixos: canvas (navy vs quase-preto), acento (crimson tokenizado e **totalmente sem uso**) e movimento (sem cascata de entrada, parallax, tilt, marquee ou shine).

**Resultado pretendido:** a landing da aula lê como o mesmo produto do v2 — mesmo canvas, mesmo acento, mesmo repertório de movimento, mesma narrativa de tensão antes da oferta — mantendo o contrato estático Astro, o SSOT de conteúdo e o funil de lead atuais intactos.

---

## Decisões travadas (respondidas pelo usuário)

| Eixo | Decisão |
|---|---|
| Canvas | **Migrar para quase-preto do v2** — `#000000 / #080808 / #111111`. Navy desce para superfície/glass/sombra. |
| Crimson | **Registro completo do v2** — placas, gradiente do progresso, ping da contagem, wash radial, numerais, faixa de credenciais. Gold segue único acento de CTA/foco. |
| Motion | **Todas as 4 primitivas** — cascata + hero-fade · parallax + reveal mask/wipe · tilt + shine · marquee + sticky em todas as larguras. |
| Seções novas | **Todas as 4** — seção de tensão, placas numeradas, faixa de fotos, barra de transparência. |

## Fora de escopo (guard)

- Copy, oferta, preço, datas ou credenciais do MBA OTB USA.
- Depoimentos (o v2 marca os próprios como rascunho não verificado; sem depoimento real autorizado, não entra).
- Trilho horizontal fixado (`data-hpin`) — o v2 usa para o roteiro de 3 dias em Boston; esta landing não tem conteúdo equivalente.
- Contagem regressiva nova — `Countdown.astro` já existe e já aponta para o evento certo.
- `astro.config.mjs`, `vercel.json`, IDs de tracking, endpoint de lead, `src/lib/whatsapp.ts`.
- Nenhum `.tsx`. React/`motion` estão instalados mas não usados; segue Astro puro + script vanilla.

## Execução

Implemento direto na thread principal, sem spawn de `frontend-specialist`, seguindo a ordem das 5 fases do `/design-improve` (audit → bolder → animate → colorize → overdrive) colapsada nas 5 fases técnicas abaixo. As fases são fortemente acopladas (token → utility → componente); um único dono evita drift entre elas.

---

## Fase 1 — Tokens (`src/styles/global.css`)

**Adicionar ao `@theme`** (linha ~18, junto da paleta navy):

```css
/* Ink — canvas do registro v2. Substitui navy como fundo de banda;
   navy desce para superfície de card, glass e cor-base de sombra. */
--color-ink-950: #000000;  /* band-deep  */
--color-ink-900: #080808;  /* band-base  */
--color-ink-800: #111111;  /* band-alt   */
--color-ink-750: #0b0b0b;  /* célula de dado / inset em grid de 1px */
```

**Reapontar as 3 utilities de banda** (`global.css:153/157/161`): `band-base` → `ink-900`, `band-alt` → `ink-800`, `band-deep` → `ink-950`. Nenhum componente muda de classe — os 11 usos de banda herdam a troca.

**Reapontar as sombras** (`global.css:123-132`): `--shadow-panel|lift|rim` usam `color-mix` sobre `--color-navy-deep`; trocar a base para `--color-ink-950` (sombra sobre preto precisa de base preta, senão fica um halo azul). `--shadow-halo-gold` não muda.

**Ampliar os papéis do crimson** no comentário do bloco (`global.css:29-32`): hoje o canon lista 3 papéis; passa a listar os 6 do v2 (placa de seção, gradiente do progresso, ping da contagem, wash radial de seção, numeral de lista, faixa de credenciais). Continua proibido como cor de CTA ou de erro.

**Keyframes novos** (fora do `@theme`, junto dos existentes):
`marquee-scroll` (`translate3d(0,0,0)` → `translate3d(-50%,0,0)`), `cta-shine` (sweep skewX(-18deg), 4.8s), `ping-ring` (`scale(.55)/opacity .9` → `scale(2)/opacity 0`, 2.6s). `text-gradient-gold-sweep` (`:543`) e `gold-pulse-glow` (`:794`) já cobrem shimmer e halo — reusar, não duplicar.

**Utilities/seletores novos:**

| Seletor | Papel |
|---|---|
| `[data-reveal="mask"]`, `[data-reveal="wipe"]` | `clip-path: inset(0 0 100% 0)` → `inset(0)` em 1s + opacity .25→1. Entra no bloco `[data-reveal]` existente (`:405-448`), herda o gate `html.js` e o `<noscript>` |
| `[data-enter]` | opacity 0 + `translateY(26px)`; `.entered` zera. Delay via `--enter-index` |
| `[data-tilt]` | `transform-style: preserve-3d`; só dentro de `@media (pointer: fine) and (prefers-reduced-motion: no-preference)` |
| `[data-marquee]` | `display:flex; width:max-content; white-space:nowrap` + `animation: marquee-scroll var(--marquee-dur) linear infinite`; `:hover { animation-play-state: paused }`. Sob reduced-motion vira `flex-wrap: wrap; width: auto` |
| `[data-shine]` | `position:relative; overflow:hidden` + `::after` com o sweep (o v2 injeta um `<span>` por JS; um pseudo-elemento entrega o mesmo efeito com zero JS) |
| `.section-plate` | placa numerada: `min-width:42px; height:42px`, `bg-crimson`, Sora 700 14px, `tracking .06em` |

Todo bloco novo entra também no `@media (prefers-reduced-motion: reduce)` correspondente — requisito duro, não advisory.

**Contraste:** a migração para preto **melhora** todos os pares (o mesmo `text-secondary #b8c0d0` sai de ~9:1 sobre `#1a1a2e` para ~11.9:1 sobre `#000`). O risco real é o inverso — cards perdem separação do fundo. Mitigação: cards mantêm `--color-navy-light` / `glass-card` como superfície, e grids de dado usam `ink-750` com gutter de 1px em `gold/14%`, como o hero do v2 (`dl` de 4 células).

---

## Fase 2 — Motor de movimento (`src/scripts/motion.ts`, novo)

Módulo client-side único, sem dependência, importado por `src/layouts/Layout.astro` como `<script>` (Astro bundla e trata o TS).

**Migra para dentro dele:** o `IntersectionObserver` de reveal (`Layout.astro:244-290`) e o preenchimento do `[data-scroll-progress]` (hoje no script compartilhado `:292-414`).

**Não toca:** o resto de `Layout.astro:292-414` — scroll-depth e dispatch de `[data-cro]` são tracking, e tracking exige aprovação. Fica com o próprio listener. Resultado: **um listener visual + um listener de tracking**, ambos `{passive:true}` e throttled por `requestAnimationFrame`.

Contrato de atributos implementado:

| Atributo | Efeito |
|---|---|
| `data-reveal` (`up\|left\|right\|scale\|mask\|wipe`) + `data-reveal-delay` | como hoje, + os dois modos de clip-path |
| `data-enter="1..8"` | cascata no load, 700ms, delay `0.06 × n` |
| `data-hero-fade` | `opacity: 1 - p×0.9`, `translate3d(0, p×46px, 0)`, `p = min(1, scrollY / (0.9 × innerHeight))` |
| `data-parallax data-speed` | `translate3d(0, (centro − centroViewport) × −speed, 0)`; pula elementos fora da viewport ±200px |
| `data-tilt` | `rotateX/Y ±5deg` + `translateY(-4px)`, só em `pointer: fine`; volta em 500ms |
| `data-marquee data-marquee-dur` | duplica os filhos com `aria-hidden="true"` e liga a animação CSS |
| `data-sticky-cta` / `data-float-wa` | acima de `0.8 × innerHeight`: sticky entra (`translateY(0)`), flutuante recolhe (`translateY(160%)`, `opacity 0`, `pointer-events: none`) |

**Gates duros:** tudo desligado sob `prefers-reduced-motion: reduce` (reveal e enter nascem visíveis, marquee vira wrap, parallax/tilt/hero-fade viram no-op). Tudo dentro de `try/catch` que degrada em silêncio — regra E de `.claude/rules/stability.md`. Sem `throw` no topo do módulo.

**Gotchas a respeitar** (`docs/motion-depth-playbook.md`): sem `animation-fill-mode: forwards` em reveal (§3.1 — mata o hover/tilt depois); parallax só em elemento cujo `transform` esteja livre (§3.6); `will-change` só enquanto anima (§3.3); um card com `[data-tilt]` **não** leva hover-lift junto (§3.5).

---

## Fase 3 — Conteúdo: schema + JSON numa só mudança

Cardinal rule 5 — campo novo = `src/content.config.ts` + `src/content/products/aula-otb.json` + leitor, no mesmo commit. `content.config.ts` está em `protectedFiles`: a razão explícita é que as 3 seções novas são copy de produto e não podem viver em componente.

```
virada: { eyebrow, headline, highlight, paragraph, quote,
          blockersTitle, blockers[4]{ titulo, descricao } }

transparency: { items[3]{ icon, title, body } }   // icon = enum Lucide já existente

gallery: { label, photos[4..8]{ key, alt } }      // key = enum de asset de galeria
```

Regras de zod espelhando as existentes: `blockers` exatamente 4, `transparency.items` exatamente 3, `gallery.photos` 4–8, `alt` obrigatório e descritivo.

**Copy de `virada`** — escrita para a aula gratuita, não para o MBA. Estrutura do v2 (tensão → linha em gradiente gold → blockquote → 4 travas), conteúdo próprio. Marcar como **PROPOSTA** no resumo final para a Dra. Sacha aprovar antes do deploy.

**Copy de `transparency`** — reaproveitar o `legal.disclaimer` que já existe no JSON, quebrado em 3 itens verificáveis. Zero afirmação nova.

**Números das placas (01..09) não entram no JSON** — são estrutura, não copy. Passam como prop `plate` de `SectionHeading.astro`.

**Galeria:** existem só 4 JPGs de galeria no disco (`aula-1`, `pratica-1`, `turma-evento-1`, `turma-evento-3`) contra 11 no projeto de design. Criar `src/lib/gallery-images.ts` no molde de `src/lib/speaker-portraits.ts` (import `astro:assets`, mapa por chave) e montar a faixa com os 4 + os 2 retratos de acervo. **Pendência a reportar:** para a faixa render com o fôlego do v2, copiar `networking-1`, `networking-3`, `pratica-2`, `pratica-3`, `turma-completa-boston`, `turma-evento-2`, `turma-harvard-outono` para `src/assets/images/otb/gallery/`.

---

## Fase 4 — Componentes

### Novos

| Arquivo | Conteúdo |
|---|---|
| `src/components/landing/Virada.astro` | Placa 01 + eyebrow, H2 `data-reveal="mask"` com 2ª linha em gradiente gold, parágrafo, blockquote com filete gold 2px, `<ol>` de 4 travas com numeral crimson e fio vertical gold no hover. Foto de fundo `aula-1.jpg` em `opacity .15` + `grayscale(1) contrast(1.1)` com `data-parallax data-speed="0.09"`, coberta por gradiente `ink-950 → 80% → ink-950`. Reusa `SectionPhoto.astro` |
| `src/components/landing/GalleryMarquee.astro` | Faixa full-bleed `aria-hidden="true"`, `data-marquee data-marquee-dur="54"`, altura `clamp(160px,20vh,240px)`, borda gold 16%, `<Image>` de `astro:assets` com `loading="lazy"` + `width`/`height` explícitos |
| `src/components/landing/TransparencyBar.astro` | `border-top` gold 14%, grid `auto-fit minmax(260px,1fr)`, 3 itens com ícone Lucide gold 18px via `shared/Icon.astro` |

### Modificados

| Arquivo | Mudança |
|---|---|
| `Hero.astro` | `data-enter="1..8"` em eyebrow / h1 / subheadline / chips / CTAs / contagem / retrato / barra de dados. `data-hero-fade` no wrapper de conteúdo. Foto de fundo ganha `data-parallax data-speed="0.16"`; dois glows novos (gold `speed .06` topo-esquerda, crimson `speed .1` base-direita). CTA primário ganha `data-shine`. Barra de dados no rodapé vira grid `ink-750` com gutter de 1px em gold/14%, `tabular-nums` |
| `ProofBar.astro` | Grid → `data-marquee data-marquee-dur="30"` sobre fundo `crimson` com hachura `repeating-linear-gradient` + wash, no molde da faixa de credenciais do v2 |
| `SectionHeading.astro` | Prop opcional `plate?: string` → renderiza `.section-plate` crimson ao lado do eyebrow |
| `Learn · Audience · Comparison · Mechanism · Faculty · NextStep · FAQ` | Recebem `plate="02".."09"`. `Faculty` e `Learn`: cards ganham `data-tilt` (e perdem hover-lift concorrente, §3.5). `NextStep` e `FinalCTA`: foto de fundo ganha `data-parallax`, H2 vira `data-reveal="mask"` |
| `Countdown.astro` | Ponto crimson 8px com anel `ping-ring` antes do eyebrow; dígitos em `tabular-nums`; separador `:` em gold/38% |
| `ScrollProgress.astro` | Gradiente `gold-dark→gold→gold-light` vira `crimson-bright → crimson 45% → gold` (v2) |
| `MobileCTABar.astro` | Perde `md:hidden`, ganha `data-sticky-cta` + `translateY(100%)` inicial. Conteúdo vira 2 colunas: esquerda com label + linha de meta em uppercase, direita com CTA gold `data-shine`. `hasBottomBar` do Layout passa a valer em todas as larguras |
| `WhatsAppFloatingButton.astro` | Ganha `data-float-wa` para recolher no mesmo limiar do sticky (evita dois CTAs concorrentes e clique invisível) |
| `Header.astro` / `Footer.astro` | Entrada `#virada` na navegação |
| `Layout.astro` | `<meta theme-color>` `#1a1a2e` → `#000000` (a exceção documentada exige espelhar a cor de fundo real; o comentário de `:140` acompanha). Importa `src/scripts/motion.ts`. Remove o bloco de reveal `:244-290` e o preenchimento do progresso, migrados |
| `src/pages/index.astro` | Insere `Virada` depois de `ProofBar`, `GalleryMarquee` depois de `Faculty`, `TransparencyBar` antes de `FinalCTA`. Passa `plate` a cada seção |
| `.claude/config.json` | `#virada` em `content.anchors` e `content.sections.virada` |

**Ordem final:** Hero → ProofBar (marquee) → **01 Virada** → 02 Learn → 03 Audience → 04 Comparison → 05 Mechanism → 06 Faculty → **Galeria** → 07 NextStep → 08 FAQ → **Transparência** → FinalCTA → sticky + flutuante.

---

## Fase 5 — Overdrive e limpeza

Passe final de intensidade sobre o resultado: wash radial crimson no CTA final (`radial-gradient(ellipse at 50% 120%, crimson/30%, transparent 60%)`), halo gold no CTA primário, e o teste Maestro (Safe Split · Bento Trap · Blue Trap · Line Trap · Glass · Glow) rodado sobre a página inteira.

Limpeza que o audit já identificou: `card-hover-lift` é referenciado em comentário (`global.css:937`, `Faculty.astro:93`) mas **não existe**; `carousel-track` (`global.css:1538`) é definido e não tem consumidor — remover ou apontar para a faixa de fotos.

---

## Verificação

```bash
bun run lint
bunx astro check
bun run build
```

Depois, o gate manual de `.claude/rules/commit.md`:

1. **Scan de hex** — `grep -rn "bg-\[#\|text-\[#\|border-\[#\|#[0-9a-fA-F]\{3,8\}" src/components src/layouts src/pages` → vazio. Único hex fora do `@theme` permitido: `<meta theme-color>` em `Layout.astro:141`.
2. **Scan WhatsApp** — nenhum `wa.me/` fora de `src/lib/whatsapp.ts`.
3. **Content drift** — nenhuma copy das 3 seções novas hardcoded em `.astro`.
4. `console.log` / `debugger` — zero.

Smoke de runtime em `bun run dev` (1440×900, 1024×768, 390×844):

5. Sem erro de console; `document.scrollWidth === document.documentElement.clientWidth` (marquee não pode vazar overflow horizontal).
6. Hero: cascata visível no load, dois glows em parallax, fade ao rolar, contagem correta.
7. Marquees rodando e pausando no `hover`; sticky entra a 80% da viewport em **todas** as larguras e o flutuante do WhatsApp recolhe no mesmo instante.
8. Tab a partir do topo → primeiro foco é o skip link; foco visível em todo interativo; FAQ abre com Enter/Espaço.
9. DevTools → Rendering → `prefers-reduced-motion: reduce`: página 100% legível e estática, marquee em wrap, nada de parallax/tilt.
10. DevTools → JS desabilitado: todas as seções visíveis (o `<noscript>` e o gate `html.js` cobrem os novos `data-enter` / `data-reveal="mask"` também).
11. `bun run lighthouse:audit` contra o preview: CLS < 0.05 (parallax e tilt são `transform` puro, não podem gerar shift), A11y ≥ 95.

## Pendências a reportar no fim

- Copy de `virada` marcada **PROPOSTA** — precisa de aprovação da Dra. Sacha antes do deploy.
- 7 fotos de galeria do projeto de design ausentes no repo (lista na Fase 3).
- Nenhum push, commit ou deploy sem pedido explícito (main-only workflow).
