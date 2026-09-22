# src/ — AGENTS.md (GPUS Astro landing)

> Overlay de subdiretório. Vale ao editar qualquer coisa em `src/`. Complementa o root `AGENTS.md` e `.claude/CLAUDE.md`. Valores de instância em `.graph-powers/config.json` (`${...}`).

## Mapa

```
src/
├── pages/
│   ├── index.astro                 # landing (compõe seções; JSON-LD)
│   ├── <rotas legais> (${content.legalRoutes})  # legal
│   └── 404.astro                   # noindex
├── layouts/Layout.astro            # head/SEO/JSON-LD/fonts + Header/Footer/Floating + reveal IO
├── components/
│   ├── shared/{Button,Card,SectionHeading,OtbMark,WhatsAppFloatingButton}.astro
│   ├── layout/{Header,Footer}.astro
│   └── landing/*.astro             # seções (ver landing/AGENTS.md)
├── content/products/<produto>.json (${content.productJson})  # COPY SSOT
├── content.config.ts               # Zod schema (PROTECTED)
├── lib/whatsapp.ts                 # WhatsApp SSOT (PROTECTED)
└── styles/global.css               # @theme tokens + utilities
```

## Fluxo de dados (SSOT)

`${content.productJson}` → valida contra `content.config.ts` → `index.astro` faz `getCollection("products")` + `find(slug === "${content.productSlug}")` → passa `d.<seção>` para cada componente como `.data`.

**Adicionar/editar um campo** = mexer em 3 lugares numa só mudança: schema (`content.config.ts`) + JSON (`${content.productJson}`) + componente que lê. Rodar `bunx astro check` valida o schema.

## Invariantes ao editar src

- **Static por padrão; SSR só no carve-out do painel.** Landing/páginas públicas estáticas, sem `ClientRouter`/SPA. **Exceção aprovada:** `/admin/*` + `/api/*` usam `export const prerender = false` (adapter `@astrojs/vercel`; `output` segue `static`). Não tornar páginas públicas on-demand nem usar `output: 'server'`/`'hybrid'` global.
- **Sem copy hardcoded** em `.astro`/`.tsx` — vem do JSON.
- **Sem hex** fora de `global.css @theme` (exceção: `<meta theme-color>`).
- **Sem `wa.me` inline** — usar `lib/whatsapp.ts`; toda mensagem começa com `${lead.whatsappGreeting}`.
- **Reveal**: `data-reveal="up|left|right|scale"` (+ `data-reveal-delay="1..6"`), gated por `.js` (Layout adiciona a classe; `<noscript>` revela). Motion livre — qualquer propriedade pode ser animada; `transform`/`opacity` preferidos por performance quando equivalentes. Honrar `prefers-reduced-motion`.
- **Ilha React só quando provada.** Hoje a página tem **zero ilha** (até o botão flutuante é Astro puro). Initial JS deve ficar < 50KB.
- **A11y**: 1 `<h1>` por página, skip-link, focus-visible, labels reais em form, `prefers-reduced-motion`.

## Protected

`content.config.ts` e `lib/whatsapp.ts` são protegidos (hook `protect_files.py`). Editar com razão + validar.

## Gate

`bun run lint && bunx astro check && bun run build` após qualquer mudança.
