# Na Mesa com Sacha — produto

Landing do Grupo US para aulas semanais gratuitas com Dra. Sacha Gualberto.
A página principal é `/`; esta cópia é um produto próprio, não uma segunda campanha.

## Público e proposta

Profissionais de Saúde Estética e HOF que buscam clareza para organizar a agenda,
comunicar seu trabalho, construir posicionamento e melhorar seu processo comercial.
Aulas ao vivo, toda terça-feira, no Zoom. Horário, duração, próxima data e link de
acesso não foram confirmados e não devem ser inventados.

## Conteúdo e conversão

Fonte única: `src/content/products/aula-semanal.json`, na collection `products`.
Estrutura: hero com formulário e retrato; três temas;
autoridade solo da Sacha; CTA e rodapé legal.

CTA principal: “Quero garantir minha vaga”, para `#inscricao`.
Sem contagem regressiva, urgência artificial, preço, oferta de outro curso,
depoimentos herdados, FAQ de preenchimento ou certificações não verificadas.
A autoridade é apresentada sem endosso de universidades ou promessa de faturamento.

## Inscrição e dados

Reutilizar `POST /api/inscricao` e o contrato de armazenamento existente.
Nome, telefone, e-mail e consentimento são obrigatórios. Tempo de atuação e faixa
de faturamento são qualificadores opcionais; não pedir valor exato nem documentos.
Os dois valores são rotulados e compostos no campo técnico `profession`, sem
alterar colunas. Isso representa qualificação, não uma profissão literal; o painel
e a documentação devem explicar esse limite. Uma separação futura exige migração
aprovada, não uma nova coluna silenciosa.

Consentimento nunca pré-marcado. Informar a finalidade na política de privacidade.
Nenhum valor de contato ou qualificação vai para analytics ou logs do navegador.
Sucesso exige a resposta de persistência comprovada do endpoint. Na falha, mostrar
erro, nova tentativa e WhatsApp via `src/lib/whatsapp.ts`, com “Olá, Laura!”.
Não reutilizar convite de grupo de outra campanha.

## Limites operacionais

Este trabalho é local. Destinos de captura, CRM, autenticação, secrets e tracking
não são alterados pela troca visual. O domínio de produção desta série ainda está
pendente; valores técnicos herdados não representam aprovação para publicar.
Consultar `docs/aula-semanal-implementacao.md` antes de qualquer publicação.

## Validação

Uma inscrição só conta como conversão após persistência. Verificar formulário
válido/inválido, consentimento, timeout, erro de rede e resposta sem persistência
com endpoint interceptado, sem gravação real. Medir a apresentação em desktop e
mobile, incluindo foco, contraste e ausência de sobreposição sobre o formulário.
