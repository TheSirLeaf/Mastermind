# BOARD — Coordenação de Agentes (Mastermind)

**Atualizado:** 2026-11-11  
**Agente atual:** Agent B (Packages)  
**Branch principal:** `main` (sincronizada com origin/main)

---

## Status dos PRs (todos via GitHub)

Todos os PRs #1 a #16 estão **MERGED** em `main`:

| PR  | Branch                 | Título                                                             | Status |
| --- | ---------------------- | ------------------------------------------------------------------ | ------ |
| #1  | agent-a/core           | feat(core): importação de decks, export/PDF e correção de edição   | MERGED |
| #2  | agent-b/packages       | feat(packages): pacotes code e chart + FormGenerator               | MERGED |
| #3  | agent-a/sim-v2         | feat(packages): sim v2 com toasts do Windows e cursor animado      | MERGED |
| #4  | agent-c/editor-ui      | feat(editor): UI do editor com inspector e aba de animação         | MERGED |
| #5  | agent-a/qa-animation   | fix(core): congela animação legada e alinha o atraso               | MERGED |
| #6  | agent-a/content-guard  | fix(editor): evita achatar containers ao editar texto              | MERGED |
| #7  | agent-d/qa-patch-pr2   | fix(packages): runtimes autossuficientes e campo code multilinha   | MERGED |
| #8  | agent-a/style-units    | fix(editor): preserva unidades CSS no StyleTab                     | MERGED |
| #9  | agent-a/stage-visual   | fix(editor): ativa slide inicial e expande controles do inspector  | MERGED |
| #10 | agent-a/chart-layout   | fix(chart): corrige offset dos segmentos do donut                  | MERGED |
| #11 | agent-a/inspector-type | fix: remove hover tracejado e adiciona controles de tipografia     | MERGED |
| #12 | agent-a/header-bar     | fix(layout): cabeçalho em barra única                              | MERGED |
| #13 | agent-b/ui-fixes       | fix(ui): corrige toast dismiss, welcome modal e package manager    | MERGED |
| #14 | agent-b/theme-payday   | feat(ui): aplica tema Payday (preto/cinza escuro, branco, dourado) | MERGED |
| #15 | agent-a/inspector-tabs | fix(inspector): abas com hover e inserção de itens de pacote       | MERGED |
| #16 | agent-a/editor-actions | fix(editor): liga inserção, export, abrir/novo e visualização      | MERGED |

### PR aberto (aguardando review/merge)

| PR  | Branch                  | Título                                                             | Status |
| --- | ----------------------- | ------------------------------------------------------------------ | ------ |
| #17 | agent-b/code-block-edit | feat(code): adiciona 5 campos únicos editáveis ao pacote de código | ABERTO |

---

## Itens B-1 a B-6 (Packages)

| ID  | Item                                                                                                    | Status                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| B-1 | Manter pacotes `code` e `chart` em `src/packages/` (Renderer, Runtime, formSchema, css, Package, index) | ✅ Conforme contrato                                                                                |
| B-2 | Manter `FormGenerator.tsx` em `src/components/Inspector/forms/`                                         | ✅ Conforme contrato                                                                                |
| B-3 | Escrever e manter testes de unidade em `tests/unit/`                                                    | ✅ `code.test.ts` (14 testes), `chart.test.ts`, `form-generator.test.tsx`, `formGenerator.test.tsx` |
| B-4 | Teste de integração do FormGenerator                                                                    | ✅ Concluído — `tests/unit/form-generator.test.tsx` (8 testes)                                      |
| B-5 | Rebase agent-b em main                                                                                  | ✅ Concluído — rebase sem conflitos, validação verde                                                |
| B-6 | Corrigir mal posicionamento do chart (barras + donut)                                                   | ✅ Concluído — gap dividido por `rows.length + 1`, donut inicia do topo (12h)                       |

---

## Worktrees e branches

| Worktree                  | Branch                    | Último commit | Sincronizado com remoto | PR           |
| ------------------------- | ------------------------- | ------------- | ----------------------- | ------------ |
| raiz (main)               | `main`                    | 9de3609       | ✅                      | —            |
| `.work/worktrees/agent-a` | `agent-a/inspector-tabs`  | 29155c9       | ✅                      | #15 (MERGED) |
| `.work/worktrees/agent-b` | `agent-b/code-block-edit` | dd3ddf1       | ✅                      | #17 (ABERTO) |
| `.work/worktrees/agent-c` | `agent-c/editor-ui`       | 10782ec       | ✅                      | #4 (MERGED)  |
| `.work/worktrees/agent-d` | `agent-d/qa-patch-pr2`    | 65f1f51       | ✅                      | #7 (MERGED)  |

---

## Proteção da `main`

- `main` é protegida (require 1 review, status checks pass).
- Nunca commitar diretamente na `main`.
- Todo trabalho deve ser via branch `agent-b/<tarefa>` → PR → squash merge → delete branch.
