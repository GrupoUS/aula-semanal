# Integração herdada — contexto da aula semanal

A interface atual é Na Mesa com Sacha. Este runbook preserva o contrato técnico
da integração original, cujos destinos e identificadores não foram migrados.
Os qualificadores opcionais são armazenados em `profession` (coluna G) como
`Tempo de atuação: …; Faturamento mensal: …`; o filtro passa a comparar a qualificação completa,
não categorias de profissão. Não executar os exemplos de escrita sem autorização.
Consulte `aula-semanal-implementacao.md` antes de publicar.

# Planilha de leads — Aula OTB

Onde os leads do formulário da landing são guardados e como o painel `/admin` lê eles.

**Não há banco de dados.** O formulário grava numa planilha do Google, através de um Apps Script publicado como Web App. O painel `/admin` continua existindo, com login, filtros, marcação de "contatado" e exportação em CSV — ele só troca a fonte dos dados.

```
formulário → POST /api/inscricao (Vercel) → Web App do Apps Script → planilha Google
                                              ↑
                            painel /admin lê pela mesma porta
```

---

## 1. Setup (uma vez)

### 1.1 Criar a planilha

Google Drive → **Novo** → **Planilhas Google**. Nome sugerido: `Aula OTB — Leads`.

Compartilhe só com o time comercial, por e-mail, como *Leitor* (ou *Editor* para quem vai anotar). **Não** deixe pública: a planilha guarda nome, e-mail e telefone — dado pessoal sob a LGPD.

### 1.2 Colar o script

Na planilha: menu **Extensões** → **Apps Script**. Isso cria um script *vinculado* à planilha (é o que faz o código achar a planilha sozinho, sem precisar de ID).

Apague tudo que estiver no `Código.gs` e cole o conteúdo de [`scripts/apps-script/Code.gs`](../scripts/apps-script/Code.gs). Salve (ícone de disquete).

### 1.3 Gerar o segredo

No seletor de função no topo do editor, escolha **`configurar`** e clique em **Executar**.

O Google vai pedir autorização na primeira vez: *Revisar permissões* → sua conta → *Avançado* → *Acessar o projeto (não seguro)* → *Permitir*. É o fluxo normal para script próprio não verificado.

Abra o **Registro de execução** e copie a linha:

```
SHEETS_SHARED_SECRET = 1a2b3c...
```

A aba `leads` com os cabeçalhos aparece na planilha.

### 1.4 Publicar como Web App

**Implantar** → **Nova implantação** → engrenagem → **Aplicativo da Web**.

| Campo | Valor |
|---|---|
| Descrição | `v1` |
| Executar como | **Eu** |
| Quem tem acesso | **Qualquer pessoa** |

Clique em **Implantar** e copie a **URL do app da Web**. Ela termina em **`/exec`**.

> "Qualquer pessoa" não expõe os leads: toda operação exige o segredo no corpo da requisição. Sem ele, o script responde `unauthorized` e nada mais.

> ⚠️ A URL que termina em **`/dev`** não serve — ela exige estar logado no Google e o site vai receber uma página HTML de login em vez de dados.

### 1.5 Testar antes de mexer na Vercel

Ver [§4](#4-verificação).

### 1.6 Configurar o ambiente

**Vercel:** projeto → *Settings* → *Environment Variables*. Adicione em **Production, Preview e Development**:

| Nome | Valor |
|---|---|
| `SHEETS_WEBAPP_URL` | a URL `/exec` do passo 1.4 |
| `SHEETS_SHARED_SECRET` | o segredo do passo 1.3 |

Depois faça *Deployments* → ⋯ → *Redeploy*.

**Local:** as mesmas duas linhas em `.env.local` (arquivo não commitado).

---

## 2. Variáveis de ambiente

Bloco para o `.env.example` / `.env.local`:

```bash
# === Store de leads (Google Sheets via Apps Script Web App) ===
# URL /exec da implantação do Web App. SERVER-ONLY — nunca prefixar com PUBLIC_.
SHEETS_WEBAPP_URL=
# Segredo compartilhado — mesmo valor da Propriedade de Script `SHARED_SECRET`.
SHEETS_SHARED_SECRET=
# Opcional: teto por tentativa em ms (default 30000; cobre o cold start do Web App).
SHEETS_TIMEOUT_MS=

# === Canal degradado ===
# Se a planilha cair, o lead ainda é entregue por aqui. Configure.
LEAD_NOTIFY_WEBHOOK_URL=
LEAD_NOTIFY_WEBHOOK_SECRET=

# === Painel /admin ===
ADMIN_USERS=
ADMIN_SESSION_SECRET=

# === Tracking ===
PUBLIC_GA4_ID=
PUBLIC_FB_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_CAPI_TEST_EVENT_CODE=

# Override opcional do endpoint do formulário (default: /api/inscricao).
PUBLIC_FORM_ENDPOINT=
```

**Nenhuma das duas variáveis do Sheets pode ganhar prefixo `PUBLIC_`.** O Vite injeta tudo que começa com `PUBLIC_` no bundle do navegador — o segredo ficaria visível para qualquer visitante. Pelo mesmo motivo, **nunca** aponte `PUBLIC_FORM_ENDPOINT` direto para a URL do Apps Script: `/api/inscricao` é o único caminho.

---

## 3. Contrato da planilha

Aba **`leads`**. Os cabeçalhos estão em português para o time, mas **o script endereça as colunas por posição**.

| Col | Cabeçalho | Conteúdo |
|---|---|---|
| A | `id` | `lead_<timestamp>_<hash>` |
| B | `criado_em` | data/hora ISO 8601 |
| C | `atualizado_em` | data/hora ISO 8601 |
| D | `nome` | |
| E | `email` | chave de deduplicação |
| F | `telefone` | |
| G | `profissao` | alimenta o filtro do painel |
| H | `status` | `novo` ou `contatado` |
| I | `contatado_em` | |
| J | `consentimento` | `TRUE` / `FALSE` (LGPD) |
| K | `consentimento_em` | |
| L | `utm` | JSON de atribuição |
| M | `referrer` | |
| N | `user_agent` | |
| O | `landing_path` | |
| P | `fonte` | derivada de L — `iese`, `instagram`, `google`, `direto`… |
| Q | `midia` | derivada de L — `paid`, `organic`, `referral`, `cpc`… |
| R | `campanha` | derivada de L — `aula-otb-0909` |

P, Q e R existem para o time filtrar tráfego sem ler JSON. São **derivadas**: editá-las à mão não adianta, a próxima gravação da linha sobrescreve. Convenção dos links e regra de derivação: [`utm.md`](./utm.md).

### Regras de ouro

1. **Não reordene, não renomeie e não insira colunas entre A e R.** Renomear cabeçalho é inofensivo; reordenar corrompe todos os registros.
2. **Anotações do time vão da coluna S em diante.** O script escreve exatamente 18 colunas, então nada de S para frente é sobrescrito. É a via oficial para adicionar "notas", "responsável".
3. **Não renomeie a aba `leads`.**
4. **Não apague linhas manualmente durante um lançamento.**

### Deduplicação

O `email` é a chave. Se a mesma pessoa se inscrever duas vezes, a linha existente é **atualizada** — nome, telefone, profissão e UTM mais recentes vencem; `id`, `criado_em`, `status` e `contatado_em` são preservados. Isso também é o que torna seguro o site repetir um envio depois de um timeout.

### Fuso horário

Os filtros de data do painel (`de` / `até`) usam o dia em **America/Sao_Paulo**, igual às datas exibidas na tabela.

---

## 4. Verificação

### 4.1 Web App isolado

```bash
export URL='https://script.google.com/macros/s/.../exec'
export S='<segredo>'

# health via GET
curl -sS -L "$URL?secret=$S"
# {"ok":true,"action":"ping","data":{"version":3,"sheet":"leads","rows":0,...}}

# health via POST (o mesmo caminho que o site usa)
curl -sS -L -H 'Content-Type: application/json' \
  -d "{\"secret\":\"$S\",\"action\":\"ping\"}" "$URL"

# segredo errado
curl -sS -L -H 'Content-Type: application/json' \
  -d '{"secret":"errado","action":"ping"}' "$URL"
# {"ok":false,"error":"unauthorized"}  — com HTTP 200, é assim mesmo
```

> Use `-L` puro. **Não** use `-X POST` nem `--post302`: o Apps Script responde 302 e o corpo já foi processado; reenviar o POST no redirecionamento quebra a chamada.

Se qualquer uma dessas devolver **HTML** em vez de JSON, a implantação está como `/dev` ou o acesso não está em "Qualquer pessoa".

```bash
# gravação + deduplicação
curl -sS -L -H 'Content-Type: application/json' -d "{\"secret\":\"$S\",\"action\":\"capture\",\"payload\":{\"contact\":{\"name\":\"Teste Curl\",\"email\":\"curl@aula-otb.local\",\"phone\":\"62999990000\",\"profession\":\"QA\",\"consentGiven\":true,\"consentTimestamp\":\"2026-08-10T12:00:00.000Z\"},\"meta\":{\"utm\":{\"utm_source\":\"curl\"},\"landingPath\":\"/\"}}}" "$URL"
# 1ª vez: "created":true   ·   2ª vez: "created":false e `atualizado_em` muda

# limpeza
curl -sS -L -H 'Content-Type: application/json' \
  -d "{\"secret\":\"$S\",\"action\":\"purgeByEmail\",\"payload\":{\"email\":\"curl@aula-otb.local\"}}" "$URL"
```

**Confira na planilha:** exatamente uma linha; `id` começa com `lead_`; `criado_em` e `atualizado_em` aparecem **alinhados à esquerda** (se estiverem à direita, o formato de texto puro não pegou); o telefone manteve todos os dígitos; `utm` é um JSON legível; `fonte` = `curl` (derivada do `utm_source` do payload).

### 4.2 Local

```bash
bun run dev

curl -sS -i -X POST http://localhost:4321/api/inscricao \
  -H 'Content-Type: application/json' \
  -d '{"contact":{"name":"Teste Local","email":"local@aula-otb.local","phone":"62999991111","profession":"Dermato","consentGiven":true,"consentTimestamp":"2026-08-10T12:00:00.000Z"},"meta":{"utm":{"utm_source":"local"},"landingPath":"/","eventId":"evt-local-1"}}'
# HTTP 201 · {"ok":true,"leadId":"lead_...","created":true,...}
```

Caminhos negativos que devem falhar do jeito certo:

| Cenário | Esperado |
|---|---|
| `Content-Type: text/plain` | **403** (proteção de origem do Astro barra antes do 415) |
| payload sem `contact` | **400** `invalid_payload` |
| `SHEETS_WEBAPP_URL` vazio | **503** `lead_store_not_configured` |
| `SHEETS_SHARED_SECRET` errado | **502** `store_unauthorized` + `[inscricao] lead_store_degraded` no terminal, **sem dado pessoal** |

O último é o teste de regressão importante — e o comportamento esperado **mudou na issue #2**. Antes, com o segredo quebrado, o formulário ainda mostrava "Inscrição confirmada" e tentava abrir o WhatsApp num `window.open()` depois do `await` (bloqueável por popup blocker). Isso afirmava persistência sem prova e, se o popup fosse barrado, o lead podia não chegar a destino nenhum.

Agora: o formulário mostra **painel de erro**, mantém os dados digitados, oferece "Tentar enviar de novo" e um link de WhatsApp que **a pessoa clica**. Nenhum `lead_submit` e nenhum `generate_lead` são registrados — só `form_submit_error` com o motivo. O lead continua saindo pelos canais de sobrevivência do servidor: log sem PII, webhook com prefixo `[FALHA]` e CRM.

Para reproduzir os cinco desfechos sem quebrar o ambiente:

```bash
bun run build && bun run preview   # ou qualquer servidor sobre dist/client
node scripts/check-form-states.mjs http://localhost:4321
```

Ele intercepta `/api/inscricao` e confere UI + eventos em: 201 com `persisted`, 503, 201 sem prova de persistência, corpo não-JSON e o aceitador transitório.

### 4.3 Painel

Entre em `/admin`, depois `/admin/leads`:

- os cards Total / Novos / Contatados batem com a planilha;
- o `<select>` de profissão vem da coluna G;
- `?q=`, `?status=`, `?profession=`, `?from=`/`?to=`, `?page=2` filtram corretamente;
- **Marcar contatado** reflete nas colunas H e I em segundos;
- **Baixar CSV** respeita o filtro ativo;
- em *Apps Script → Execuções*, cada carregamento do painel deve gerar **1** execução, não 3.

### 4.4 Smoke completo

```bash
SHEETS_WEBAPP_URL=... SHEETS_SHARED_SECRET=... \
ADMIN_USERS=... ADMIN_SESSION_SECRET=... \
bun run smoke
```

> `ADMIN_USERS` aqui é **descartável**, nunca o de produção: o smoke exige que a senha sintética `senha-correta` valide. Gere o valor de `passwordHash` com `printf '%s' 'senha-correta' | bun scripts/admin-password-hash.mjs`. Use `ADMIN_PASSWORD_RECOVERY_ENABLED=false` neste bootstrap isolado. A recuperação real e o setup v4 estão em [`operacao-leads-aula-semanal.md`](./operacao-leads-aula-semanal.md).

O smoke agora **falha alto** se o Web App publicado estiver atrás do `Code.gs` do repositório (`Web App na v3`), e confere `fonte`/`midia`/`campanha` vindos da planilha — antes ele mandava `utm_source: "smoke"` e não conferia nada de origem.

---

## 5. Manutenção

### Alterar o `Code.gs`

**Implantar** → **Gerenciar implantações** → lápis → **Versão: Nova versão** → **Implantar**.

A URL **não muda**. Criar uma implantação *nova* geraria outra URL e quebraria o site.

### Migração para as colunas `fonte` / `midia` / `campanha` (P/Q/R)

Planilha criada antes destas colunas precisa de três passos, **nesta ordem**:

0. **Nomeie a versão atual** da planilha: *Arquivo → Histórico de versões → Nomear versão atual* → `pre-migracao-v3-AAAA-MM-DD`. Anote também o **número da versão publicada** em *Implantar → Gerenciar implantações* — é o alvo do rollback.
1. Cole o `Code.gs` atualizado e publique **Nova versão** (acima). Confirme com `ping`: `"version":3`.
2. Rode a função **`migrarDryRun`** → **Executar**. Ela mostra exatamente o que `migrar` faria e **não escreve nada**.
3. Só com o dry-run limpo, rode **`migrar`** → **Executar**.

`migrar` cria os cabeçalhos P/Q/R e preenche as linhas antigas a partir do JSON da coluna L. É idempotente e não toca em nada fora de P/Q/R.

Confira no `Registro de execução`:

| Log | Significado |
|---|---|
| `[DRY-RUN] N linha(s) seriam reescritas em P/Q/R; M com valor diferente do atual.` + resumo por origem | caminho feliz — siga para o passo 3 |
| `[DRY-RUN] migrar criaria 3 coluna(s) e o(s) cabeçalho(s) P/Q/R.` | aba ainda com 15 colunas; esperado |
| `[DRY-RUN] NADA FOI ESCRITO. Rode migrar para aplicar.` | fim do dry-run, sempre presente quando não abortou |
| `migrar: N linha(s) com fonte/midia/campanha.` | pronto |
| `migrar: nenhuma linha de lead — só os cabeçalhos foram criados.` | planilha ainda vazia, pronto |
| `migrar ABORTADO — cabeçalho ocupado: P1 = "…"` | o time usava P/Q/R. **Nada foi escrito.** Mova para S+ e rode de novo |
| `migrar ABORTADO — conteúdo sem cabeçalho em Q7 …` | idem — a v1 nunca escreveu além de O, então aquilo é anotação humana |

Se o total do `migrar` não bater com o do dry-run (fora leads que chegaram no intervalo), pare e investigue antes de seguir.

A guarda existe porque `capture_` escreve a linha inteira (A–R): sem ela, o primeiro lead novo apagaria a anotação em silêncio. Rode `migrar` **logo depois** do deploy — entre os dois passos, um lead que chegue já grava P/Q/R daquela linha.

> **A guarda ficou mais rígida na issue #2.** Antes, bastava **uma** das três colunas ter cabeçalho nosso para a varredura do corpo ser pulada inteira: com `P1 = fonte`, `Q1` em branco e uma anotação em `Q7`, o `setValues` passava por cima em silêncio. Agora "já migrada" é propriedade de **cada coluna** — o corpo é varrido em toda coluna sem cabeçalho.

### P/Q/R são derivadas e machine-owned

`toRow_` recalcula as três em **toda** gravação da linha. Editar P/Q/R à mão não adianta: a próxima `capture`/`setContacted` daquela linha sobrescreve. Anotação do time começa na coluna **S**.

Desde a v3 o `toLead_` **devolve** essas colunas, e painel, CSV e CRM passam a exibir o valor **gravado** em vez de recalcular a regra em TypeScript. Antes cada consumidor recalculava com um host diferente (`Astro.url.hostname` no painel, `url.hostname` no CSV, o host canônico no CRM) — num preview da Vercel, o mesmo lead aparecia como `aulaotb.gpus.com.br / referral` no painel e `direto` na planilha.

### Diagnóstico

| Código no painel | Causa | O que fazer |
|---|---|---|
| `lead_store_not_configured` | falta `SHEETS_WEBAPP_URL` ou `SHEETS_SHARED_SECRET` | conferir env na Vercel e redeployar |
| `store_unauthorized` | segredo não bate com a Propriedade de Script | rodar `configurar` de novo e atualizar a env |
| `store_invalid_response` | resposta em HTML | implantação em `/dev`, ou acesso não é "Qualquer pessoa" |
| `store_timeout` | Apps Script demorou | normalmente transitório; conferir *Execuções* |
| `store_locked` | duas gravações concorrentes | transitório; o cliente já tenta de novo uma vez |

Erros de execução ficam em **Apps Script → Execuções** (logging Stackdriver ligado no manifesto).

### Limites

Um lançamento de aula gratuita (centenas a poucos milhares de inscrições) fica confortavelmente dentro da capacidade do Apps Script. Se a planilha passar de ~20 mil linhas, a gravação com deduplicação começa a ficar lenta — nesse ponto, troque `capture` para gravação simples (append) e faça a deduplicação uma vez por dia.

---

## 6. LGPD

- O formulário exige consentimento explícito; ele é gravado nas colunas J e K.
- A planilha contém dado pessoal: restrinja o compartilhamento e nunca a torne pública ou "qualquer pessoa com o link".
- Pedido de exclusão: apague a linha da pessoa na planilha (ou use a ação `purgeByEmail` com o e-mail dela).
- Os logs do servidor **não** registram dado pessoal — só o código do erro, o caminho da landing e o domínio do e-mail.
