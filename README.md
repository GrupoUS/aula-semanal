# Na Mesa com Sacha — Aula semanal · Grupo US

Landing de aulas gratuitas ao vivo, toda terça-feira no Zoom, com Dra. Sacha
Gualberto. Página principal: `/`.

Astro 6 estático, Tailwind v4, Bun e adapter Vercel. Formulário nativo com endpoint
`/api/inscricao`; somente `/api/*` e `/admin/*` são on-demand.

## Desenvolvimento

```bash
bun install --frozen-lockfile
bun run dev
```

Conteúdo: `src/content/products/aula-semanal.json`. Contrato: `src/content.config.ts`.
Posicionamento: `PRODUCT.md`. Direção visual: `DESIGN.md`.

## Gates

```bash
bun run lint
bunx astro check
bun run build
bun run verify:vercel
bun run check:pii
bun scripts/check-no-pii-analytics.ts --dist
bun run check:states http://localhost:4321/
bun run check:geometry http://localhost:4321/
```

Os dois últimos exigem servidor e Chrome. Não há test runner declarado.
`verify:vercel` exige Git e arquivos rastreados; esta cópia chegou sem `.git`.
O smoke de integração grava dados: não executar sem autorização específica.

## Integrações

Preservar os contratos de armazenamento e autenticação. Sem secrets em código.
A adaptação local não publica nem muda destinos externos. Domínio da série e
configuração das integrações precisam de validação própria antes da publicação.
Detalhes: `docs/planilha-leads.md` e `docs/aula-semanal-implementacao.md`.

Documentos históricos copiados em `docs/` não são briefing ou fatos desta série.
