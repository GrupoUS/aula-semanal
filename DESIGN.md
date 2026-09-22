# Na Mesa com Sacha — direção visual

Referência principal: Figma inspecionado após login em 22/09/2026. Frames originais
Desktop 1080 × 1682 e Mobile 390 × 2409 exportados em `docs/figma/`. Assets originais
em `src/assets/na-mesa/`. Esta direção substitui a aproximação inicial e o sistema
visual herdado nesta pasta.

## Composição

Hero editorial com azul-marinho profundo, linhas curvas douradas discretas e
retrato real da Sacha em escala grande. Texto e formulário à esquerda no desktop;
retrato à direita, sem invadir controles. Lockup tipográfico “NA MESA” acompanhado
de “com Sacha Gualberto”. Não usar monograma de outro produto.

Título em Abhaya Libre 800, branco com trecho dourado. Corrigir a repetição “ao vivo”
do mock. Corpo Inter leve com ênfases 700; fontes carregadas pelo provider Astro
existente, sem nova dependência. Todos os valores técnicos vivem no `@theme` do CSS.

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

Usar os retratos, fundos, logo e ícones exportados do arquivo Figma, preservando
texto e controles em HTML. No mobile, retrato grande acima do título e fade da foto
de autoridade para o texto. Imagens com dimensões explícitas e otimização Astro.
OG e favicon devem expressar a identidade desta série, sem marca antiga.

Verificar hero desktop/mobile, contraste, foco, navegação, formulário, estados e
chrome inferior. Tokens globais também afetam o painel: preservar sua legibilidade.
