# Inscrições e acompanhamento — Na Mesa com Sacha

## Endereços

- Landing: https://aula-semanal.vercel.app/
- Login da equipe: https://aula-semanal.vercel.app/admin
- Painel após login: https://aula-semanal.vercel.app/admin/leads
- Configuração: https://vercel.com/suporte-8670s-projects/aula-semanal/settings/environment-variables

## Verificação inicial em 22/09/2026 (antes da configuração abaixo)

O deploy consultado está Ready e as páginas públicas retornam 200. O formulário
publicado aponta para `/api/inscricao` no próprio domínio. Uma requisição com
payload inválido foi rejeitada com 400 antes de qualquer gravação.

O painel retorna a tela de login, mas informa que `ADMIN_USERS` e
`ADMIN_SESSION_SECRET` não estão disponíveis/configurados. `/admin/leads`
redireciona para o login; não é possível acompanhar leads pelo painel nesse estado.

As variáveis ADMIN e SHEETS existem na configuração e seus nomes constam no
snapshot do deploy. Foram criadas antes do deploy, não depois. São Sensitive:
a Vercel não permite reler seu conteúdo. Não foi possível comprovar se os valores
são válidos ou estão efetivamente disponíveis ao runtime. O getter de env e a
compatibilidade do adapter foram conferidos sem evidência de defeito no código.
Um redeploy isolado não é uma solução comprovada para esse alerta.

Não houve envio válido de inscrição, leitura de leads pessoais, login autenticado
nem alteração de credenciais nesta verificação. Gravação real ainda não comprovada.

## Caminho de uma inscrição

1. Navegador valida nome, telefone, e-mail e consentimento obrigatório.
2. Tempo de atuação e faixa de faturamento são opcionais. São enviados rotulados
   dentro de `contact.profession`, mantendo o contrato existente.
3. `POST /api/inscricao` valida o payload e chama o Apps Script usando configuração
   exclusiva do servidor. Os secrets não são enviados ao navegador.
4. O Apps Script grava na aba `leads` da planilha à qual está vinculado. Faz upsert
   por e-mail: uma nova inscrição com o mesmo e-mail atualiza a linha existente;
   não é um histórico de participação em cada aula.
5. O navegador confirma somente quando recebe `ok: true`, `persisted: true` e
   `leadId`. Falha mostra erro/retry e WhatsApp, sem falsa confirmação.
6. Webhook e CRM são canais complementares quando configurados. Sucesso deles
   não substitui a confirmação da planilha no formulário.

## Configuração necessária para operar

| Variável | Finalidade |
|---|---|
| `SHEETS_WEBAPP_URL` | URL `/exec` do Apps Script publicado, associado à planilha correta |
| `SHEETS_SHARED_SECRET` | Deve coincidir com `SHARED_SECRET` nas propriedades desse Apps Script |
| `ADMIN_USERS` | Lista JSON (ou a mesma lista em base64) de usuários de acesso; COMERCIAL usa `role: vendas` |
| `ADMIN_SESSION_SECRET` | Segredo aleatório de assinatura de sessão, com no mínimo 32 caracteres |
| `ADMIN_PASSWORD_RECOVERY_ENABLED` | `true` após configurar o Apps Script v4 e autorizar MailApp; `false` apenas para bootstrap local |
| `ADMIN_APP_ORIGIN` | Origem HTTPS exata do painel, sem caminho/query/fragmento; usada no link de recuperação |

Formato recomendado do registro de usuário:

```json
[{"username":"COMERCIAL","passwordHash":"pbkdf2-sha256$600000$<salt hexadecimal de 32 caracteres>$<digest hexadecimal de 64 caracteres>","role":"vendas"}]
```

Os placeholders acima não são valores de configuração. Não colocar senhas em
texto puro no JSON, nos arquivos do projeto ou em mensagens de chat. O responsável
pelas credenciais deve validar seus valores originais e, se necessário, reaplicá-los
na Vercel, no projeto e ambiente corretos. Alterações de secrets e publicação
exigem autorização específica. O campo legado `passwordSha256` ainda é aceito
para outros usuários existentes; novas senhas usam PBKDF2-SHA256, 600.000
iterações, salt aleatório de 16 bytes e derivação de 32 bytes. O helper
`bun scripts/admin-password-hash.mjs` lê a senha pela entrada padrão; não passar
a senha como argumento do shell. O hash retornado também deve ser guardado como
credencial, sem log ou mensagem pública.

## Nova instalação do Apps Script e recuperação

A nova planilha da série e o script vinculado foram criados pelo responsável
na conta de suporte durante esta configuração:

- [Planilha Na Mesa com Sacha](https://docs.google.com/spreadsheets/d/1IfFc8toBEEURZRYXuWQQPTicdlIjQYouNFdCMgvSv0o/edit)
- [Apps Script vinculado](https://script.google.com/u/0/home/projects/1v0I0X31mM6c8Gd_0-saL2_kEVtlHBmV3HbHHqaaKZIIVLZIkVGrUFsaH/edit)
- [Pasta ChatGPT no Drive](https://drive.google.com/drive/folders/1MFRgbvQynbQU4FgQod0DKXFmAUMLmv-j)

A planilha permanece privada. Projeto Vercel vinculado:
`prj_1YXVnJ92ezyua5SfncvFyeVAe525`. A autorização OAuth foi aprovada e
`configurarAulaSemanal` executou com sucesso. A implantação v1 do Apps Script
foi publicada com o contrato API v4 e as correções de recuperação/CSV/planilha.
A URL `/exec` e o segredo foram configurados no ambiente local protegido,
com `ADMIN_APP_ORIGIN=https://aula-semanal.vercel.app` e recuperação habilitada.
O endpoint de implantação é armazenado em `SHEETS_WEBAPP_URL`; o segredo deve
continuar fora deste documento.
As seis variáveis de operação também foram configuradas no ambiente Production
da Vercel. O deploy do site ainda aguarda confirmação final; configurar env não
atualiza a implantação já publicada.

Provas de runtime concluídas: ping real autenticado por POST confirmou API v4,
aba `leads` e zero linhas. O login COMERCIAL redirecionou com 303, definiu cookie
HttpOnly e abriu o dashboard conectado com HTTP 200. A rodada completa levou
5.646 ms. Houve timeout na primeira consulta `adminAuth`; consultas posteriores
passaram, incluindo uma abaixo de 2,3 segundos. O erro de URL ausente foi
resolvido. Como a planilha está vazia, essa prova não envolve leads pessoais.

Nenhum e-mail de recuperação foi enviado nesta verificação. A entrega real e o
link no domínio público precisam ser testados após publicar o site atualizado;
os checks locais de recuperação continuam sendo testes isolados.

1. Copiar `scripts/apps-script/Code.gs` para o projeto vinculado e salvar. A versão
   atual é 4; não alterar/reordenar as colunas de leads.
2. Executar `configurarAulaSemanal`. A função cria a aba/cabeçalhos e gera
   `SHARED_SECRET` somente se ainda não existir. Pode ser repetida sem trocar o
   segredo. O marcador `@OnlyCurrentDoc` restringe o acesso à planilha vinculada.
3. Autorizar o acesso à planilha e `script.send_mail` para o MailApp. A função
   consulta a quota, sem enviar mensagem. Para autorizar só MailApp futuramente,
   executar `autorizarRecuperacao`. Não usar o setup legado `configurar`, que
   substitui o segredo e o imprime no registro de execução.
4. Copiar `SHARED_SECRET` de Configurações do projeto → Propriedades do script
   diretamente para o secret do servidor, sem colocar seu valor em logs/chat.
5. Publicar como Aplicativo da Web, executando como proprietário, com acesso
   “Qualquer pessoa”. Usar a URL `/exec`, nunca `/dev`. As operações continuam
   exigindo o segredo compartilhado no corpo; nenhum lead fica público.
6. Configurar `SHEETS_WEBAPP_URL`, `SHEETS_SHARED_SECRET`, `ADMIN_USERS`,
   `ADMIN_SESSION_SECRET`, `ADMIN_APP_ORIGIN` e habilitar
   `ADMIN_PASSWORD_RECOVERY_ENABLED=true` no ambiente autorizado. Alterar env na
   Vercel só passa a valer em um novo deploy. OAuth/publicação/entrega real de
   e-mail precisam ser confirmados separadamente; o teste isolado não os prova.

“Esqueci a senha” envia o link exclusivamente para `suporte@drasacha.com.br` e
redefine somente `COMERCIAL`. O token tem 32 bytes aleatórios, dura 15 minutos e
é consumido uma única vez. Apenas seu SHA-256 fica nas propriedades do script;
o token viaja no fragmento do link, é removido do endereço pelo navegador e não
entra na query string ou no referrer. O envio precisa ser aceito pelo MailApp
para a tela confirmar; isso não prova recebimento na caixa de entrada.

A nova senha exige 12–128 caracteres e confirmação. As propriedades
`NA_MESA_ADMIN_USER_COMERCIAL` guardam o hash e uma revisão. A troca da senha e o
consumo do token acontecem em uma única gravação sob lock. Cada sessão confere a
revisão: a troca invalida as sessões anteriores, sem entrar automaticamente.
Antes de derivar PBKDF2, um preflight no Apps Script verifica o token e o limite
de tentativas. A gravação final revalida o token sob lock para impedir reuso e
corrida entre requisições.
A senha no Apps Script prevalece sobre o bootstrap de `ADMIN_USERS`; falha do
store bloqueia o login e o acesso aos leads. Depois de um reset, **não desabilitar
a recuperação nem apagar suas propriedades**: isso restauraria o bootstrap.
Rollback operacional exige preservar as propriedades e usar uma credencial
aprovada, nunca recuperar o acesso desligando essa verificação.

Limites globais para este painel interno: 20 tentativas de login/minuto,
10 redefinições/minuto, 3 e-mails/hora, intervalo mínimo de 1 minuto entre
e-mails. Os contadores persistem em ScriptProperties sob lock; o login também
tem um teto local, que reinicia por processo. Todas as rotas admin enviam
`Cache-Control: private, no-store`, `Referrer-Policy: same-origin` e rejeitam
POSTs de outra origem. Sem store, origem HTTPS ou flag, a UI informa que a
recuperação ainda não está disponível.
A política `same-origin` mantém o Origin dos formulários nativos e não envia
referrer a outros sites; o token permanece fora da URL enviada ao servidor.

Validação isolada repetível: `bun scripts/check-admin-auth.ts`. Executa o
`Code.gs` real com armazenamento e MailApp simulados, verificando PBKDF2,
autenticação, envio fixo, expiração, uso único, revogação de sessões, falha
fechada, limites e rollback de falha no envio. Não envia e-mail nem grava lead.
`bun scripts/check-lead-csv.ts` verifica que o CSV neutraliza valores que poderiam
virar fórmulas no Excel/Sheets, inclusive após espaços, BOM e caracteres de
controle, preservando aspas e quebras de linha do CSV. A escrita na planilha tem
proteção própria: `setNumberFormat("@")` sozinho não impede fórmulas em
`setValues`; strings perigosas recebem o prefixo de texto antes da gravação.
O check também executa `writeRow_` do Apps Script em VM, mantendo 18 colunas e
sem gravar dados reais.

O endereço da planilha é diferente da URL `/exec`. O proprietário do Apps Script
pode compartilhar a planilha com a equipe conforme as permissões internas;
o painel não exige tornar a planilha pública.

## Uso diário depois da configuração

Entrar em `/admin`, abrir `/admin/leads`, filtrar por nome, perfil, status e data,
abrir WhatsApp quando necessário e marcar o contato como atendido. Cada integrante
pode ter seu usuário; a sessão dura oito horas. Há exportação CSV.

Limites atuais: busca textual procura nome; perfil compara a string inteira dos
dois qualificadores; dashboard pagina 200 registros; CSV exporta até 1.000.
Contadores são globais, independentemente do filtro. Não há notas de atendimento
nem histórico de presença em cada terça-feira nessa implementação.

Antes de operar, confirmar se a planilha é própria da série ou compartilhada:
upsert por e-mail não isola campanhas. A origem externa do CRM e o hostname da
atribuição ainda são herdados e não foram migrados. A ação de marcar como contatado
possui tratamento silencioso de erro do store; confirmar a mudança no painel.
