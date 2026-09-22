# Motion & Depth Playbook — Aula OTB

Vocabulário de movimento e profundidade desta landing, e as armadilhas que já custaram caro.

`DESIGN.md` delega para cá o detalhe de sombra, glow, 3D e o catálogo de gotchas; `.claude/rules/DESIGN.md § 7` e `§ 9` seguem valendo como regra universal. Tokens vivem em `src/styles/global.css` `@theme`.

---

## 1. Tokens

### Motion

| Token | Valor | Uso |
|---|---|---|
| `--duration-hover` | 160ms | hover/focus de botão, card, link |
| `--duration-reveal` | 520ms | entrada de seção via `[data-reveal]` |
| `--duration-page` | 200ms | condensação do `#site-header` no scroll |
| `--duration-accordion` | 250ms | abertura do `<details>` do FAQ |
| `--stagger-step` | 70ms | passo entre irmãos revelados em sequência |
| `--ease-editorial` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrada — desacelera longo, é a curva padrão |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | saída — acelera, some rápido |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | transições simétricas (header, acordeão) |

### Profundidade

Três tiers, não seis. A escala antiga (`depth-1`..`depth-6`) foi removida: o namespace `--shadow-*` do Tailwind v4 já gera as utilities a partir dos tokens, então declarar `@utility` era duplicação pura.

| Token → utility | Papel |
|---|---|
| `--shadow-panel` → `shadow-panel` | placa em repouso: card, header condensado |
| `--shadow-lift` → `shadow-lift` | elevação em hover, modal |
| `--shadow-halo-gold` → `shadow-halo-gold` | halo de CTA — a única sombra colorida do sistema |
| `--shadow-rim` → `shadow-rim` | filete interno de 1px, dá borda de vidro |

Todas usam `color-mix` sobre `--color-navy-deep`, então acompanham a paleta sozinhas.

### Forma

`--radius-plate: 2px` → `rounded-plate`. **Fotografia e superfície são retilíneas; só chrome interativo é redondo.** Placas (`glass-card`, cards de seção, painel do formulário) usam `rounded-plate`. Botões usam `rounded-lg`. Pills, chips, dots e botões de ícone continuam `rounded-full`.

---

## 2. Sistema de reveal

```html
<div data-reveal="up" data-reveal-delay="2">…</div>
```

- `data-reveal` aceita `up` | `left` | `right` | `scale` | `mask` | `wipe`.
- `data-reveal-delay="1".."10"` só define `--reveal-index`; o delay real é `calc(var(--reveal-index) * var(--stagger-step))`.
- Para listas maiores que 10, use `style="--reveal-index: 14"` direto.
- O IntersectionObserver vive em `src/scripts/motion.ts` e apenas acrescenta a classe `.revealed`.
- Tudo é gated por `html.js`: se o script inline não rodar, o conteúdo nasce visível. Existe também um `<noscript>` que força `opacity: 1`.

`mask` e `wipe` revelam por `clip-path` (`inset(0 0 100% 0)` de baixo para cima, `inset(0 100% 0 0)` da esquerda), em 1s, **sem tocar em `transform`**. É por isso que são a escolha certa para um H2 que carrega gradiente, ou para uma placa que o hover ou o parallax vão animar depois: o transform permanece livre (gotcha 3.1).

---

## 2.1 Primitivas do registro v2

`src/scripts/motion.ts` é o dono único do trabalho visual dirigido por scroll — um listener `scroll` passivo com throttle por `requestAnimationFrame`. O listener de tracking (scroll-depth + `[data-cro]`) segue separado em `Layout.astro`; mexer nele exige aprovação.

| Atributo | Efeito | Sob `reduce` |
|---|---|---|
| `data-enter="1..8"` | Cascata de entrada no load: 560ms, delay `(n − 1) × 50ms`. O delay conta a partir de 1 de propósito — o primeiro item do hero é o candidato a LCP, e tempo em `opacity: 0` é tempo que o Chrome não conta como pintado. | nasce visível |
| `data-hero-fade` | `opacity: 1 − p × 0.9` e `translate3d(0, p × 46px, 0)`, com `p = min(1, scrollY / (0.9 × innerHeight))`. Aplicado **só na coluna de texto** do hero: a coluna do formulário carrega a âncora `#inscricao` e nunca pode desvanecer. | no-op |
| `data-parallax data-speed` | `translate3d(0, (centro − centroViewport) × −speed, 0)`. Só em elemento com o transform livre (gotcha 3.6) — na prática, `div` decorativa de glow. Elemento fora da viewport ±200px é pulado. | no-op |
| `data-tilt` | `rotateX/Y ±5deg` + `translateY(-4px)` em `pointer: fine`; volta em 500ms limpando o transform inline. Nunca no mesmo elemento que um hover-lift (gotcha 3.5). | no-op |
| `data-marquee` + `--marquee-dur` inline | O script duplica os filhos com `aria-hidden="true"` e acrescenta `.marquee-ready`, que liga `marquee-scroll`. Sem a classe o trilho é uma lista que quebra linha — por isso a animação nunca corre com metade vazia. `padding-inline: 0` no estado ativo mantém a emenda invisível. | fica empilhado |
| `data-shine` | Sweep contínuo via `::before` (nunca `::after`: `.btn-primary::after` já carrega o sweep de hover e a especificidade é idêntica). `isolation: isolate` + `z-index: -1` pintam acima do fundo e abaixo do rótulo. | `opacity: 0` |
| `data-sticky-cta` / `data-float-wa` | Acima de `0.8 × innerHeight` o sticky entra e o flutuante do WhatsApp recolhe. São mutuamente exclusivos: dois CTAs simultâneos competem, e o flutuante ficava clicável por cima do sticky. | transição desligada, alternância mantida |
| `data-scroll-progress` | `scaleX(0..1)` da barra de leitura. | mantido (é orientação, não decoração) |

---

## 3. Gotchas

Cada item aqui já quebrou alguma coisa em produção. A tabela de triagem em `.claude/rules/stability.md` aponta para estes números.

### 3.1 `animation-fill-mode: forwards` mata o hover

**Sintoma:** o card entra bonito, mas depois o hover-lift, o tilt e o parallax não respondem mais.

**Causa:** `forwards` congela o `transform` do último keyframe no elemento. Qualquer `transform` posterior (hover, tilt) briga com um valor travado e perde.

**Correção:** use `backwards` e deixe o estado final vir das próprias regras do elemento:

```css
.js [data-reveal].revealed {
	opacity: 1;                       /* estado final vem daqui, não do keyframe */
	animation-fill-mode: backwards;   /* NUNCA forwards */
	animation-delay: calc(var(--reveal-index, 0) * var(--stagger-step));
}
```

Sintoma correlato: se você precisou escrever "o hover DEVE ser transform-free" em algum comentário, o bug é este.

### 3.2 Shorthand `animation` zera o delay do stagger

**Sintoma:** todos os itens da lista aparecem juntos, e alguém "resolveu" com `!important` no `animation-delay`.

**Causa:** `animation: reveal-up 0.5s ease forwards` é shorthand — ele reseta `animation-delay` para `0s`, sobrescrevendo a regra de stagger.

**Correção:** propriedades longhand (`animation-name`, `animation-duration`, `animation-timing-function`, `animation-fill-mode`, `animation-delay`). Sem `!important`.

### 3.3 `will-change` permanente faz a tela piscar

**Sintoma:** flicker no hover, principalmente em telas com muitos cards de vidro.

**Causa:** `will-change: transform, opacity` em dezenas de elementos promove camadas de composição demais; o compositor thrasha. Piora com `backdrop-filter` sobre fundo animado.

**Correção:** não declare `will-change` em elementos revelados. O reveal é one-shot curto e o navegador compõe bem sem o hint.

### 3.4 Glow em `::before` tinge o texto

**Sintoma:** o texto do card fica com uma camada dourada por cima.

**Causa:** o pseudo-elemento de glow pinta acima do conteúdo.

**Correção:** `z-index: -1` no `::before` — ele passa a pintar acima do fundo e atrás do conteúdo. O pai precisa de `position: relative` (ou `isolate`).

### 3.5 Dois `transform` na mesma regra se anulam

**Sintoma:** o card tem tilt 3D e hover-lift, e nenhum dos dois funciona direito.

**Causa:** `transform` não acumula. A última declaração vence.

**Correção:** um efeito de transform por elemento. Em card com tilt, **o tilt é o hover** — remova o lift.

### 3.6 Parallax só onde o transform está livre

**Sintoma:** o elemento salta ao entrar na viewport.

**Causa:** parallax escreve em `transform`; se o elemento já usa `transform` para se posicionar (centralização por `translate`, por exemplo), os dois brigam.

**Correção:** aplique parallax só em elemento cujo `transform` esteja livre — normalmente uma camada de fundo dedicada, como o `SectionPhoto`.

### 3.7 Seção com fundo sólido não some com a foto

Ordem de pintura do CSS: fundo do pai → descendentes com `z-index` negativo → conteúdo. Por isso `SectionPhoto` em `-z-10` continua visível mesmo com `band-deep` na `<section>` — a banda vira a cor de base ao redor da foto, não uma tampa.

### 3.8 Tailwind engole classe desconhecida em silêncio

**Sintoma:** build verde, página sem estilo.

**Causa:** ao remover um token (`--font-serif`, `--shadow-depth-*`), as classes que o usavam (`font-serif`, `depth-2`) não geram erro — o Tailwind v4 simplesmente não emite a regra.

**Correção:** ao mexer em token, o gate é `grep`, não o build:

```bash
grep -rn "font-serif\|ease-out-soft\|depth-[1-6]" src/   # esperado: vazio
```

---

## 4. `prefers-reduced-motion` — requisito duro

Não é advisory. Todo efeito precisa de saída sob `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
```

Além do reset global, o `global.css` tem blocos direcionados que desligam reveal, parallax, ken-burns, pulso do CTA e o mesh animado. Ao criar um efeito novo, adicione o bloco correspondente — o reset global cobre `animation`/`transition`, mas não cobre efeito conduzido por JS.

Há também um corte por viewport: abaixo de 768px o mesh animado, o `float-gentle` e o pulso dourado ficam desligados para poupar GPU em celular.

---

## 5. Como testar

- DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`** → nada anima.
- DevTools → desabilitar JavaScript → todo conteúdo de reveal aparece.
- Layers panel: contar camadas de composição durante o hover — não deve explodir.
- Mobile real (não só emulação): o mesh e o pulso devem estar parados.
