# Na Mesa com Sacha — direção visual

Referência principal: print fornecido pelo usuário. O Figma compartilhado exige
login; medidas e frame mobile não foram inspecionados. Esta direção pertence à
aula semanal e substitui o sistema visual herdado nesta pasta.

## Composição

Hero editorial com azul-marinho profundo, linhas curvas douradas discretas e
retrato real da Sacha em escala grande. Texto e formulário à esquerda no desktop;
retrato à direita, sem invadir controles. Lockup tipográfico “NA MESA” acompanhado
de “com Sacha Gualberto”. Não usar monograma de outro produto.

Título serifado branco com trecho em dourado claro. Corrigir a repetição “ao vivo”
do mock. Corpo e controles em sans-serif. Usar as fontes disponíveis; não adicionar
dependência para tipografia. Todos os valores técnicos vivem no `@theme` do CSS.

Formulário compacto com campos claros, cantos suaves, texto escuro e CTA dourado.
Labels acessíveis, estados legíveis e consentimento têm precedência sobre a
omissão desses elementos no mock. Campos opcionais devem ser identificados.

Abaixo do hero: faixa tipográfica, seção clara com três cards e bloco de autoridade
solo. Espaçamento generoso, hierarquia por tamanho e contraste, sem decoração de
painel ou grade coletiva de professores. Rodapé discreto com privacidade e termos.

## Responsividade e movimento

Mobile deve preservar leitura e acesso rápido ao formulário; o retrato não pode
empurrar a inscrição por várias telas. Sem overflow horizontal. Botões e controles
com área de toque confortável, foco visível e navegação por teclado.

Movimento sutil e opcional. Respeitar `prefers-reduced-motion`; o formulário nunca
recebe fade de saída, parallax ou transformação que atrapalhe preenchimento.
Conteúdo legível também sem JavaScript. Não duplicar texto significativo para
leitores de tela em faixas decorativas.

## Assets e critérios

Reutilizar retratos locais reais. Não afirmar que o JPEG existente é o recorte exato
do Figma. Imagens com dimensões explícitas; prioridade alta apenas no retrato LCP.
OG e favicon devem expressar a identidade desta série, sem marca antiga.

Verificar hero desktop/mobile, contraste, foco, navegação, formulário, estados e
chrome inferior. Tokens globais também afetam o painel: preservar sua legibilidade.
