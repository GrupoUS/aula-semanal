# src/components/ — AGENTS.md

Este subtree owns shared Astro primitives and the landing-section boundary; it does not own product copy or endpoint contracts.

## Map

| Path | Responsibility |
|---|---|
| `shared/` | Reusable buttons, cards, headings, icons, and floating controls |
| `layout/` | Header and footer composition |
| `landing/` | Product sections and registration presentation; read `landing/AGENTS.md` first |

## Rules

- Components receive typed `.data` from the page; they do not fetch Content Collections themselves.
- Product copy stays in `src/content/products/aula-semanal.json` and its schema consumer.
- Use the existing shared primitives and `src/styles/global.css` tokens; do not introduce a second icon or token system.
- Preserve semantic headings, labels, visible focus, touch targets, and reduced-motion behavior.
