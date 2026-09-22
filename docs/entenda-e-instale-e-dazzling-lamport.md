# Executar o AGENT_SETUP.md do graph-powers 1.3.1 neste repositório

## Contexto

O plugin `graph-powers` já foi adotado neste projeto na versão 1.3.0 (commits `55d0668`, `6ff8bda`,
`e699ac8`, `41afd80`): a config existe, as cópias locais que sombreavam o plugin foram removidas, e
as três autoridades (`DESIGN.md`, `PRODUCT.md`, `REVIEW.md`) já estão escritas. O `/plugin` desta
sessão atualizou o plugin para **1.3.1**.

Duas coisas motivam este trabalho:

1. **O playbook 1.3.1 acrescentou verificações que este repositório nunca passou** — resolução de
   binário para cada comando declarado em `tooling.commands`, e resolução dos agentes pelo nome que
   o registry usa. A primeira já está falhando em toda sessão.
2. **O usuário pediu para acabar com o excesso de pedido de aprovação de comando Bash.** A causa
   está medida, não suposta: `autonomy.level` é `"guarded"`, o que faz `bashDefault: "ask"`. Testei
   `hooks/smart_bash_approver.py` com payloads reais — `sed -n '1,5p' x.md`, `node bin/x.mjs` e
   `claude plugin list` retornam `permissionDecision: "ask"` mesmo com as 124 regras `allow` que já
   existem em `~/.claude/settings.json`, porque um hook `PreToolUse` decide antes da allowlist.

Resultado esperado: a sessão para de pedir aprovação para comando reversível, o gate de commit/push
continua exigindo o opt-in `AULAOTB_*` (invariante 9 do `.claude/CLAUDE.md`), o Codex passa a ter a
metade-projeto que nunca foi escrita, e o tag de início de sessão para de mentir sobre uma ferramenta
ausente.

---

## Estado levantado (Step 0 do playbook, já executado)

| Item | Estado |
|---|---|
| Plugin Claude Code | `graph-powers@graph-powers` **1.3.1**, escopo `user` — global, correto |
| superpowers | 6.3.0, escopo `user` — presente |
| impeccable | presente em `~/.claude/skills/impeccable` |
| Codex CLI | 0.147.0 · global instalado em **1.3.0**; clone do marketplace já em 1.3.1 |
| `.graph-powers/config.json` | lido corretamente: `main`, `AULAOTB_ALLOW_COMMIT` |
| `.claude/CLAUDE.md` / `AGENTS.md` | 91 / 77 linhas — dentro do alvo de 150 |
| `.claude/rules/` | 9 regras + README com tabela real |
| Autoridades | `DESIGN.md` 432 · `PRODUCT.md` 204 · `REVIEW.md` 89 |
| `audit-settings.mjs` | 12 hooks do plugin · 0 do projeto · **nenhum duplicado** |
| Placeholders `{{` | nenhum |
| `.gitignore` | `.graph-powers/logs/`, `.graph-powers/installed.json`, `AGENT_STOP` já cobertos |
| Sombreamento local | `.claude/agents/` só tem `code-reviewer.md` e `orchestrator.md` — nenhum colide com nome do plugin |

Steps 1, 2, 4, 6, 7 e 8 do playbook **já estão satisfeitos** e não geram escrita. O trabalho abaixo é
o que falta.

---

## O que muda

### 1. `autonomy` em `.graph-powers/config.json` — o item que o usuário pediu

Substituir o bloco atual (`"level": "guarded"`, `allowPackageManagers: []`) por:

```json
"autonomy": {
  "level": "autonomous",
  "destructiveFloor": true,
  "git": { "commit": "ask", "push": "ask", "protectedBranch": "ask" },
  "allowPackageManagers": ["bun"]
}
```

Por que cada campo:

- `level: autonomous` → `bashDefault: allow` e `cleanup: allow`. É o que mata o flood.
- `git.*: ask` → os três gates continuam exigindo `AULAOTB_ALLOW_COMMIT=1` / `AULAOTB_ALLOW_PUSH_MAIN=1`
  inline. Sem isso, `autonomous` liberaria commit e push sem chave, o que contraria `AGENTS.md`
  ("Deploy/push só quando pedido") e a invariante 9.
- `destructiveFloor: true` → o piso que recusa `rm -rf /`, `mkfs`, `dd` em device, `DROP DATABASE`,
  `git reset --hard`, `git clean -f`, force-push em branch protegida continua ativo.
- `allowPackageManagers: ["bun"]` → hoje o array vazio significa "todos". Com `["bun"]`, o approver
  **bloqueia** `npm`/`yarn`/`pnpm`, que é a invariante "Bun only" do `AGENTS.md` passando a ser
  executável em vez de escrita.

### 2. `tooling.commands.typeCheck` — o aviso falso a cada sessão

O tag de início imprime hoje:

```
[AULA-OTB] Bun | branch:main | gates: lint+build | NOT INSTALLED: typeCheck needs `astro` — install globally or these never run
```

`_config.missing_tool()` procura `astro` no `PATH`; o binário existe apenas em `node_modules/.bin/astro`,
que `bunx` resolve mas `shutil.which` não vê. O gate roda verde — o aviso é falso positivo.

Trocar em `.graph-powers/config.json`:

```diff
-    "typeCheck": "bunx astro check",
+    "typeCheck": "./node_modules/.bin/astro check",
```

`missing_tool` aceita caminho com separador que exista em disco, então o aviso desaparece sem
inventar script novo no `package.json` (arquivo protegido, e `AGENTS.md` documenta de propósito que
não existe script `typecheck`). A prosa de `AGENTS.md` e `.claude/CLAUDE.md` continua citando
`bunx astro check` como o gate humano — acrescento uma linha curta em `AGENTS.md § Gates` explicando
por que a config declara a forma com caminho.

### 3. Permissões do harness em `~/.claude/settings.json`

```bash
node "$PLUGIN/bin/graph-powers.mjs" --target claude --scope user
```

Escrita **aditiva** (o instalador nunca remove regra existente). O global já tem 124 regras, muitas na
forma antiga `Bash(git status *)`; o instalador acrescenta a forma `:*` que o Claude Code usa hoje e
os gerenciadores que faltam. Rodo primeiro com `--dry-run` e mostro quantas regras entrariam.

### 4. Codex — atualizar o global e escrever a metade-projeto

```bash
node "$PLUGIN/bin/graph-powers.mjs" --target codex --scope user
```

O `--dry-run` já rodado mostra o alcance exato: **51 caminhos globais** (`~/.agents/skills/`,
`~/.codex/agents/*.toml`, `~/.codex/graph-powers/`, `~/.codex/AGENTS.md`, `hooks.json` **mesclado**,
nunca sobrescrito) e **3 caminhos de projeto** (`.codex/rules/`, bloco delimitado em `AGENTS.md`,
`.graph-powers/installed.json` — este último já está no `.gitignore`).

Depois disso, `.codex/rules/` chega como **template com 20 placeholders `{{}}`** em 283 linhas, e o
playbook é explícito: `{{}}` sobrevivente é defeito. Aqui a resposta correta não é preencher os cinco
arquivos — este repositório já tem a autoridade de cada assunto, e duplicar cria o problema que o
Step 6 nomeia ("duas autoridades sobre o mesmo assunto é pior que nenhuma"):

| Template que chega | Assunto já pertence a | Ação proposta |
|---|---|---|
| `design.md` | root `DESIGN.md` + `.claude/rules/DESIGN.md` | remover, apontar |
| `ux.md` | root `PRODUCT.md` | remover, apontar |
| `stability.md` | `.claude/rules/stability.md` | remover, apontar |
| `execution.md` | `.claude/rules/commit.md` + `.graph-powers/config.json` | remover, apontar |
| `README.md` | — | **fica**, adaptado: índice curto que aponta para `.claude/rules/` e para as três autoridades |

Ou seja: `.codex/rules/README.md` vira a única página local do Codex, com os placeholders resolvidos
a partir da config (`aula-otb`, `main`, `AULAOTB`, comandos de gate reais), e os outros quatro saem
com o diff na tela antes da remoção.

Depois da escrita, dois avisos que o instalador não faz sozinho:
- **abrir `/hooks` no Codex e aprovar** — até lá os guardrails do Codex não rodam;
- `.codex/rules/` e o bloco em `AGENTS.md` **devem ser commitados** (são do projeto).

### 5. Agentes locais — referências quebradas

**`.claude/agents/code-reviewer.md`** (54 linhas) cita quatro regras que não existem:
`content.md`, `config.md`, `a11y.md`, `hooks.md`. As reais são `astro.md`, `DESIGN.md`, `frontend.md`,
`seo.md`, `lead-e-pii.md`, `commit.md`, `deploy-vercel.md`, `stability.md`, `mcp.md`. Remapear as
citações nas linhas 19, 28, 31 e 33 — referência pendurada é silenciosa: o agente lê, não acha nada e
segue com menos contexto do que pensa ter.

**`.claude/agents/orchestrator.md`** (573 linhas) declara no frontmatter
`skills: [senior-prompt-engineer, planning, evolution-core]`. As duas primeiras hoje só existem
namespaced (`graph-powers:senior-prompt-engineer`, `graph-powers:planning`); `evolution-core` é skill
global de usuário e resolve. Prefixar as duas.

**Avaliação de aposentadoria do `orchestrator.md`:** faço o diff funcional contra o que o plugin já
entrega (`/delegate`, `Skill("graph-powers:agent-orchestration")`, `graph-powers:project-planner`) e
trago a recomendação com evidência **antes** de qualquer remoção. Não removo nada nesta rodada sem
sua aprovação explícita.

---

## Verificação (Step 10, com saída na tela)

```bash
export PLUGIN=/home/mauricio/.claude/plugins/cache/graph-powers/graph-powers/1.3.1

# 1. nenhum placeholder sobreviveu
grep -rn '{{' .claude/ .codex/ AGENTS.md 2>/dev/null || echo "no pending placeholders"

# 2. os guardrails passam
python3 "$PLUGIN/hooks/test_hooks.py"          # esperado: exit 0

# 3. a config lida é a deste projeto
python3 -c "
import sys; sys.path.insert(0, '$PLUGIN/hooks')
import _config as gp
print(gp.config_path(), gp.work_branch(), gp.opt_in('COMMIT'))
print(gp.autonomy())
"

# 4. todo gate declarado resolve o binário
python3 -c "
import sys; sys.path.insert(0, '$PLUGIN/hooks')
import _config as gp
cmds = (gp.load().get('tooling') or {}).get('commands') or {}
for k, c in cmds.items():
    m = gp.missing_tool(str(c)); print(f'{k:12} {c!r:40} ' + (f'MISSING: {m}' if m else 'ok'))
"

# 5. os gates rodam de verdade
bun run lint && ./node_modules/.bin/astro check && bun run build

# 6. commit sem chave é negado
git commit --allow-empty -m "guardrail check"   # esperado: negado, citando AULAOTB_ALLOW_COMMIT

# 7. o approver deixa passar o que antes perguntava
echo '{"tool_name":"Bash","tool_input":{"command":"sed -n \"1,5p\" AGENTS.md"}}' \
  | python3 "$PLUGIN/hooks/smart_bash_approver.py"     # esperado: allow

# 8. npm continua bloqueado (invariante Bun only, agora executável)
echo '{"tool_name":"Bash","tool_input":{"command":"npm install lodash"}}' \
  | python3 "$PLUGIN/hooks/smart_bash_approver.py"     # esperado: deny
```

Depois, **reiniciar a sessão** (hooks e skills são lidos no startup) e, na sessão nova:

- conferir o tag de início — deve sair sem `NOT INSTALLED`;
- `Agent({ subagent_type: "graph-powers:explorer", prompt: "list the files in agents/" })` para
  provar que os agentes resolvem pelo nome namespaced;
- `/plan` numa tarefa L4+ deve alcançar `graph-powers:ultra-plan`.

---

## Arquivos tocados

| Arquivo | O que muda |
|---|---|
| `.graph-powers/config.json` | bloco `autonomy` + `tooling.commands.typeCheck` |
| `AGENTS.md` | bloco delimitado do Codex (escrito pelo instalador) + uma linha em `§ Gates` sobre a forma do `typeCheck` |
| `.codex/rules/README.md` | criado pelo instalador, adaptado por mim (placeholders resolvidos) |
| `.codex/rules/{design,ux,stability,execution}.md` | criados pelo instalador, removidos com diff na tela |
| `.claude/agents/code-reviewer.md` | 4 referências de regra remapeadas |
| `.claude/agents/orchestrator.md` | 2 skills do frontmatter namespaced |
| `~/.claude/settings.json` | regras `allow` acrescentadas (aditivo) |
| `~/.codex/**`, `~/.agents/skills/**` | atualizados de 1.3.0 para 1.3.1 pelo instalador |

## Backup e rollback

Antes da primeira escrita:

```bash
cp -r .claude ".claude.bak-$(date +%Y%m%d-%H%M%S)"
cp AGENTS.md "AGENTS.md.bak-$(date +%Y%m%d-%H%M%S)"
cp .graph-powers/config.json .graph-powers/config.json.bak
cp ~/.claude/settings.json ~/.claude/settings.json.bak
```

`.claude.bak-*` já está no `.gitignore`. Rollback de tudo que é do repositório: `git checkout --`
nos arquivos rastreados e `rm -rf .codex` para o que é novo. Rollback do global: o instalador grava
`~/.codex/graph-powers-installed.json` com a lista exata do que escreveu.

## Fora de escopo

- **Commit e push.** O playbook termina com "Do not commit anything" e o `AGENTS.md` deste
  repositório exige pedido explícito por commit. As mudanças ficam na árvore de trabalho.
- **Desinstalar as cópias `local` obsoletas de graph-powers 1.3.0/1.2.0** presas a `projectPath` em
  `/tmp/tmp.*` que não existem mais. São inertes para este repositório; reporto e deixo a decisão.
- **Limpar `.claude/settings.local.json`**, que acumulou entradas avulsas (`Bash(cd *)`,
  `Bash(git --no-pager log --oneline -3)`) exatamente por causa do flood. Depois do item 1 elas param
  de crescer; a poda é cosmética e fica para uma rodada separada se você quiser.
- **Trocar o texto de invariante em `.claude/CLAUDE.md`.** As dez ficam verbatim.

## Ordem de execução e aprovação

Cada escrita para e espera aprovação, como o playbook manda. A ordem importa em um ponto: o
instalador do Codex escreve `.codex/rules/` antes de eu poder adaptá-lo, então o passo 4 são duas
aprovações — uma para rodar o instalador, outra para o diff do que eu proponho remover e adaptar.

1. Backup (mostro o comando rodado)
2. `.graph-powers/config.json` — `autonomy` + `typeCheck`
3. `--target claude --scope user` (dry-run primeiro, depois real)
4. `--target codex --scope user` → adaptação de `.codex/rules/`
5. `AGENTS.md § Gates` — uma linha
6. `code-reviewer.md` + `orchestrator.md`
7. Diff de avaliação do `orchestrator.md` (sem remover)
8. Verificação completa com saída
9. Relatório no formato do Step 11, e parar
