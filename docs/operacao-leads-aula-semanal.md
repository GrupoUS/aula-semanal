# Inscrições e acompanhamento — Na Mesa com Sacha

## Endereços

- Landing: https://aula-semanal.vercel.app/
- Login da equipe: https://aula-semanal.vercel.app/admin
- Painel após login: https://aula-semanal.vercel.app/admin/leads
- Configuração: https://vercel.com/suporte-8670s-projects/aula-semanal/settings/environment-variables

## O que foi comprovado em 22/09/2026

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
| `ADMIN_USERS` | Lista JSON (ou a mesma lista em base64) de usuários de acesso |
| `ADMIN_SESSION_SECRET` | Segredo de assinatura de sessão, não vazio |

Formato do registro de usuário existente:

```json
[{"username":"<usuario>","passwordSha256":"<hash SHA-256 hexadecimal da senha>","role":"admin"}]
```

Os placeholders acima não são valores de configuração. Não colocar senhas em
texto puro no JSON, nos arquivos do projeto ou em mensagens de chat. O responsável
pelas credenciais deve validar seus valores originais e, se necessário, reaplicá-los
na Vercel, no projeto e ambiente corretos. Alterações de secrets e publicação
exigem autorização específica. Não recriar a planilha nem executar migrações
para tentar corrigir login.

O link direto da planilha não foi identificado nesta auditoria: seu endereço não
é a URL `/exec`. O proprietário do Apps Script consegue abrir a planilha vinculada
e compartilhar acesso com a equipe conforme as permissões internas.

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
