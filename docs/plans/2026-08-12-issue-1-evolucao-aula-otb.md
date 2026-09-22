# Plano — Issue #1: Evoluir a Aula OTB com base na Ação OTB

> **Status: IMPLEMENTADO** em 2026-08-12. Gates verdes, primeira dobra medida em Edge headless. Ver `docs/aula-otb-changelog.md`.
>
> **Fechado** em 2026-08-17 pelo plano `docs/analise-a-issue-1-harmonic-fiddle.md`, que resolveu os resíduos (FAQ com `[confirmar]`, honoríficos, "Ana Carolina" → "Carol Teixeira"), removeu o código morto (`Authority`, `Testimonials`) e produziu a verificação medida do critério 6. Issue #1 encerrada.

**Data:** 2026-08-12
**Issue:** [GrupoUS/aula-otb#1](https://github.com/GrupoUS/aula-otb/issues/1)
**Complexidade:** L6 — conteúdo + schema (arquivo protegido) + assets novos + 1 componente novo + recomposição de hero + reordenação narrativa + JSON-LD + a11y/QA responsivo.
**Camadas (ordem de dependência):** decisões/assets → schema (`content.config.ts`) → conteúdo (`aula-otb.json`) → componentes → composição de página + SEO/JSON-LD → config/nav/docs → verificação.
**Branch:** `main` (main-only). Sem commit/push/deploy sem pedido explícito.

---

## 1. Baseline verificado

| Fato | Evidência | Conf. |
|---|---|---|
| Hero usa **só** foto da Sacha, form já à direita em `lg` | `src/components/landing/Hero.astro:3,55-63,153-159` | 5 |
| Datas atuais corretas no JSON (9/09/2026 19h; Boston 19–21/04/2027) | `src/content/products/aula-otb.json:14-19,206,269` | 5 |
| Nenhuma ocorrência de "22 de abril" / "Dubai" / "Mariana" no repo | `grep -rniE` em `src public docs` → vazio | 5 |
| `Authority` é **pessoa única** (Sacha) | `src/components/landing/Authority.astro:1-66`; `src/pages/index.astro:23-29` | 5 |
| Não existe seção de corpo docente nem campo `faculty`/`speakers` no schema | `src/content.config.ts:14-321` | 5 |
| Ordem atual: Hero → ProofBar → Audience → Learn → Mechanism → Authority → Comparison → NextStep → FAQ → FinalCTA | `src/pages/index.astro:67-82` | 5 |
| Retratos disponíveis fora do repo: `speaker-{sacha,carol,dieick,rosana}.jpg` | `../otb-usa/src/assets/images/otb/speakers/` | 5 |
| **Kassyo Lobato: nenhuma foto nem bio em nenhum repo local** | `find`/`grep` em `../otb-usa`, `../otb-usa-brand-assets` | 5 |
| Bios/áreas de Sacha, Ana Carolina, Dieick, Rosana existem | `../otb-usa/src/content/products/otb.json:268-302` | 5 |
| Narrativa da referência (Ação OTB) | extração da página `drasacha.com.br/acaootb/` | 5 |
| Gates reais | `package.json:12-17` → `bun run lint`, `bunx astro check`, `bun run build` | 5 |
| Funil intacto a preservar: form → `PUBLIC_FORM_ENDPOINT`, WhatsApp SSOT, countdown, .ics, Pixel/GA4, CAPI `/api/track`, grupo WhatsApp | `RegistrationForm.astro`, `Layout.astro:51-76,153-154`, `whatsapp.ts` | 5 |

### Mapa referência → atual

| Ação OTB (referência) | Bloco atual | Decisão |
|---|---|---|
| Hero: eyebrow data + H1 + sub + **form integrado** | `Hero.astro` + `RegistrationForm` | **Adaptar** — já tem form; falta Sacha+Carol e densidade mobile |
| "O QUE VOCÊ VAI ACESSAR" (6 bullets) | `learn` | **Manter, subir na ordem** |
| "Você cresce até o limite do ambiente…" + "A verdade é que" + "ciclo silencioso" | `audience.intro` + `audience.forYou` | **Reescrever** como bloco de dor escaneável |
| "Enquanto isso… realidade diferente" (5 bullets) | `comparison` | **Adaptar** — vira o contraste premium/autoridade |
| "Eles saíram da bolha" + 3 pilares | `mechanism` | **Manter** (já é cópia adaptada) |
| "Conheça quem vai estar com você nessa aula" (5 retratos) | — | **Criar** `Faculty.astro` |
| CTA final + segundo form | `finalCta` | **Manter** |
| "22 de abril", OTB Dubai, Mariana Laranja | — | **Nunca copiar** |

---

## 2. Decisões (resolvidas com o usuário em 2026-08-12)

| # | Decisão | Consequência |
|---|---|---|
| **D1** | ~~Publicar 4 docentes agora; Kassyo Lobato em segunda entrega~~ → **RESOLVIDO na mesma sessão**: material do Kassyo chegou em `docs/Corpo Docente/`, roster fechou em 5 | Grid do `Faculty` com **4 colunas** (evita célula vazia). Kassyo entra depois só adicionando 1 item ao array + 1 asset — grid vira 5 colunas ou 3+2. Critério de aceite "todo o elenco" fica **parcial e declarado** nesta entrega. |
| **D2** | **Plate duplo com retratos existentes** (`speaker-sacha` + `speaker-carol`) | Novo `DuoPortrait.astro`. Trocável depois por foto composta sem tocar no Hero. |
| **D3** | **Manter `#autoridade`** | `.claude/config.json::content.anchors` e `Header.astro` **intocados**. |
| **D4** | **Schema autorizado** | `src/content.config.ts` (protegido) recebe `faculty`; `authority` vira opcional. |

### Layout aprovado do hero

```
DESKTOP (lg)                          MOBILE (390)
┌───────────────────────────────────┐  eyebrow
│ eyebrow: 9 set | 19h | Zoom       │  H1
│ H1 promessa             ┌───────┐ │  sub
│ subheadline             │ FORM  │ │  ┌─────┐┌─────┐
│ ┌─────┐┌─────┐          │ nome  │ │  │SACHA││CAROL│
│ │SACHA││CAROL│ chips    │ email │ │  └─────┘└─────┘
│ └─────┘└─────┘ countdown│ CTA   │ │  [CTA primário] ← acima da dobra
│ [CTA] [WhatsApp]        └───────┘ │  chips / countdown
└───────────────────────────────────┘  FORM
```

---

## 3. Fases

### Fase 1 — Assets [SEQUENCIAL]
- [ ] Copiar `../otb-usa/src/assets/images/otb/speakers/speaker-{sacha,carol,dieick,rosana}.jpg` → `src/assets/images/otb/speakers/`
- [ ] Conferir peso/dimensão dos 4 (alvo ≤ 250 KB, ≥ 640px lado curto) — `astro:assets` faz avif/webp no build
- [ ] `speaker-kassyo.jpg` **não entra nesta entrega** (D1)
- **Verify:** `ls -la src/assets/images/otb/speakers/` + `bun run build` sem erro de asset

### Fase 2 — Schema [SEQUENCIAL] — `src/content.config.ts` (**protegido**, autorizado em D4)
- [ ] Adicionar bloco `faculty`: `{ eyebrow?, headline, highlight?, subheadline?, lista: [{ nome, area, bio, foto, instagram? }] (min 3, max 6) }`
- [ ] `authority` → `.optional()` (fica para reuso futuro; não será renderizado)
- [ ] `comparison.rows` e `audience` já suportam a copy nova — sem mudança
- **Verify:** `bunx astro check`

### Fase 3 — Conteúdo [SEQUENCIAL] — `src/content/products/aula-otb.json`
- [ ] `faculty` novo com **4 docentes** — Sacha Gualberto, Ana Carolina, Dieick de Sá, Rosana Vecchi (bios/áreas de `../otb-usa/src/content/products/otb.json:268-302`); Kassyo em segunda entrega (D1)
- [ ] `audience`: reescrever `intro` + `forYou` no ritmo "A verdade é que… / o que trava é visão limitada de mercado / ciclo silencioso" — bullets curtos, menos prosa
- [ ] `comparison`: reposicionar como "Enquanto isso… existem profissionais vivendo outra realidade" (premium, agenda enxuta, autoridade, experiências internacionais)
- [ ] `learn.subheadline`: encurtar; `learn.topics[5]` já aponta OTB — manter
- [ ] `mechanism.intro`: enxugar (hoje é um parágrafo único longo)
- [ ] `seo.title/description`: trocar autoria singular ("com a Dra. Sacha Gualberto") por corpo docente, mantendo data 9 de setembro; respeitar limites do schema (title 20–70, description 120–220)
- [ ] `hero.proofBar.items[1]`: "Com Dra. Sacha Gualberto" → refletir corpo docente
- [ ] Remover `authority` do JSON (ou manter inerte) conforme Fase 2
- [ ] **Não tocar**: `event.*`, `registration.*`, `finalCta.whatsapp`, `legal.disclaimer`, todas as `message` (prefixo `Olá, Laura!`), `successState.group.href`
- **Verify:** `bunx astro check` (schema Zod valida no build)

### Fase 4 — Componentes [PARALELO após Fase 3]
- [ ] **`src/components/landing/Faculty.astro` (novo)** — grid **4 colunas** (`sm:grid-cols-2 lg:grid-cols-4`, casa com o roster de 4 — sem célula vazia), retratos 4:5, `rounded-plate`, borda gold via `color-mix`, `Picture` avif/webp, `loading="lazy"`, `data-reveal`; `<h3>` nome + área + bio; padrão de `../otb-usa/src/components/landing/Speakers.astro`. Âncora `#autoridade` (D3). Sem link de Instagram (mantém tráfego no funil; evita adicionar ícone novo ao `Icon.astro`).
- [ ] **`src/components/shared/DuoPortrait.astro` (novo)** — plate Sacha+Carol para o hero (D2), com `alt` descritivo, `width`/`height` explícitos (CLS 0)
- [ ] **`Hero.astro`** — inserir `DuoPortrait`; ordem mobile `eyebrow → h1 → sub → duo → CTA primário → chips → countdown → form`; desktop mantém copy à esquerda / form à direita com o duo abaixo da subheadline; CTA primário visível antes de 844px em 390px de largura; manter `SectionPhoto` como atmosfera
- [ ] **`Authority.astro`** — remover do render (arquivo pode ficar; se apagar, é deleção → confirmar)
- [ ] **`Learn.astro` / `Audience.astro` / `FAQ.astro`** — renumerar `SectionHeading index` para a nova ordem (hoje Audience=1, Learn=2, FAQ=3)
- **Verify:** `bun run lint && bunx astro check`

### Fase 5 — Composição, SEO e nav [SEQUENCIAL]
- [ ] `src/pages/index.astro` — nova ordem: **Hero → ProofBar → Learn → Audience → Comparison → Mechanism → Faculty → NextStep → FAQ → FinalCTA**
- [ ] JSON-LD: `Person` singular → **array de `Person`** (4 docentes) e `Event.performer` com a lista; manter `Event`/`Organization`/`FAQPage` intactos
- [ ] `Header.astro` e `.claude/config.json` — **sem mudança** (D3 manteve `#autoridade`)
- [ ] `src/components/landing/AGENTS.md` — atualizar tabela de seções/âncoras
- [ ] `docs/aula-otb-changelog.md` — registrar a evolução
- **Verify:** `bun run build`

### Fase 6 — Verificação [SEQUENCIAL]
- [ ] `bun run lint && bunx astro check && bun run build`
- [ ] Greps negativos: `grep -rniE "22 de abril|dubai|mariana" src public` → vazio
- [ ] Grep de datas: `9 de setembro`, `2026-09-09T19:00`, `19 a 21 de abril de 2027` consistentes em SEO, hero, countdown, .ics, FAQ, WhatsApp, sucesso
- [ ] Grep de guardrails: `wa.me/` só em `src/lib/whatsapp.ts`; nenhum `#hex` fora de `src/styles/global.css`; nenhum `console.log`
- [ ] QA real 390×844 e 1440×1000: `scrollWidth === innerWidth` (sem overflow); bounding box do CTA primário com `bottom < 844` no mobile; Sacha e Carol reconhecíveis nos dois breakpoints
- [ ] Funil ponta a ponta: submit do form (endpoint + fallback WhatsApp), consentimento, estado de sucesso, `.ics`, link do grupo, `data-cro` disparando, console limpo
- [ ] a11y: contraste AA sobre a foto, foco visível, `prefers-reduced-motion` emulado, um único `<h1>`
- [ ] `bun run lighthouse:audit` com preview local (advisory)

---

## 4. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Legibilidade cai ao pôr dois retratos no hero | Plate contido (não full-bleed) + overlay navy existente; medir contraste do H1 |
| Hero mobile fica mais alto e empurra o CTA | Reordenar antes de estilizar; medir bounding box no QA |
| Editar `content.config.ts` (protegido) | Só após D4; mudança aditiva; `authority` vira opcional em vez de sumir |
| Perder o funil ao reescrever o JSON | `event`, `registration`, mensagens WhatsApp e `legal` ficam fora do escopo de edição |
| Docente com foto/nome trocados | Conferência 1-a-1 nome↔arquivo antes do build |
| Elenco incompleto (Kassyo fora) | Declarado na issue como entrega parcial (D1); grid de 4 não deixa buraco visual; adicionar depois = 1 item no array + 1 asset |
| Endosso institucional implícito ao falar "corpo docente" | `legal.disclaimer` permanece intacto |
| Reordenação quebra âncoras (`#aula`, `#para-quem`) | IDs viajam com os componentes; nenhum `href` muda |

## 5. Rollback

Reversão isolada por camada: `git checkout -- src/content/products/aula-otb.json` (copy), `src/components/landing/` (apresentação), `rm` dos assets novos. Nenhuma integração, env var ou dado de lead é tocado.

## 6. Fora de escopo

Trocar endpoint/CRM, IDs de tracking, oferta/preço, datas, rotas novas, SSR, novas dependências.
