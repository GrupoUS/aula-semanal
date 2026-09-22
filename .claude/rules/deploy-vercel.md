---
paths:
  - ".vercelignore"
  - "vercel.json"
  - "astro.config.mjs"
  - "scripts/verify-vercel-upload.mjs"
  - "src/scripts/**"
---

# Deploy Vercel — o que já quebrou aqui

> Domínio deste repositório. Registro completo em `docs/aula-otb-changelog.md`, entrada de
> 2026-08-18, e no commit `c67f344`.

## 1. Padrão de pasta da raiz no `.vercelignore` leva barra inicial

Um padrão sem barra casa em **qualquer nível**. A linha `scripts` (sem `/`) casou também
`src/scripts/` e removeu `src/scripts/motion.ts` do upload. O build local ficou verde, os três
gates passaram, e a Vercel quebrou com `Could not resolve "../scripts/motion.ts"`.

- Pasta de tooling da raiz: `/scripts`, `/docs`, `/.claude`, `/.graph-powers` — **com** barra.
- Padrão de artefato: `node_modules`, `*.log`, `.astro`, `dist` — **sem** barra, de propósito:
  ali casar em qualquer nível é justamente o que se quer.

Este repositório tem **duas** pastas chamadas `scripts` — `/scripts` (tooling) e `src/scripts`
(código que vai para o cliente). É essa colisão que torna a regra necessária.

## 2. `bun run build` não aplica o `.vercelignore`

É por isso que um erro de padrão é invisível localmente. O gate que fecha o buraco:

```bash
bun run verify:vercel            # reproduz o filtro com o matcher do proprio git
node scripts/verify-vercel-upload.mjs --build   # copia so o que sobe e roda o pipeline isolado
```

Falha se qualquer arquivo de `src/`, `public/` ou config de build sumir do upload.
Rodar sempre que `.vercelignore` mudar.

## 3. Node local ≠ Node da Vercel

O build avisa quando a versão local não é suportada (hoje: local 26, Vercel usa 24). É aviso, não
erro — mas descarta "funciona na minha máquina" como evidência de que a função serverless roda.
