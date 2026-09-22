# UTM — Na Mesa com Sacha

A landing é `/`. O domínio público da série ainda precisa ser confirmado; os
exemplos abaixo são caminhos relativos para revisão local, não URLs publicadas.

| Canal | Caminho de exemplo |
|---|---|
| Instagram, bio | `/?utm_source=instagram&utm_medium=bio&utm_campaign=aula-semanal` |
| Instagram, stories | `/?utm_source=instagram&utm_medium=stories&utm_campaign=aula-semanal` |
| WhatsApp | `/?utm_source=whatsapp&utm_medium=broadcast&utm_campaign=aula-semanal` |
| E-mail | `/?utm_source=email&utm_medium=newsletter&utm_campaign=aula-semanal` |

`aula-semanal` é uma convenção proposta para a nova campanha; não altera campanhas
existentes nos serviços externos. `utm_source` identifica a origem,
`utm_medium` identifica o canal e `utm_campaign` agrupa a campanha.
Não colocar nome, e-mail, telefone ou qualificadores em parâmetros de URL.

## Contrato preservado

O formulário reutiliza `readAttribution()` de `src/lib/leads/attribution.ts`.
Metadados seguem em `meta.utm`, `meta.referrer` e `meta.landingPath` para o endpoint.
A planilha mantém `utm` na coluna L e os campos derivados nas colunas P/Q/R.
O hostname técnico, a chave de armazenamento legado e a regra do Apps Script
não foram migrados por esta adaptação visual.

Antes da publicação, validar domínio, regra de atribuição e origem externa do CRM
em conjunto. Ver `aula-semanal-implementacao.md` e `planilha-leads.md`.
A verificação local do formulário intercepta o endpoint, sem gravar leads reais.
