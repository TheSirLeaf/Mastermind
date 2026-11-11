# BOARD — Coordenação de Agentes (Mastermind)

**Atualizado:** 2026-11-11  
**Agente atual:** Agent B (Packages)  
**Branch:** `agent-b/packages` (worktree: `.work/worktrees/agent-b`)

---

## Status do Merge PR #10

- PR #10 (agent-a/chart-layout) **mergeado** em `main` via `gh pr merge 10 --merge --auto`.
- Checks verdes: `quality` (SUCCESS), `e2e` (SUCCESS). Merge state: CLEAN.
- Commit de merge: `29d492b` (fast-forward via `git pull`).
- Arquivos alterados pelo #10: `src/packages/chart/ChartRenderer.tsx` (offset do donut), `tests/unit/chart.test.ts`, `tests/unit/export.test.ts`.
- Branch `agent-a/chart-layout` **não deletada** (bloqueada por worktree do agent-a).
- Local `main` está à frente de `origin/main` por 1 commit (`d78ee45` — fix(slide): desabilita hover nos itens do slide, domínio Editor UI / Agent C, feito por B a pedido).

---

## Itens B-1 a B-6 (Packages)

| ID | Item | Status |
|----|------|--------|
| B-1 | Manter pacotes `code` e `chart` em `src/packages/` (Renderer, Runtime, formSchema, css, Package, index) | ✅ Conforme contrato |
| B-2 | Manter `FormGenerator.tsx` em `src/components/Inspector/forms/` | ✅ Conforme contrato |
| B-3 | Escrever e manter testes de unidade em `tests/unit/` (ex: `code-chart-renderer.test.tsx`, `form-generator.test.tsx`) | ⚠️ `formGenerator.test.tsx` existe; `chart.test.ts` atualizado pelo PR #10; faltam testes dedicados do renderer |
| B-4 | Rebase/verificar correção local do gap das barras (`rows.length + 1`) após merge do #10 | 🔴 Pendente — PR #10 contesta a mudança; fórmula atual (`rows.length`) está na main |
| B-5 | Proteger `main` — nunca commit direto, sempre via PR com checks verdes | ✅ Seguido |
| B-6 | Atualizar BOARD.md para coordenação entre agentes | ✅ Este arquivo |

---

## Análise de UI — Erros e Possíveis Erros

Encontrados durante leitura dos componentes de UI (domínio Editor UI / Agent C, reportado por B para ciência):

### Erros confirmados (via leitura de código + teste web Playwright)

1. **Toast.tsx:33-39 — Botão X de fechar não funciona**
   - `onClick` vazio, comentário "dismiss handled by parent", mas `Layout.tsx:54` renderiza `<Toast />` sem handler de dismiss.
   - Testado: o clique no X não gera erro mas não fecha o toast.
   - Impacto: o toast não pode ser fechado pelo usuário.

2. **WelcomeModal.tsx:52-55 — "Não mostrar novamente" não persiste**
   - `onChange` do checkbox está vazio. A preferência nunca é salva.
   - Impacto: o modal reaparece sempre.

3. **PackageManagerModal.tsx:306,330 — Botões "Add code" / "Add chart" são no-ops**
   - Apenas `console.log('Add code')` / `console.log('Add chart')`. Não instalam pacotes built-in.
   - Testado: cliques não geram erro de console, mas não fazem nada.
   - Impacto: feature incompleta no Package Manager.

4. **WelcomeModal.tsx:11-14 — Modal de boas-vindas bloqueia a UI no carregamento inicial**
   - `isWelcomeOpen` inicia como `true` e o modal tem `z-[200]` cobrindo toda a tela.
   - Testado: cliques em botões do Header são interceptados pelo overlay até fechar o WelcomeModal.
   - Impacto: usuário não pode usar o editor antes de fechar o modal.

### Possíveis erros

4. **SlideList.tsx:37-41 — Drag end fora da lista move slide para índice -1**
   - Quando `over` é undefined (soltar fora da lista), `active.id !== over?.id` é true, `findIndex(s => s.id === undefined)` retorna -1, e `moveSlide(oldIndex, -1)` é chamado.
   - Impacto: slide pode ser movido para posição inválida.

5. **AnimationTab.tsx:108-119 — `copyToSiblings` usa índices de `parent.children` que podem não corresponder ao `path`**
   - O `path` navega elementos dentro da `<section>`; `parent.children` inclui todos os filhos (texto, etc.). Se houver nós entre elementos alvo, o índice está errado.
   - Impacto: patch aplicado ao elemento irmão errado.

6. **FormGenerator.tsx:299 — `ListItemInput` usa `key={index}`**
   - Anti-pattern do React quando itens podem ser adicionados/removidos/reordenados.
   - Impacto: bugs de estado e foco em listas dinâmicas.

7. **FormGenerator.tsx:369 — `FormGroupSection` usa `key={group.group}`**
   - Se dois grupos tiverem o mesmo nome, causa warning do React e problemas de reconciliação.
   - Impacto: render incorreta quando nomes de grupo duplicam.

8. **StyleTab.tsx:189-198 — `toHex` não suporta hex de 3 dígitos (`#fff`) nem nomes CSS (`red`)**
   - Retorna `null` para cores válidas que não sejam `#rrggbb` ou `rgba()`.
   - Impacto: cor do elemento pode não ser aplicada no Style Tab.

9. **elementSelection.ts:23,47 — Assume `body.firstElementChild` é a `<section>` do slide**
   - Se houver elementos antes da section no body do slide, a navegação pelo `path` quebra.
   - Impacto: seleção/edição de elemento aponta para nó errado.

10. **ChartRenderer.tsx:171 — Fórmula do gap das barras verticais**
    - `gap = (W - pad*2 - rows.length * barWidth) / Math.max(1, rows.length)`. PR #10 contesta a mudança local para `rows.length + 1`, afirmando que a fórmula atual está correta. Após o merge do #10, a fórmula atual está na `main`.
    - Impacto: se Agent B aplicar `rows.length + 1` localmente, haverá conflito de rebase com `main`.

### Recomendações

- Corrigir itens 1-3 (erros confirmados) — são de baixo risco e alto impacto na UX.
- Revisar itens 4-9 antes de qualquer trabalho de UI no domínio Packages.
- Para B-4: verificar se a correção local do gap ainda é necessária após o merge do #10; se sim, rebase contra `main` e ajustar teste `tests/unit/chart.test.ts` ("mantém margens iguais nas barras verticais").

---

## Proteção da `main`

- `main` é protegida (require 1 review, status checks pass).
- Nunca commitar diretamente na `main`.
- Todo trabalho deve ser via branch `agent-b/<tarefa>` → PR → squash merge → delete branch.
- Após merge do #10, o branch `agent-a/chart-layout` permanece local (bloqueado por worktree). Não afeta `main`.
