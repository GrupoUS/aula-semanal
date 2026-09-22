# Notificar o Hermes — CRM inbound do NeonDash

Como o lead da landing chega no CRM do NeonDash, que é de onde o agente **Hermes** trabalha.

---

## 1. Por que não foi só apontar o webhook

O projeto já tinha um canal de notificação genérico (`LEAD_NOTIFY_WEBHOOK_URL`, feito para Make/Zapier/n8n). Ele **não serve** para o NeonDash:

| | Webhook genérico | NeonDash CRM inbound |
|---|---|---|
| Autenticação | header `X-Lead-Webhook-Secret` | `Authorization: Bearer <chave>` |
| Corpo | `{ eventType, message, lead }` | payload de lead com `nome` obrigatório |

Apontar `LEAD_NOTIFY_WEBHOOK_URL` para o endpoint do NeonDash devolveria **401**; com o Bearer certo, **422 invalid_payload**. Por isso existe o adaptador `src/lib/server/crm-inbound.ts`.

Os dois canais convivem: o genérico continua livre para o que você quiser (alerta no Slack, planilha paralela, automação), e o CRM tem caminho próprio.

---

## 2. Contrato

`POST https://api.neondash.com.br/api/webhooks/crm-inbound`

| Header | Valor |
|---|---|
| `Authorization` | `Bearer <NEONDASH_CRM_INBOUND_TOKEN>` |
| `Content-Type` | `application/json` |
| `Idempotency-Key` | `lead.id` |

Corpo enviado:

```jsonc
{
  "nome":  "…",
  "email": "…",
  "telefone": "…",
  "origemExterna": "aula-otb",
  "externalId": "lead_1786447251367_27637677",
  "customFields": {
    "profissao": "…", "landing_path": "/", "referrer": "…",
    "consentimento_em": "…", "utm_source": "…", "utm_campaign": "…"
  },
  // só no canal degradado:
  "qualificationNotes": "Lead capturado com a planilha indisponível (store_timeout). Confira o registro manualmente."
}
```

Respostas: **201** lead criado · **200** `duplicate: true` · **401** chave inválida · **422** payload inválido · **429** rate limit.

### Deduplicação

O `Idempotency-Key` é o `lead.id`, e o store da planilha faz **upsert por e-mail** — a mesma pessoa se reinscrevendo recebe o mesmo `lead.id`. Resultado: o CRM responde `duplicate` em vez de criar um segundo lead. Também torna qualquer retry seguro.

### Quando dispara

| Situação | Comportamento |
|---|---|
| Inscrição normal | envia (em paralelo com o webhook genérico e o Meta CAPI) |
| Reinscrição do mesmo e-mail | envia; CRM responde `duplicate` |
| Planilha fora do ar | envia **com** `qualificationNotes` sinalizando falha |
| Sem `NEONDASH_CRM_INBOUND_TOKEN` | skip silencioso |

Timeout de 6s, em paralelo com os outros canais — não aumenta a latência da resposta ao visitante. Falha nunca derruba a captura.

---

## 3. Passo a passo para ativar

### 3.1 Gerar a chave no NeonDash

1. Entre no NeonDash com a conta do tenant que o Hermes atende.
2. **Configurações → Integrações → Entrada de leads (CRM inbound)**.
3. **Gerar chave**. Copie na hora — ela não é exibida de novo.

> A chave é escopada ao tenant: o lead cai no CRM daquele mentorado, e só nele.

### 3.2 Configurar na Vercel

```bash
vercel env add NEONDASH_CRM_INBOUND_TOKEN production
vercel env add NEONDASH_CRM_INBOUND_TOKEN development
```

Só configure `NEONDASH_CRM_INBOUND_URL` se o destino não for a API de produção.

### 3.3 Redeploy

```bash
vercel redeploy <url-do-deployment-atual>
```

Variável de ambiente só vale a partir do próximo deployment.

### 3.4 Verificar

Antes de mexer no site, teste a chave isolada:

```bash
curl -s -w '\n[%{http_code}]\n' -X POST https://api.neondash.com.br/api/webhooks/crm-inbound \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: teste-aula-otb-001' \
  -d '{"nome":"Teste CRM","telefone":"62999990000","origemExterna":"aula-otb"}'
# esperado: 201 {"ok":true,"leadId":…}
# repetindo o mesmo Idempotency-Key: 200 com duplicate
```

Depois, ponta a ponta pelo site:

```bash
curl -s -X POST https://aulaotb.gpus.com.br/api/inscricao \
  -H 'Content-Type: application/json' -H 'Origin: https://aulaotb.gpus.com.br' \
  -d '{"contact":{"name":"Teste CRM","email":"teste-crm@example.com","phone":"62999990000","consentGiven":true,"consentTimestamp":"2026-08-11T11:00:00.000Z"},"meta":{"utm":{}}}'
```

A resposta traz o resultado do canal:

```jsonc
{"ok":true,"leadId":"lead_…","created":true,
 "notification":{"status":"skipped"},
 "crm":{"status":"sent","leadId":123}}
```

`"crm":{"status":"skipped"}` = token ausente no deployment. `"failed"` traz `reason` (`http_401`, `http_422`, `AbortError`…).

Limpe o lead de teste nos dois lados: `purgeByEmail` na planilha (ver [`planilha-leads.md`](./planilha-leads.md) §4.1) e exclusão manual no CRM.

---

## 4. Diagnóstico

| `crm.status` / `reason` | Causa |
|---|---|
| `skipped` | `NEONDASH_CRM_INBOUND_TOKEN` ausente ou vazio no deployment |
| `http_401` | chave revogada, errada, ou o `Bearer ` não chegou |
| `http_422` | payload rejeitado — provável campo acima do limite do schema |
| `http_429` | rate limit por chave; o retorno traz `Retry-After` |
| `AbortError` | API do NeonDash demorou mais que 6s |
| `duplicate` | **não é erro** — o CRM já tinha esse lead |

Os eventos ficam registrados no próprio NeonDash, em **Configurações → Integrações → Entrada de leads**, com status por requisição.

---

## 5. LGPD

O lead vai para o CRM com nome, e-mail, telefone e a marca de consentimento (`customFields.consentimento_em`). O consentimento coletado no formulário da landing precisa cobrir esse compartilhamento — confira o texto em [`politica-de-privacidade`](../src/pages/politica-de-privacidade.astro) antes de ligar em produção.
