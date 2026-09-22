# Verificação Vercel, Figma e leads — 22/09/2026

## Deploy consultado

Vercel CLI 59.5.0, projeto `aula-semanal`, equipe `suporte-8670s-projects`.
Deploy `dpl_9NtoHWYsnizjtF72rhzGursJH1Wm`, commit `be6d45a`, branch `master`:
https://aula-semanal-8qcqyw1uu-suporte-8670s-projects.vercel.app
Alias público: https://aula-semanal.vercel.app

Status Ready; instalação, build e publicação concluídos. Nenhum registro runtime
com nível error na janela de uma hora consultada. `/`, termos, privacidade,
robots e sitemap retornaram 200. GET de `/api/inscricao` não é suportado;
POST inválido retornou 400, sem chegar à persistência.

Defeito confirmado no site publicado: canonical, sitemap e robots apontavam ao
produto antigo. Corrigidos localmente `astro.config.mjs`, fallback do Layout,
`public/robots.txt` e metadata `.graph-powers/config.json`. A regressão de URLs
falhou antes e passou depois, no `dist/client` e em `.vercel/output/static`.

## Figma inspecionado após login

Frames Desktop 1080×1682 e Mobile 390×2409, exportados em `docs/figma/`.
Oito assets originais em `src/assets/na-mesa/`: hero desktop/mobile, fundo e foto
de autoridade, logo e três ícones. Fonte Abhaya Libre 800 e corpo Inter confirmados
nas propriedades do Figma; utilizados no site com o provider Astro existente.

Ajustados hero, proporções mobile, cards, ícones, ticker, CTAs, autoridade e footer.
Textos e formulário continuam HTML, não uma imagem da página. Diferenças deliberadas:
consentimento, labels acessíveis, indicação de opcionais, controles mobile de 44px,
fallback WhatsApp, links legais, headline sem repetição e bio sem credenciais
não verificadas. Esses elementos aumentam a altura em relação ao frame original.

## Gates do build final

Todos com exit 0:

- `bun run lint`;
- `bunx astro check`: zero erros/avisos; quatro hints antigos de Zod;
- `bun run build`;
- `bun run verify:vercel`: 180 arquivos rastreados, 57 ignorados, 123 no conjunto;
- `bun run check:pii`: 66 arquivos de fonte;
- `bun scripts/check-no-pii-analytics.ts --dist`: 8 arquivos gerados;
- `bun run check:states http://127.0.0.1:4334/`: ESTADOS OK;
- `bun run check:geometry http://127.0.0.1:4334/`: 106 asserções aprovadas;
- `git diff --check`.

`vercel deploy --dry --json --project aula-semanal --scope suporte-8670s-projects`
confirmou 131 arquivos no pacote: inclui os oito assets novos ainda não rastreados
pelo Git, sem arquivo de secrets. O dry-run não envia nem cria deploy.

Evidências em `.graph-powers/logs/weekly/`: `figma-states.log`,
`figma-geometry.log`, `vercel-dry-final.json`, `figma-mobile-final.png` e
`figma-desktop-final.png`. A captura Desktop cobre a primeira dobra; o Mobile
cobre a página. Inspeção DOM confirmou h1 único, sem overflow e imagens carregadas.

## Leads e acesso

Guia: `operacao-leads-aula-semanal.md`. O formulário publicado usa endpoint interno.
Código grava pelo Apps Script em Sheets; upsert por e-mail; qualificadores no campo
`profession`; acesso da equipe em `/admin` e `/admin/leads` com filtros/status/CSV.

Bloqueio atual comprovado: a página de login informa ADMIN_USERS e
ADMIN_SESSION_SECRET não configurados. Os nomes ADMIN/SHEETS existem tanto no
projeto quanto no snapshot do deploy, mas seus valores Sensitive não são legíveis.
Env criadas às 15:14:37.082 UTC; deploy começou 15:14:39.981 e ficou Ready às
15:15:27.781. Não foi um caso de env adicionada depois do deploy.

Getter usa process.env antes do fallback e permanece no bundle; adapter10.0.8 e
Astro6.0.8 são compatíveis, runtime Node24. Não há evidência para mudar autenticação
ou afirmar que redeploy resolve. O responsável deve conferir/reaplicar valores
conhecidos com autorização própria. Login autenticado e gravação real não foram
testados, e nenhum contato real foi enviado. Destinos/IDs/credenciais preservados.

## Estado da entrega

Correções locais prontas e verificadas. Publicação foi solicitada ao usuário como
aprovação separada e ainda não executada no momento deste registro. Sem commit/push.
A alteração anterior em `docs/aula-semanal-implementacao.md` foi preservada.
