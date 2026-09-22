# Na Mesa com Sacha — Aula semanal · Grupo US

> Tier 1, sempre carregado. **O processo vem do plugin `graph-powers`** (planejamento, debug,
> verificação, review, delegação, guardrails de git e execução) — nada disso é redocumentado aqui.
> Este arquivo carrega só o que vale exclusivamente neste repositório.
> Leia o root `AGENTS.md` primeiro: @../AGENTS.md
> `src/AGENTS.md` e `src/components/landing/AGENTS.md` valem ao editar aqueles subtrees.

## Identity

| | |
|---|---|
| Stack | Astro 6 static-only · Bun · Tailwind v4 · React 19 (islands mínimas) · Lucide · título serifado + corpo sans-serif |
| Locale | `${project.locale}` |
| Work branch | `main` — **main-only**, sem feature branches |
| Fluxo | commit direto em `main` após os gates; push e deploy só quando pedido |
| Produção | `${project.productionUrl}` (Vercel) · staging `${project.stagingUrl}` |
| Lead | formulário → Apps Script Web App → planilha Google; fallback WhatsApp |

Parâmetros operacionais — comandos, paths, prefixo de opt-in, arquivos protegidos — vivem em
`.graph-powers/config.json` e são lidos pelos hooks do plugin. Este arquivo não os repete.

Copy do produto: `${content.productJson}` (Content Collection, schema em `src/content.config.ts`).
Marca e voz: root `PRODUCT.md`. Direção visual própria: root `DESIGN.md`; valores técnicos no CSS.
Posicionamento e conversão: root `PRODUCT.md`.

---

## Invariantes deste projeto `[HARD]`

Cada uma existe porque uma violação já custou alguma coisa. Preservadas verbatim.

1. **Never assume correctness.** Verifique por docs oficiais, runtime/build ou evidência local antes de aplicar.
2. **Always debug after changes.** Gate padrão: `bun run lint && bunx astro check && bun run build`.
3. **NEVER use emojis as UI icons.** Lucide ou SVG inline only.
4. **Static MPA por padrão; SSR só no carve-out do painel.** A landing e páginas públicas são estáticas — sem `ClientRouter`, sem SPA. **Exceção documentada e aprovada:** `/admin/*` + `/api/*` são on-demand (`export const prerender = false`) via adapter `@astrojs/vercel` (`output` segue `static` default; só essas rotas viram serverless). É proibido tornar páginas públicas/landing on-demand, adicionar `ClientRouter`/SPA, ou setar `output: 'server'`/`'hybrid'` global. Painel = Google Sheets via Apps Script Web App; ver `docs/planilha-leads.md`.
5. **NEVER hardcode copy do produto em `.astro` / `.tsx`.** Copy vive em `${content.productJson}`; schema em `src/content.config.ts`. Adicionar campo = schema + JSON + leitor numa mudança.
6. **NEVER inline `wa.me/...`.** Usar `${lead.whatsappHelper}` (`whatsappUrlWithText`, `whatsappUrlBase`). Toda mensagem começa com `${lead.whatsappGreeting}`.
7. **NEVER hardcode hex** fora do bloco `@theme` em `src/styles/global.css` (exceção documentada: `<meta theme-color>` literal espelhando `--color-navy`). Usar tokens semânticos.
8. **Motion livre e expressivo.** Animar qualquer propriedade é permitido (incl. `width`/`height`/`top`/`left`/`padding`/`margin`) e `transition: all` é permitido. Profundidade marcante, sombras dramáticas, glow e glass liberados — sem teto de gold. Preferir `transform`/`opacity` quando o efeito for equivalente (anima sem jank), mas não obrigatório. Único requisito: honrar `prefers-reduced-motion` (a11y). Reveal via `[data-reveal]` + IntersectionObserver (gate `.js`).
9. **MAIN-ONLY branch workflow.** Sempre editar em `main`. Sem feature branches, sem force-push, sem auto-merge. Deploy/push só quando pedido.
10. **Lead/PII com cuidado.** Formulário capta nome/e-mail/telefone → exige `<label>` reais, validação, estados de erro/sucesso acessíveis, consent LGPD + link de privacidade, HTTPS. Destino do lead (`${lead.endpointEnv}`) e IDs de tracking (`${tracking.ga4Env}`, `${tracking.pixelEnv}`) vivem em env, nunca commitados; mudá-los = aprovação.
---

## Path routing

| Task touches | Load these | Implement in |
|---|---|---|
| Copy, FAQ, datas, oferta, legal/disclaimer | `grupo-us` + `graph-powers:astro` | `${content.productJson}` |
| WhatsApp CTA/message | `grupo-us` | `${content.productJson}` message; `${lead.whatsappHelper}` só para número/helper |
| Seção da landing | `frontend.md` + `DESIGN.md` + `graph-powers:astro` + `gpus-theme` | `src/components/landing/*.astro` |
| Formulário de inscrição | `frontend.md` + `lead-e-pii.md` + `graph-powers:astro` | `${lead.formComponent}` (+ env endpoint) |
| Tracking GA4/Pixel/consent | `seo.md` + `lead-e-pii.md` | `src/layouts/Layout.astro` + env |
| React island / floating UI | `graph-powers:astro` + `frontend.md` | `.tsx`/`.astro` só quando a interatividade for provada; preferir Astro puro |
| Content schema | `graph-powers:astro` | `src/content.config.ts` + JSON em uma mudança |
| SEO meta / JSON-LD / canonical | `seo.md` + `graph-powers:astro` | `src/layouts/Layout.astro`, `src/pages/index.astro`, `astro.config.mjs` |
| Theme token / utility | `DESIGN.md` + `gpus-theme` | `src/styles/global.css` `@theme` / utilities |
| FAQ behavior | `frontend.md` + `DESIGN.md § Motion` | `src/components/landing/FAQ.astro` |
| Rotas `/admin` e `/api` | `astro.md § 1` + `lead-e-pii.md` | único lugar com `prerender = false` |
| Deploy / `.vercelignore` | `deploy-vercel.md` | `.vercelignore`, `vercel.json`, `bun run verify:vercel` |
| Performance / Lighthouse | `stability.md` + `graph-powers:performance-optimization` | hydration audit, image priority, fonts, bundle |

---

## Decision authority

| Situação | Quem decide |
|---|---|
| Mudança local e reversível dentro de um padrão que já existe | O agente decide e reporta |
| Nova dependência, novo padrão, refactor amplo, mudança de shape do schema | Confirmar antes |
| Destino do lead, IDs de pixel/tag, env vars, `astro.config.mjs`, `vercel.json` | Sempre perguntar |
| Qualquer coisa visível fora do repositório — commit, push, PR, deploy | Sempre perguntar |

O gate de commit do plugin exige `AULAOTB_ALLOW_COMMIT=1` inline no comando; push em `main` exige
`AULAOTB_ALLOW_PUSH=1` **e** `AULAOTB_ALLOW_PUSH_MAIN=1` no mesmo comando — são dois gates, e um só
não passa. O prefixo é distinto por repositório de propósito.

---

## Pointers

| Assunto | Onde |
|---|---|
| Regras de domínio | `.claude/rules/` |
| Parâmetros | `.graph-powers/config.json` (schema em `.graph-powers/config.schema.json`) |
| Identidade e invariantes | root `AGENTS.md` |
| Sistema de design | root `DESIGN.md` · `Skill('gpus-theme')` |
| Posicionamento / conversão | root `PRODUCT.md` |
| O que o projeto recusa mesclar | root `REVIEW.md` |
| Copy, público, funil, voz Dra. Sacha | `Skill('grupo-us')` |
| Histórico da instância | `docs/aula-semanal-implementacao.md` |
| Painel de leads / planilha | `docs/planilha-leads.md` |
