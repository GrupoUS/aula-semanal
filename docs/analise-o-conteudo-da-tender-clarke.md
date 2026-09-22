# Adoção do plugin `graph-powers` em `aula-otb`

## Context

`docs/prompts/` (6 arquivos, untracked, criados hoje) descreve a adoção de um harness compartilhado
para acabar com a divergência entre os 5 repositórios GPUS — 221 arquivos de mesmo nome, dos quais
apenas 45 idênticos e 176 divergentes, com dois defeitos de segurança corrigidos em um repo e vivos
nos outros quatro.

**Esses prompts estão desatualizados.** Eles apontam para o plugin local `~/orca/gpus-harness`
(diretório solto, sem git, nunca registrado nesta máquina). O plugin foi publicado como
**`GrupoUS/graph-powers`** — repositório privado, default branch `graph-powers-1.0`, push de
2026-08-19T20:31 — numa versão refatorada e menor, com um playbook oficial (`AGENT_SETUP.md`) que
substitui os prompts 01–03.

Este plano executa a adoção contra o plugin **remoto**, instalado em **escopo user (global)** para
receber atualizações e não duplicar com cópias locais, conforme pedido.

### O que muda em relação a `docs/prompts/`

| | `docs/prompts/` (gpus-harness) | Realidade (`graph-powers`) |
|---|---|---|
| Origem | `~/orca/gpus-harness` (local, sem git) | `GrupoUS/graph-powers` (GitHub, privado) |
| Marketplace | `gpus` | `graph-powers` |
| Alvo do install | `gpus-harness@gpus --scope project` | `graph-powers@graph-powers --scope user` |
| Config | `.claude/config.json` | `.graph-powers/config.json` **ou** `.claude/config.json` (ambos lidos) |
| Prefixo default | `GPUS` | `GRAPHPOWERS` |
| Agents / skills / commands | 16 / 19 / 15 | **12 / 12 / 12** |
| Procedimento | prompts 01–03 | `AGENT_SETUP.md`, 10 passos |
| Extras | — | `templates/rules/`, `references/safety-floor.md`, specs DESIGN/PRODUCT/REVIEW, `bin/audit-settings.mjs`, suporte Codex |

Evidência do contrato: `hooks/_config.py` declara
`CONFIG_PATHS = (".graph-powers/config.json", ".claude/config.json")` e
`project_dir()` resolve por `payload.cwd` → `CLAUDE_PROJECT_DIR` → git root. **É por isso que o
install global funciona por repositório** — o README desaconselha `--scope user` supondo o
contrário, mas o loader resolve a config do repo da sessão, não do plugin.

---

## Achados desta análise que o plano precisa tratar

1. **Precedência não é uniforme** (doc oficial, `code.claude.com/docs`):
   - **Agents** sofrem shadowing (`Project > User > Plugin`) → limpar é **obrigatório**.
   - **Skills e commands** são namespaced (`graph-powers:astro`) → **coexistem**; limpar reduz
     duplicação e ruído, não é requisito técnico.
   - **Hooks** somam-se: local e plugin **rodam os dois**.

   Correção do que eu disse antes na sessão: meu teste com `skill-creator` não provava shadowing —
   `claude plugin list` mostra `skill-creator@claude-plugins-official` com status `disabled`.

2. **Os 9 hooks em `.claude/hooks/` nunca rodaram.** `.claude/settings.json` não tem chave `hooks`.
   Remover os 9 não muda comportamento nenhum. Os logs em `.claude/logs/` vêm dos hooks **globais**.

3. **4 hooks vão disparar em duplicidade** após o install: `session_context`, `smart_bash_approver`,
   `ultracite`, `notify` — declarados tanto em `~/.claude/settings.json` (apontando
   `~/.claude/hooks/`) quanto em `plugin.json` (apontando `${CLAUDE_PLUGIN_ROOT}/hooks/`). Os
   arquivos diferem (md5 distintos).

4. **`~/.claude/skills/` duplica 7 skills do plugin** (astro, debugger, harness-audit,
   performance-optimization, planning, senior-prompt-engineer, skill-creator) e
   `~/.claude/agents/skill-improver.md` duplica 1 agent.

5. **`impeccable` não é mais vendorizado.** O plugin não o traz; o README manda instalar via
   `npx impeccable install`. A cópia local (`.claude/skills/impeccable/`, 62 arquivos, inclui um
   `.js` de 198 KB) é um snapshot que não recebe atualização.

6. **`graph-powers` não está publicado no npm** (`registry.npmjs.org/graph-powers` → `Not found`).
   `bunx graph-powers` **não funciona**; a via é o marketplace do GitHub.

7. **Consequência do escopo global, a mais importante:** com o install em `--scope user`, os gates
   de git (`git_commit_gate`, `git_push_gate`, `git_branch_gate`) e o `graph_guardrails` passam a
   valer em **todos os repositórios desta máquina**. Repositórios sem config caem nos defaults
   (`workBranch: dev-test`, prefixo `GRAPHPOWERS`), então commit sem `GRAPHPOWERS_ALLOW_COMMIT=1`
   passa a ser negado neles também. É o comportamento pretendido do harness, mas é uma mudança de
   máquina, não de projeto.

8. **Defeitos do plugin remoto** (registrar como issue upstream, não bloqueiam):
   - `examples/*.json` e o README apontam `$schema` para
     `raw.githubusercontent.com/GrupoUS/graph-powers/**main**/schema/config.schema.json`, mas a
     default branch é `graph-powers-1.0` → a URL dá 404.
   - `ultracite.py` implementa um ramo `Stop` (oxlint) que `plugin.json` não declara — nunca dispara.

---

## Decisões desta adoção

| Item | Valor | Razão |
|---|---|---|
| Marketplace | `GrupoUS/graph-powers` | Remoto, atualizável via `claude plugin update` |
| Escopo | `--scope user` | Pedido explícito; `_config.py` resolve config por repo |
| Config | **migrar para `.graph-powers/config.json`** | Caminho canônico do plugin e pré-requisito para Codex. Ver o alerta abaixo |
| `git.workBranch` | `main` | Único branch do repo; `AGENTS.md` impõe main-only |
| `git.protectedBranches` | `["main"]` | Mantém push exigindo `AULAOTB_ALLOW_PUSH_MAIN=1` |
| `git.optInPrefix` | `AULAOTB` | Prefixo distinto por repo |
| `tooling.testRunner` | `null` | Ausência deliberada — não há test runner |
| Rede de segurança | commit de checkpoint em `main` antes de apagar | Só `main` existe; `docs/prompts/` é untracked e `git clean` o apagaria |
| `docs/prompts/` | reescrever os 5 para `graph-powers` | Decisão sua; a série colável continua existindo, atualizada |
| Outros 4 repos | `git` block mínimo em cada | Evita que caiam nos defaults `dev-test`/`GRAPHPOWERS` com o install global |

> **Alerta sobre a migração da config.** `_config.py::config_path()` devolve o **primeiro** arquivo
> que existir, na ordem `.graph-powers/config.json` → `.claude/config.json`. Manter os dois faz o
> segundo ser ignorado por inteiro — e `protect_files.py` lê `protectedFiles` por esse mesmo
> `load()`. Migrar significa mover o **arquivo inteiro** (inclusive `protectedFiles`, `project`,
> `content`, `lead`, `tracking`, `paths`, `gates`) e apagar o antigo, não duplicar blocos.

---

## Fases

Cada tarefa é atômica e tem verificação própria. Ordem importa: limpar **antes** de instalar não é
possível aqui (precisamos do plugin em disco para fazer `diff`), então instalamos primeiro em modo
inerte e limpamos depois — o inverso do prompt antigo, e correto porque o Step 7 do playbook exige
`diff` contra os arquivos do plugin.

### Fase 0 — Rede de segurança e pré-requisitos

- **T0.1** Registrar baseline: contagens de `agents/skills/commands/hooks` (já medido: 10/11/15/9).
- **T0.2** Backup: `cp -r .claude .claude.bak-<timestamp>`, idem `AGENTS.md`.
- **T0.3** Commit de checkpoint em `main` incluindo `docs/prompts/` (hoje untracked, seria perdido
  por `git clean -fd`). Mensagem: `chore(.claude): checkpoint antes da adoção do graph-powers`.
- **T0.4** Confirmar pré-requisitos: `claude --version` (2.1.235 ✓), `python3 --version`,
  `bun --version` (1.3.14 ✓), `git status --short` limpo após T0.3.
- **Verificação:** `git status --short` vazio; diretório de backup existe.

### Fase 1 — Registrar marketplace e instalar em escopo global

- **T1.1** `claude plugin marketplace add GrupoUS/graph-powers`
  **Risco:** repo privado. Se falhar por auth, rodar `gh auth setup-git` e repetir; fallback é
  clonar em `~/orca/graph-powers` e usar o path local como source.
- **T1.2** `claude plugin marketplace list` → `graph-powers` presente.
- **T1.3** `claude plugin install graph-powers@graph-powers --scope user`.
- **T1.4** `claude plugin list` → escopo `user`, status `enabled`; `claude plugin details graph-powers`
  → inventário e custo de contexto.
- **T1.5** Resolver `$PLUGIN` = `~/.claude/plugins/cache/graph-powers/graph-powers/*/` e registrar o
  caminho exato (o playbook e todas as fases seguintes o usam).
- **Verificação:** `ls $PLUGIN/{agents,skills,commands,hooks,templates,references,schema,bin}` responde.

### Fase 2 — Plugins externos exigidos

- **T2.1** `superpowers` — já instalado em escopo user e `enabled`. Confirmar que
  `Skill("superpowers:using-superpowers")` resolve. Nenhuma ação se resolver.
- **T2.2** `impeccable` — instalar pelo instalador oficial em vez do snapshot vendorizado:
  `npx impeccable install --providers=claude --scope=project`. (Sem `codex` — este repo não usa
  Codex CLI.)
- **T2.3** Registrar os comandos de manutenção no `README.md` ou no changelog:
  `claude plugin update graph-powers` e `npx impeccable update`.
- **Verificação:** ambas as skills resolvem numa sessão nova.

### Fase 3 — Config do projeto (migração para `.graph-powers/config.json`)

- **T3.0** Mover `.claude/config.json` → `.graph-powers/config.json` com `git mv`, **inteiro**,
  preservando todos os blocos existentes (`project`, `content`, `lead`, `tracking`, `paths`,
  `gates`, `protectedFiles`, `rulesDir`, `templatesDir`, `agentsFile`, `claudeMdFile`). Mover também
  `.claude/config.schema.json` → `.graph-powers/config.schema.json`. **Não deixar cópia em
  `.claude/`** — ver o alerta acima.
- **T3.1** Adicionar bloco `git`:
  ```json
  "git": { "workBranch": "main", "protectedBranches": ["main"], "optInPrefix": "AULAOTB" }
  ```
- **T3.2** Adicionar bloco `graphGuardrails` (`maxSpawnsPerSession`, `maxRoundsPerAgent`) — declarar
  explicitamente em vez de herdar default, para ficar visível.
- **T3.3** Adicionar `tooling.commands` com os comandos **exatos** do `package.json` (verificados):
  ```json
  "commands": {
    "typeCheck": "bunx astro check",
    "lint": "bun run lint",
    "format": "bun run lint:fix",
    "build": "bun run build"
  }
  ```
  **Não** declarar `test` — não existe script `test` nem runner. **Não** declarar `bun run typecheck`
  — esse script não existe; o type-check só é alcançável como `bunx astro check`.
- **T3.4** Trocar `"testRunner": ""` por `"testRunner": null`.
- **T3.5** Estender `.graph-powers/config.schema.json` com `git`, `graphGuardrails` e
  `tooling.commands`, e permitir `testRunner: ["string","null"]`. Manter
  `"$schema": "./config.schema.json"` — a URL raw do plugin dá 404 (achado 8) e o schema local
  valida também `content`/`lead`/`tracking`, que o do plugin desconhece.
- **T3.6 — atualizar TODA referência ao caminho antigo.** A migração torna penduradas as menções a
  `.claude/config.json` em: `.claude/CLAUDE.md` (cabeçalho + seção Pointers), `AGENTS.md` (tabelas
  Tier loading, Authority precedence, Where rules live), `.claude/rules/commit.md`
  (`.claude/config.json::protectedFiles`), `.claude/rules/README.md`, `.claude/rules/stability.md`
  (`.claude/config.json::tooling` / `::gates`), `.claude/rules/astro.md` e
  `.claude/agents/verification.md` (`${project.stagingUrl}` from `.claude/config.json`).
  `grep -rn '\.claude/config\.json'` tem de ficar sem resultado ao final.
- **T3.7 — `.vercelignore`.** Adicionar `/.graph-powers` com **barra inicial**. Sem isso o
  diretório sobe no deploy; e sem a barra o padrão casaria qualquer pasta de mesmo nome em qualquer
  nível — foi exatamente o bug do commit `c67f344`.
- **T3.8 — `.gitignore`.** Adicionar `.graph-powers/logs/`, `.graph-powers/installed.json` e
  `AGENT_STOP` (artefatos de máquina e kill switch, conforme Step 9 do playbook).
- **Verificação (obrigatória, mostra a saída):**
  ```bash
  python3 -c "
  import sys; sys.path.insert(0, '$PLUGIN/hooks')
  import _config as gp
  print(gp.config_path()); print(gp.work_branch()); print(gp.opt_in('COMMIT'))"
  ```
  Tem de imprimir `.graph-powers/config.json`, `main`, `AULAOTB_ALLOW_COMMIT`. Se sair `dev-test` /
  `GRAPHPOWERS_ALLOW_COMMIT`, o JSON está inválido (vírgula sobrando faz o loader cair nos defaults
  de propósito) ou o arquivo está no lugar errado. Se `config_path()` ainda apontar para
  `.claude/config.json`, a T3.0 não removeu o antigo.

### Fase 4 — Limpeza do que sombreia o plugin (`.claude/` do projeto)

Cada remoção exige `diff` contra a versão do plugin antes de apagar. Onde o local tiver conteúdo
que o plugin não tem, **não remover** — mostrar o trecho.

- **T4.1 — agents (8 de 10).** Remover: `debugger`, `evaluator`, `explorer-agent`,
  `frontend-specialist`, `librarian`, `performance-optimizer`, `project-planner`,
  `verification-agent`. **Permanecem:** `code-reviewer.md`, `orchestrator.md` (sem equivalente no
  plugin). Atenção: `explorer-agent.md` declara `name: explorer` e `verification-agent.md` declara
  `name: verification` — o shadowing é por `name`, e o plugin nomeia os arquivos `explorer.md` /
  `verification.md`. Confirmar o `name:` dos dois lados antes de apagar.
  **Esta é a única categoria em que apagar é requisito técnico.**
- **T4.2 — skills (6 cobertas de 11).** Remover as que o plugin fornece: `astro`, `debugger`,
  `performance-optimization`, `planning`, `senior-prompt-engineer`, `skill-creator`.
- **T4.3 — skills locais sem cobertura do plugin (5).** `evolution-core`, `gpus-theme`,
  `ui-ux-pro-max`, `xlsx` **também existem em `~/.claude/skills/`** → remover a cópia do projeto e
  ficar com a global (cópia tripla vira única). `impeccable` → remover a cópia vendorizada, já
  substituída pelo instalador oficial na T2.2.
- **T4.4 — commands (12 de 15).** Remover os 12 cobertos (`debug`, `delegate`, `design`, `evolve`,
  `implement`, `perf`, `plan`, `pr-review`, `prime`, `recover`, `research`, `verify`).
  **Decisão pendente de diff:** `_shared.md`, `design-fix.md`, `design-improve.md` não existem no
  plugin. `design-fix`/`design-improve` referenciam `.claude/skills/impeccable/**` e
  `.claude/skills/ui-ux-pro-max/scripts/search.py`, que mudam de lugar nas T2.2/T4.3 — ou se
  corrigem os caminhos, ou os três saem junto com os demais. Decidir com o diff em mãos.
- **T4.5 — hooks (todos os 9 + README).** Nenhum está declarado em `settings.json`; são inertes.
  `task_completed.py` é idêntico ao global (mesmo md5); os outros 8 são versões mais antigas e
  menores das globais. Remover o diretório inteiro.
- **T4.6** Recontar e comparar com o baseline da T0.1.
- **Verificação:** `ls .claude/agents .claude/skills .claude/commands`; nenhum nome deve coincidir
  com `ls $PLUGIN/{agents,skills,commands}`.

### Fase 5 — Deduplicação em escopo global (`~/.claude/`)

Escopo user, fora do repo. Backup de `~/.claude/settings.json` antes de qualquer edição.

- **T5.1** Remover `~/.claude/agents/skill-improver.md` (o plugin fornece `skill-improver`).
- **T5.2** Arquivar as 7 skills globais cobertas pelo plugin — mover
  `~/.claude/skills/{astro,debugger,harness-audit,performance-optimization,planning,senior-prompt-engineer,skill-creator}`
  para `~/.claude/skills-pre-graph-powers/`. Mover, não apagar: reversível numa linha.
  **Permanecem** (sem equivalente no plugin): `evolution-core`, `find-skills`, `gpus-theme`,
  `graphify`, `grupo-us`, `intent-layer`, `ui-ux-pro-max`, `xlsx`.
- **T5.3** Rodar `node "$PLUGIN/bin/audit-settings.mjs"` (não escreve nada) e tratar as 4
  duplicações de hook — `session_context`, `smart_bash_approver`, `ultracite`, `notify`: remover a
  declaração em `~/.claude/settings.json` e ficar com a do plugin. Coerente com o install global:
  o plugin agora vale em todos os repos.
  **Não tocar** em `permissions`, `env`, `statusLine`, `enabledPlugins`, nem nos hooks sem
  equivalente no plugin (`pre_write_guard`, `task_routing_guard`, `subagent_start`, `subagent_stop`,
  `task_completed`, `tool_failure_guard`, `session_baseline`, `memory_compiler_delegate`,
  `agent_routing_hint`, ponte Orca).
- **Verificação:** `python3 -c "import json;json.load(open('/home/mauricio/.claude/settings.json'))"`
  e nova rodada de `audit-settings.mjs` sem duplicações.

### Fase 6 — Camada de instruções e regras

- **T6.1 — `.claude/CLAUDE.md` (129 linhas).** Comparar com `$PLUGIN/templates/CLAUDE.md`.
  Classificar cada seção em OUT (processo genérico, agora do plugin: matriz de comandos, ordem de
  skills, stopping conditions, sequential thinking) / STAYS (identidade, Cardinal rules, matriz de
  roteamento por path, decision authority) / UNCLEAR (perguntar). Alvo < 150 linhas.
  **Preservar as 10 Cardinal rules verbatim** — cada uma existe porque uma violação custou algo.
- **T6.2 — `AGENTS.md` (raiz).** Corrigir as referências que a Fase 4 tornou penduradas: a tabela de
  agents cita `explorer`/`verification-agent` e a de commands cita 15 comandos que saem do escopo
  local. Passar a citar os nomes namespaced do plugin.
- **T6.3 — `.claude/rules/commands.md` (50 linhas).** É inteiramente mapa de comandos/skills/agents
  locais que deixam de existir → classificar como DEAD e remover, ou reescrever apontando para o
  plugin.
- **T6.4 — regras GENÉRICAS.** `frontend.md`, `DESIGN.md`, `stability.md`, `seo.md` se declaram
  "Universal Tier 2 Rules". Comparar com `$PLUGIN/templates/rules/` e, para cada uma, rodar `diff` e
  **mostrar o que a local tem que o template não tem** antes de propor substituição. Linhas escritas
  depois de um incidente migram para o arquivo novo — perdê-las é a falha cara deste passo.
- **T6.5 — regras de DOMÍNIO a criar/manter,** cada uma com evidência real no código:
  - **WhatsApp SSOT** — `src/lib/whatsapp.ts` lança em runtime se a mensagem não começa com
    `"Olá, Laura!"`, e `src/content.config.ts` repete a checagem num `z.refine`. Invariante duplo,
    real.
  - **Carve-out de render** — 8 ocorrências de `export const prerender = false`, todas sob
    `/admin/*` ou `/api/*` (`src/pages/api/inscricao.ts:19`, `src/pages/admin/leads.astro:14`, …).
    Nenhuma página pública. É exatamente o que um gate deve afirmar.
  - **`.vercelignore` com barra inicial** — padrão de pasta de tooling sem `/` casou `src/scripts/` e
    quebrou o deploy (commit `c67f344`). O repo tem **duas** pastas `scripts` (raiz e `src/`).
  - **Gate de PII** — `scripts/check-no-pii-analytics.ts` proíbe nome/e-mail/telefone em analytics,
    com waiver explícito `// pii-gate-allow:`.
  - **Estados honestos do formulário** — `scripts/check-form-states.mjs` exige que "Inscrição
    confirmada" só apareça com `persisted: true` vindo de `/api/inscricao`.
  - **`safety-floor.md`** — criar a partir de `$PLUGIN/references/safety-floor.md`: as mensagens de
    deny do `git_branch_gate` citam `.claude/rules/safety-floor.md §1`, arquivo que hoje não existe.
- **T6.6** Normalizar frontmatter: 6 das 9 regras usam `globs:`, 3 não têm frontmatter nenhum
  (`DESIGN.md`, `README.md`, `seo.md`); o playbook pede `paths:`. Escolher **uma** chave e aplicar
  às nove. Nada em runtime lê nenhuma das duas (verificado: os hooks só leem `git`,
  `graphGuardrails` e `protectedFiles`), então é documentação — mas tem de ser consistente.
- **T6.7** Atualizar `.claude/rules/README.md` com a tabela real: regra, `paths:`, autoridade.
- **Verificação:** `grep -rn '{{' .claude/ CLAUDE.md AGENTS.md` sem resultado; toda referência de
  path citada nos arquivos tocados existe em disco.

### Fase 7 — Autoridades DESIGN / PRODUCT / REVIEW

O plugin traz **especificações**, não documentos prontos.

- **T7.1** `DESIGN.md` (raiz, 21 KB) já existe → ler `$PLUGIN/DESIGN.md` como spec e **melhorar no
  lugar**, preservando decisões verbatim.
- **T7.2** `PRODUCT.md` (raiz, 9,7 KB) já existe → mesmo tratamento contra `$PLUGIN/PRODUCT.md`.
- **T7.3** `REVIEW.md` não existe. Fonte: o checklist de gate manual em `.claude/rules/commit.md`
  (12 passos, incluindo `verify:vercel`, `check:pii`, `check:geometry`, `check:states`) e o histórico
  de `docs/aula-otb-changelog.md`. Lacunas ficam marcadas como
  `Não decidido — <o que resolveria>`, não preenchidas com defaults plausíveis.
- **T7.4** Fazer as regras apontarem para as três autoridades em vez de repetir seu conteúdo.

### Fase 8 — Verificação (Step 10 do playbook, nada opcional)

- **T8.1** `python3 "$PLUGIN/hooks/test_hooks.py"` → exit 0 (13 casos; cobre o isolamento de prefixo
  entre projetos).
- **T8.2** Reexecutar a prova de config da Fase 3 depois de tudo mudado.
- **T8.3** Rodar **cada** comando de `tooling.commands` e reportar o exit code — um gate apontando
  para script inexistente morre como "script not found" e a linha do relatório parece coberta.
- **T8.4** Gate de commit: `git commit --allow-empty -m "guardrail check"` → deve ser **negado**
  citando `AULAOTB_ALLOW_COMMIT`. Se citar `GRAPHPOWERS_ALLOW_COMMIT`, a config não está sendo lida.
- **T8.5** Sombreamento residual: comparar `ls .claude/{agents,skills,commands}` e
  `ls ~/.claude/{agents,skills}` contra o inventário do plugin — nenhum nome coincidente.
- **T8.6** Referências penduradas: para cada arquivo que sobrou em `.claude/`, verificar que os paths
  citados existem.
- **T8.7** Gates do projeto intactos: `bun run lint && bunx astro check && bun run build`.
- **T8.8** Gate de upload da Vercel: `bun run verify:vercel` — `.claude/` já está em `.vercelignore`
  como `/.claude`, mas o gate confirma que nada de `src/`/`public/` foi afetado.
- **T8.9** **Reiniciar a sessão.** Hooks e skills são lidos na inicialização; até lá nada disso está
  ativo. Eu não consigo reiniciar minha própria sessão — este passo é seu.

### Fase 9 — Configs mínimas nos outros 4 repositórios

O install em escopo user alcança `sacha-bio`, `botoxlab`, `otb-usa` e `neondash` (achado 7). Sem
config própria, os quatro caem em `workBranch: dev-test` e prefixo `GRAPHPOWERS` — e uma aprovação
de commit dada num deles passaria a valer nos outros. Esta fase escreve **só** o mínimo; a limpeza
de cada um fica para o seu próprio trabalho.

- **T9.1** Para cada repo, ler os fatos em disco antes de escrever — `git branch -a`,
  `git rev-parse --abbrev-ref HEAD`, `git status --short`. **Não presumir por analogia com
  aula-otb**; `neondash` é monorepo e pode ter branch de trabalho diferente.
- **T9.2** Escrever `.graph-powers/config.json` em cada um com apenas o bloco `git` e
  `project.name`, usando prefixo distinto: `SACHABIO`, `BOTOXLAB`, `OTBUSA`, `NEONDASH`.
- **T9.3** Provar a leitura em cada repo com o one-liner do `_config`, mostrando as 4 saídas.
- **T9.4** Não instalar, não limpar, não commitar nesses repos sem você pedir — só o arquivo de
  config, que é untracked até alguém commitar.
- **Verificação:** os 4 imprimem o próprio branch e o próprio prefixo; nenhum imprime `dev-test`
  ou `GRAPHPOWERS_ALLOW_COMMIT`.

### Fase 10 — Documentação e fechamento

- **T10.1 — reescrever os 5 arquivos de `docs/prompts/`** para o plugin remoto, mantendo o formato
  colável e a numeração:
  - `README.md` — ordem entre projetos e a regra de precedência **corrigida**: agents sofrem
    shadowing, skills e commands são namespaced e coexistem, hooks somam-se e rodam os dois.
  - `00-preparacao.md` — `claude plugin marketplace add GrupoUS/graph-powers`, backup,
    pré-requisitos (`python3`, `bun`, working tree limpo). Remover o `git switch dev-test`: não se
    aplica a repo main-only.
  - `01-limpeza.md` — inventário novo (12 agents / 12 skills / 12 commands) e a deduplicação em
    escopo user, que os prompts antigos não cobriam.
  - `02-config-e-regras.md` — `.graph-powers/config.json`, prefixo por projeto, prova de leitura via
    `_config`, e os templates `templates/rules/` do plugin.
  - `03-instalacao-e-verificacao.md` — install `--scope user`, `test_hooks.py`, `audit-settings.mjs`,
    os 5 checks do Step 10.
  - `04-rollback.md` — `uninstall --scope user`, `marketplace remove graph-powers`, restauração dos
    backups globais.
  Cada arquivo abre com um ponteiro para `AGENT_SETUP.md` como fonte canônica, para a série não
  virar a segunda cópia divergente.
- **T10.2** Entrada em `docs/aula-otb-changelog.md`: decisões, o que saiu, o que ficou, evidência.
- **T10.3** Abrir issue upstream em `GrupoUS/graph-powers` com os defeitos do achado 8 (`$schema`
  apontando para `main` inexistente; ramo `Stop` de `ultracite.py` não declarado).
- **T10.4** Commits atômicos por fase em `main` (exigem `AULAOTB_ALLOW_COMMIT=1` inline após a
  Fase 1). Sem push — só quando você pedir.

---

## Rollback

| Desfazer | Comando |
|---|---|
| Install | `claude plugin uninstall graph-powers --scope user` (o `--scope` tem de ser o mesmo do install) |
| Marketplace | `claude plugin marketplace remove graph-powers` |
| Limpeza do repo | `git revert <sha>` por fase, ou `cp -r .claude.bak-<ts> .claude` |
| Skills globais | `mv ~/.claude/skills-pre-graph-powers/* ~/.claude/skills/` |
| `settings.json` global | restaurar o backup da Fase 5 |
| Parar tudo no meio | `touch AGENT_STOP` na raiz (nega toda chamada de ferramenta); `rm AGENT_STOP` volta |
| Desligar um componente | `claude plugin disable <nome>` |

---

## Escopo que este plano deliberadamente não inclui

- **Codex CLI** (Step 9 do playbook): este repo não usa Codex. Se passar a usar, rodar
  `node "$PLUGIN/bin/graph-powers.mjs" --target codex` e gitignorar os artefatos de máquina.
- **A limpeza dos outros 4 repositórios.** A Fase 9 escreve só o `git` block de cada um, para que
  não caiam nos defaults. Remover os artefatos que sombreiam o plugin em `sacha-bio`, `botoxlab`,
  `otb-usa` e `neondash` é um trabalho por repositório, com o mesmo playbook, e fica para depois.
- **Editar `~/orca/gpus-harness`**: o plugin local fica obsoleto ao adotarmos o remoto. Proponho
  apenas não registrá-lo; remover o diretório é decisão sua e não é necessária.
