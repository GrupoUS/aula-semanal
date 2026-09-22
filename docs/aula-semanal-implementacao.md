# Adaptação para Na Mesa com Sacha

## Escopo aprovado

Substituir a landing principal desta cópia pela aula semanal. Não criar segunda
rota de produto nem preservar a oferta antiga na home. Reutilizar Astro, Content
Collection, formulário, endpoint e contratos existentes.

Referência visual: print fornecido pelo usuário. O acesso ao Figma retornou login;
medidas exatas e frame mobile não foram confirmados. Retratos são do acervo local.
PRODUCT.md e DESIGN.md foram reescritos para esta série.

## Contrato de qualificação

Tempo de atuação e faixa de faturamento são opcionais. Os selects enviam suas
respostas rotuladas dentro de `contact.profession`; sem propriedades novas no
endpoint, sem colunas novas e sem valores de qualificação em analytics.
`meta.landingPath` é `/`. A coluna G continua com seu identificador técnico, mas
seu conteúdo representa perfil profissional. O filtro legado compara a combinação
completa. Separar os campos no armazenamento exigirá migração aprovada.

O sucesso exige `persisted: true`; um identificador `lead_` sozinho não é prova.
O gate `check:states` intercepta a captura e não envia inscrições reais.

## Integrações preservadas — pendências antes de publicar

- Domínio em `astro.config.mjs`, fallback do Layout e robots ainda são herdados.
  Definir um domínio real da série e atualizar canonical/sitemap/atribuição juntos.
- Origem externa no CRM e hostname do Apps Script permanecem com identificadores
  da integração original; não trocar sem coordenar o serviço e a planilha.
- Secrets, IDs de tracking, destino do lead, número do SDR, cookies de autenticação
  e proteções não foram alterados.
- Não existe convite de grupo específico confirmado. Não reutilizar convite antigo.
- Horário, duração e data ISO não confirmados não devem aparecer como fatos.
- Arquivos históricos e assets da cópia são preservados; sua presença no disco não
  os torna conteúdo ou referência de marca da nova página.

## Ambiente e validação

A pasta chegou sem `.git` e sem `node_modules`. Dependências declaradas instaladas
com `bun install --frozen-lockfile` (exit 0). Nenhuma dependência nova.
O hook de instalação do Lefthook não pôde instalar hooks por ausência de Git.

`bun run verify:vercel`: exit 1, bloqueado porque `git ls-files` exige repositório.
Nenhum Git foi inicializado e nenhum upload, commit, push ou deploy foi feito.
Os demais gates e a inspeção visual estão registrados abaixo.

## Evidência da implementação local

| Etapa | Resultado |
|---|---|
| 1 — identidade/documentação | PRODUCT, DESIGN, README, AGENTS e configuração adaptados |
| 2 — conteúdo/schema | Entry única `aula-semanal`; autoridade solo e horário opcional |
| 3 — landing | Home, hero, três cards, autoridade e CTA; desktop/mobile inspecionados |
| 4 — inscrição | Cinco campos, qualificadores opcionais e persistência explícita |
| 5 — superfícies | Navegação, rodapé, legais, 404, mensagens, painel e assets novos |
| 6 — gates | Evidência abaixo; upload depende de Git e produção não foi exercitada |

- `bun run lint`: exit 0; Biome 76 arquivos, Oxlint 71 arquivos; zero erros/avisos.
- `bunx astro check`: exit 0; 75 arquivos, zero erros/avisos; quatro hints existentes
  sobre APIs Zod deprecated.
- `bun run build`: exit 0; home, legais e 404 prerenderizados. Log:
  `.graph-powers/logs/weekly/build.log`. O adapter avisa Node local 26 vs runtime
  Vercel 24; nenhuma versão de sistema foi alterada.
- `bun run check:pii`: exit 0, 66 arquivos de fonte.
- `bun scripts/check-no-pii-analytics.ts --dist`: exit 0, 8 arquivos gerados.
- `bun run check:states http://127.0.0.1:4334/`: exit 0, `ESTADOS OK`.
  Log `.graph-powers/logs/weekly/states.log`. Inclui ausência de consentimento,
  payload rotulado, opcionais vazios, erro 503/HTML e rejeição de sucesso sem
  `persisted`, mesmo com ID de lead.
- Geometria inicial no dev: exit 1 por interferência de `astro-dev-toolbar`.
  A rodada válida deve usar o build estático, sem a barra de desenvolvimento.
- Navegador: Chromium 153 / agent-browser 0.34.0. Um h1, seis controles com labels,
  nenhum anchor morto/imagem quebrada na home, nenhuma referência OTB no texto
  visível. Sem overflow horizontal em 320, 390, 768 e 1440 px.
- Screenshots: `.graph-powers/logs/weekly/desktop-build.png` e `mobile-build.png`.
- OG PNG 1200×630 renderizado a partir do SVG próprio usando Sharp já instalado.

## Arquivos alterados e limite do rollback

Conteúdo/schema; componentes Hero, Learn, Faculty, RegistrationForm, Header,
Footer, MesaMark e LegalContent; Layout/AdminLayout; home/legais/404 e textos
administrativos; CSS, mensagens padrão do helper WhatsApp; nome do CSV; assets
novos de marca; teste de estados; documentação e identidade de projeto/package.

Não há histórico Git nesta pasta. Um rollback integral exige restaurar a cópia
original do projeto, preservando dados/arquivos externos; não há commit para
reverter. Assets originais permanecem no disco. Não houve commit, push ou deploy.

## Fechamento dos gates

- `bun run check:geometry http://127.0.0.1:4334/`: exit 0,
  **GEOMETRIA OK — 102 asserções**. Três viewports, consentimento pendente/aceito,
  reduced motion, foco/teclado e navegação sem JavaScript. Log: `geometry.log` no
  diretório de evidências. A rodada no dev não é usada como PASS.
- `bun run lighthouse:audit http://127.0.0.1:4334`: exit 1, **advisory**.
  Home: performance 96, acessibilidade 100, boas práticas 77, SEO 100.
  Termos e privacidade: 97/100/77/100. São os resultados do script existente,
  que usa o melhor valor por categoria entre três tentativas.
- Causa confirmada de boas práticas 77: audits `third-party-cookies` e
  `inspector-issues`, por cookies Meta via GTM herdado. Em perfil temporário,
  sem interação, o probe capturou uma tentativa de PageView com consentimento
  ainda ausente. O probe impediu o envio. A reprodução usou o user agent do
  Lighthouse; a primeira tentativa headless padrão expirou. Isto não prova
  comportamento em produção. Revisar o container/consentimento antes de publicar,
  em escopo próprio; tracking e IDs não foram modificados.
- Revisão independente do formulário: nenhum achado relevante no escopo de
  qualificadores, consentimento, persistência e PII. Backend herdado não auditado.
- Legais/404: um h1, identidade nova e sem overflow no mobile. 404 com noindex.
  Login administrativo inspecionado visualmente, sem autenticação ou dados reais;
  variáveis de login não estão configuradas neste ambiente.

Evidências adicionais: `.graph-powers/logs/weekly/lighthouse-best-practices.json`
(querystrings mascaradas) e `lighthouse-consent-probe.json` no mesmo diretório.

Resultado: implementação local e gates funcionais concluídos. Não é liberação de
produção: upload não verificável sem Git; domínio e integrações continuam com
pendências explícitas. Integração real com planilha, login autenticado e deploy
não foram executados. Sem nova dependência, commit, push ou publicação.
