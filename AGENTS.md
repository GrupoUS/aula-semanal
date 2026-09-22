# Na Mesa com Sacha — Aula semanal · Grupo US

## Projeto

Landing principal em `/` para aulas gratuitas com Dra. Sacha Gualberto, toda
terça-feira no Zoom. Esta pasta foi copiada de outro projeto e agora tem produto
e direção visual próprios. `PRODUCT.md` e `DESIGN.md` são as autoridades locais.
Documentação histórica em `docs/` não fornece fatos ou ofertas desta série.

Stack: Astro 6 estático, Tailwind v4, Bun, adapter Vercel. Apenas `/admin/*` e
`/api/*` usam renderização on-demand. Preservar checkout; esta cópia chegou sem Git.

## Contratos

- Bun only; `bun.lock` único lockfile. Sem dependências novas sem aprovação.
- Copy na collection `products`, entry `src/content/products/aula-semanal.json`.
- Schema em `src/content.config.ts`; mudar schema + JSON + consumidor juntos.
- WhatsApp apenas via `src/lib/whatsapp.ts`, prefixo “Olá, Laura!”.
- Formulário reutiliza `/api/inscricao`; consentimento obrigatório e sucesso só
  com persistência comprovada. Qualificadores opcionais vão rotulados em
  `contact.profession`, sem novas colunas. Nenhum PII em analytics.
- Sem SPA, ClientRouter, novo endpoint ou ilha React desnecessária.
- Tokens no `@theme` de `src/styles/global.css`; acessibilidade, foco e redução
  de movimento preservados.
- Sem horário, data ISO, grupo, certificado ou resultado inventado.
- Sem alteração de secrets, autenticação, destinos externos, migração, commit,
  push ou deploy sem autorização específica.

## Gates

```bash
bun run lint
bunx astro check
bun run build
bun run verify:vercel
bun run check:pii
bun scripts/check-no-pii-analytics.ts --dist
```

Com servidor local: `bun run check:states <URL>` e
`bun run check:geometry <URL>`. Inspecionar desktop/mobile em navegador real.
`bun run lighthouse:audit <URL>` é advisory. Não há test runner declarado.
`verify:vercel` depende de Git; sem `.git`, reportar bloqueio, não PASS.
`bun run smoke` grava dados externos e exige autorização própria.

## Contexto

Parâmetros: `.graph-powers/config.json`. Regras: `.claude/CLAUDE.md` e
`.claude/rules/`. Overlays: `src/AGENTS.md` e
`src/components/landing/AGENTS.md`. Integrações: `docs/planilha-leads.md`.
Estado da adaptação e pendências: `docs/aula-semanal-implementacao.md`.

O processo compartilhado permanece no harness global; não duplicar configurações
ou instalar outro. Os opt-ins de Git herdados permanecem sem alteração até revisão
própria; nunca contornar uma proteção para concluir esta adaptação visual.
