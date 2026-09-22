---
paths:
  - "src/components/landing/RegistrationForm.astro"
  - "src/pages/api/**"
  - "src/pages/admin/**"
  - "src/lib/leads/**"
  - "src/lib/server/**"
  - "src/layouts/Layout.astro"
  - "scripts/check-no-pii-analytics.ts"
  - "scripts/check-form-states.mjs"
---

# Lead, PII e estados honestos

> Domínio deste repositório. O processo genérico vem do plugin; o que está aqui existe porque já
> quebrou em produção — ver `docs/aula-otb-changelog.md`, entrada de 2026-08-18 (issue #2).

## 1. "Inscrição confirmada" exige persistência provada

O estado de sucesso do formulário só pode renderizar quando `/api/inscricao` devolve
`persisted: true`. Qualquer outro desfecho — 4xx, 5xx, timeout, resposta sem o campo — cai no
painel de erro de `registration.errorState`, e **não** emite `lead_submit`.

Um formulário que diz "confirmada" sem gravação durável passa nos três gates padrão (lint, check,
build) sem uma única falha: não é erro de tipo, de lint nem de build. Por isso existe um gate
próprio.

**Gate:** `bun run check:states <URL>` — intercepta o endpoint por CDP e verifica cada desfecho na
UI e nos eventos de analytics. Precisa de servidor rodando; não roda no pre-commit.

## 2. Nenhum PII cru em analytics

Nome, e-mail e telefone nunca entram em `dataLayer`, `gtag`, `fbq`, `console` ou qualquer sink de
telemetria. Caminhos de servidor e `src/pages/admin/**` são carve-outs legítimos — eles tratam PII
por definição.

Exceção precisa de comentário revisável: `// pii-gate-allow: <motivo>`.

**Gate:** `bun run check:pii` (roda no pre-commit via lefthook) e
`bun scripts/check-no-pii-analytics.ts --dist` depois do build, porque o bundle pode reintroduzir o
que a fonte não mostra.

## 3. Formulário acessível é requisito, não acabamento

`<label for>` real em todo campo; obrigatórios marcados visualmente **e** com `aria-required`;
mensagem de erro com cor **+ ícone + texto**; consent LGPD com link para a política de privacidade,
**nunca pré-marcado** — opt-in é ação do usuário, e um checkbox que já vem marcado não é consentimento.
As mensagens de validação vivem em `registration.errorState.validation`, no JSON de conteúdo —
nunca hardcoded no `<script>` do componente.

## 4. Endpoint e IDs de tracking vivem em env

`${lead.endpointEnv}`, `${tracking.ga4Env}` e `${tracking.pixelEnv}` nunca são commitados.
Mudar qualquer um deles é decisão do usuário, não do agente.

## 5. O chrome inferior não pode cobrir a conversão

Aviso de cookies, CTA fixo e botão flutuante compartilham a borda inferior com o botão de enviar.
Offset não resolve — o que vale é prova geométrica.

**Gate:** `bun run check:geometry <URL>` — zero sobreposição em 390×844, 768×1024 e 1440×1000,
verificando tanto interseção de retângulos quanto `elementFromPoint`.
