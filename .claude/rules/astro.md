---
paths:
  - "src/**"
  - "astro.config.mjs"
  - "src/content.config.ts"
---

# Astro Invariants — GPUS Astro Landing

> Astro overlay portável para landings GPUS. Valores de instância em `.graph-powers/config.json` (`${...}`). Framework deep-dive em `Skill('graph-powers:astro')`.
> Stack: Astro 6 + React 19 islands (preferir zero) + Tailwind v4 + Bun, static-only MPA, deploy Vercel.

## 1. Render-mode invariant

- Projeto entrega a landing como HTML estático via `bun run build` (adapter `@astrojs/vercel`, output Build Output API em `.vercel/output`).
- `output` permanece `static` (default) — **nunca** `server`/`hybrid` global.
- **Carve-out do painel (aprovado):** somente `/admin/*` e `/api/*` declaram `export const prerender = false` → renderização on-demand (serverless Vercel). Store de leads = Google Sheets via Apps Script Web App (fetch puro, zero dependência). Ver `docs/planilha-leads.md`.
- Never add `export const prerender = false` em páginas públicas/landing.
- Never introduce `ClientRouter` / SPA routing.

## 2. Hydration directive routing

| Directive | When | Use case |
|---|---|---|
| none | default | Static `.astro`, zero JS — **estado atual da página** |
| `client:load` | só interatividade crítica de primeiro paint | raríssimo; preferir Astro puro + script inline |
| `client:idle` | island não-crítico above-fold | island decorativo após paint |
| `client:visible` | below-fold interativo | carousel/reveal que realmente precise de JS |
| `client:only="react"` | last resort | lib que não SSR por browser API no módulo |

Default = sem directive. Astro puro primeiro; **ilha React só quando a interatividade for provada**. (O botão WhatsApp flutuante é Astro puro + script vanilla justamente por isso.)

## 3. Content Collections SSOT

- Copy da landing vive em `${content.productJson}`.
- Schema em `src/content.config.ts` (slug `${content.productSlug}`).
- Página carrega via `getCollection("products")` + `find(slug === "${content.productSlug}")`.
- Componentes recebem `.data` (sub-objetos: `seo`, `event`, `hero`, `virada`, `learn`, `audience`, `comparison`, `mechanism`, `faculty`, `nextStep`, `registration`, `faqs`, `finalCta`, `gallery`, `transparency`, `legal`), nunca a entry completa.
- Adicionar campo = schema + JSON + leitor numa só mudança.

## 4. Rotas

Rotas públicas: `/` (landing), `${content.legalRoutes}` (ex.: `/termos`, `/politica-de-privacidade`), `/404` (noindex). Âncoras internas: `${content.anchors}`. Não adicionar rotas/redirects de outros produtos. Mudança de rota/redirect = atualizar `astro.config.mjs` + sitemap + `robots.txt` numa só mudança.

## 5. WhatsApp SSOT

- Never inline `wa.me/...`.
- Número/helper: `${lead.whatsappHelper}` (`whatsappUrlWithText`, `whatsappUrlBase`, `WHATSAPP_SDR_E164`).
- Toda mensagem começa com `${lead.whatsappGreeting}` (enforce em runtime + refine no schema).
- Texto das mensagens vive nos campos `whatsapp.message` / `whatsappFallback.message` do JSON.

## 6. Layout contracts

`src/layouts/Layout.astro` owns:

- `<html lang="pt-BR">`, `<html class="js">` (inline, progressive enhancement);
- SEO meta, OG/Twitter, canonical, robots (prop `noindex`);
- `EducationalOrganization` JSON-LD + payload de página (`jsonLd` prop, array-merge);
- `Header` + `<main id="conteudo-principal">` + `Footer` + `WhatsAppFloatingButton`;
- skip link, `<noscript>` reveal fallback, IntersectionObserver reveal hardened;
- default OG image (`${content.ogImage}`).

Páginas passam `title`, `description`, `ogImage`, `whatsappMessage`, opcional `canonical`/`breadcrumbs`/`noindex`/`jsonLd`.
A presença do chrome inferior **não** é uma prop: o `Layout.astro` a infere de `Astro.slots.has("bottom-cta")`. A prop `hasBottomBar` foi removida.

## 7. Tailwind v4 `@theme`

- Tokens em `src/styles/global.css` `@theme` (Navy/Gold, fonts, escala clamp, motion, depth).
- Sem hex hardcoded em `.astro`/`.tsx` (exceção: `<meta theme-color>` espelhando `--color-navy`).
- Token canon: `Skill('gpus-theme')`.

## 8. Formulário + tracking

- `${lead.formComponent}`: form nativo acessível; submit POST a `import.meta.env.${lead.endpointEnv}` quando definido, senão fallback WhatsApp. PII → consent LGPD + link privacidade.
- Tracking GA4/Meta Pixel via env (`${tracking.ga4Env}`, `${tracking.pixelEnv}`) no `Layout.astro`; eventos sem duplicar. IDs/endpoint = aprovação.

## Anti-patterns

| Don't | Why |
|---|---|
| `client:only="react"` sem browser API no módulo | JS/client-only desnecessário |
| `client:load` para island decorativo | rouba main-thread budget |
| copy da aula hardcoded em componente | fura o SSOT de conteúdo |
| `prerender = false` | quebra contrato estático |
| `<ClientRouter />` | SPA banido |
| `wa.me` hardcoded fora do helper | fura WhatsApp SSOT |
| hex fora de `global.css @theme` | fura token canon |
| `site`/redirect/sitemap dessincronizados | SEO split / canonical errado |

## Pointers

- Astro framework: `Skill('graph-powers:astro')`.
- Copy/funil/voz: `Skill('grupo-us')`.
- Theme/tokens: `Skill('gpus-theme')`.
- Cardinal rules: `.claude/CLAUDE.md`.
