# src/components/landing/ — AGENTS.md

> Convenções das seções da landing GPUS. Vale ao editar `src/components/landing/*`. Âncoras e rotas de instância em `.graph-powers/config.json` (`${content.anchors}`, `${content.sections.<key>}`).

Este subtree owns the landing sections, their data props, anchors, and registration-flow presentation.

## Seções e âncoras

| Componente | Âncora | Consome (`.data`) |
|---|---|---|
| `Hero.astro` | (topo) | `hero` + `event` + `faculty` (nomes do plate `hero.duo`) + `registration` |
| `Audience.astro` | `${content.sections.audience}` | `audience` |
| `Learn.astro` | `${content.sections.learn}` | `learn` |
| `Comparison.astro` | — | `comparison` (opcional) |
| `Mechanism.astro` | `${content.sections.mechanism}` | `mechanism` (opcional) |
| `Faculty.astro` | `${content.sections.authority}` | `faculty` (corpo docente; herdou a âncora do antigo `Authority`) |
| `NextStep.astro` | — | `nextStep` (opcional) |
| `${lead.formComponent}` | `${content.sections.form}` | `registration` |
| `FAQ.astro` | `${content.sections.faq}` | `faqs` (emite FAQPage JSON-LD) |
| `FinalCTA.astro` | — | `finalCta` |
| `MobileCTABar.astro` | — | `{ label, href }` (→ `${content.sections.form}`) |

Composição e ordem: `src/pages/index.astro`.

## Padrões

- Cada seção = um `.astro` com `interface Props` tipando o sub-objeto do schema que recebe. Sem buscar conteúdo dentro do componente.
- Primitives compartilhadas: `../shared/{Button,Card,SectionHeading,OtbMark}.astro`. Não duplicar.
- **Ícones**: wrapper `../shared/Icon.astro` (`<Icon name="…" />`, usado por `ProofBar` e `Mechanism`) ou SVG inline com `aria-hidden="true"`. **Nunca emoji**.
- **Tokens**: classes utilitárias do `@theme` (`text-gold`, `bg-navy-light`, `glass-card`, `glass-card-bright`, `card-glow-hover`). Gold sem teto fixo — usar para hierarquia e impacto. Sem hex inline.
- **Reveal**: `data-reveal` + `data-reveal-delay`. Motion livre (qualquer propriedade); `transform`/`opacity` preferidos por performance. Honrar `prefers-reduced-motion`.
- **CTAs**: primário = âncora interna (`${content.sections.form}`), sem `target`. WhatsApp = `whatsappUrlWithText(message)` (mensagem do JSON, começa `${lead.whatsappGreeting}`), `target="_blank" rel="noopener noreferrer"`.
- **Headings**: seções usam `<h2>` (via `SectionHeading`); o único `<h1>` é o do Hero.

## Formulário de inscrição (`${lead.formComponent}`) — contrato

- Form nativo: `name`, `email`, `phone` (obrigatórios) + `profession` (opcional). `<label for>` reais, `aria-required`, `aria-invalid` em erro, mensagens por campo + região `role="status"`.
- Consent LGPD obrigatório + link para a rota de privacidade (`${content.legalRoutes}`).
- Submit: valida → POST a `import.meta.env.${lead.endpointEnv}` quando definido; senão **fallback** abre o WhatsApp do(a) `${lead.sdrName}` (lead não se perde). Estados loading/erro/sucesso. Sem logar PII.
- Tracking de eventos (lead/submit) entra quando GA4/Pixel forem plugados (`${tracking.ga4Env}`, `${tracking.pixelEnv}`) — ver `.claude/rules/seo.md` + `Layout.astro`.

## FAQ

- `<details>`/`<summary>` nativo ou disclosure animado (height/grid livre). Emite `FAQPage` JSON-LD a partir de `faqs` (só perguntas visíveis).

## Não fazer

- Copy/oferta/data hardcoded (vem do JSON; datas não confirmadas = placeholder `[definir…]`).
- Ilha React para coisa que um `<script>` inline resolve.
- Credenciais/depoimentos/promessas não confirmados.
