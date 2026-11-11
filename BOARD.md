# BOARD.md — Inter-agent coordination (Mastermind Packages domain)

## Owner
- Agent B owns the Packages domain (`src/packages/code`, `src/packages/chart`)

## Contract section references
- Seção 7: Pacotes (code, chart)
- Seção 8: FormGenerator (formulários dinâmicos)

## PRs mergeados

- PR #1 (agent-a/core) — MERGED
- PR #2 (agent-b/packages) — MERGED (base)
- PR #6 (agent-a/content-guard) — MERGED: evita achatar containers ao editar texto no ContentTab (textarea só em elementos folha)
- PR #7 (agent-d/qa-patch-pr2) — MERGED: runtimes autossuficientes + campo code multilinha no FormGenerator

## Itens

### B-1: Refatorar code package (CodePackage.tsx → CodeRenderer + CodeRuntime + formSchema + CodePackage)
- Status: ✅ Concluído
- Arquivos: `src/packages/code/CodeRenderer.tsx`, `CodeRuntime.ts`, `code.css.ts`, `formSchema.ts`, `CodePackage.ts`, `index.ts`
- Removido: `src/packages/code/CodePackage.tsx`
- Nota: PR #7 alterou `runtime` para referência direta (`codeRuntime`) no `CodePackage.ts`

### B-2: Refatorar chart package (ChartPackage.tsx → ChartRenderer + ChartRuntime + formSchema + ChartPackage)
- Status: ✅ Concluído
- Arquivos: `src/packages/chart/ChartRenderer.tsx`, `ChartRuntime.ts`, `chart.css.ts`, `formSchema.ts`, `ChartPackage.ts`, `index.ts`
- Removido: `src/packages/chart/ChartPackage.tsx`
- Nota: PR #7 alterou `runtime` para referência direta (`chartRuntime`) no `ChartPackage.ts`

### B-3: Testes de renderer (CodeRenderer + ChartRenderer) + data-testid
- Status: ✅ Concluído
- Arquivo: `tests/unit/code-chart-renderer.test.tsx` (16 testes)
- data-testid adicionado em: `CodeRenderer.tsx` (pk-code-container, pk-titlebar, pk-note, pk-code-line-N) e `ChartRenderer.tsx` (pk-chart-container, pk-donut, pk-line, pk-bar-N, pk-value-N, pk-hl-N)
- Validação: typecheck ✅ | lint ✅ | test ✅ | build ✅

### B-4: Teste de integração do FormGenerator
- Status: ✅ Concluído
- Arquivo: `tests/unit/form-generator.test.tsx` (8 testes)
- Cobertura: renderização de campos, valores iniciais do spec, onChange em texto/select, showIf condicional, adicionar item à lista, alterar valor dentro de item da lista
- Nota: PR #7 adicionou `formGenerator.test.tsx` separado (campo `code` como textarea monoespaçada com Tab → 4 espaços) e alterou `FormGenerator.tsx` para renderizar `code` como textarea. Agent B precisa rebasear em main e garantir que seu `form-generator.test.tsx` ainda passa com a nova implementação.

### B-5: Rebase agent-b em main (após PRs #6 e #7)
- Status: ⏳ Pendente
- Motivo: PR #7 tocou em `CodePackage.ts`, `ChartPackage.ts` e `FormGenerator.tsx` (arquivos do domínio do agent B). O worktree local tem mudanças não commitadas (ChartRenderer.tsx, CodeRenderer.tsx com data-testid; BOARD.md e testes novos não rastreados).
- Ação: commit das mudanças locais + rebase em origin/main + verificar typecheck/lint/test/build

## Bloqueios / Dependências
- Storybook glob (`.storybook/main.ts`) aponta para `../stories/`; stories dos pacotes estão em `src/packages/<nome>/<Nome>.stories.tsx`. Precisa do Agent C incluir esse caminho no glob.
- `vitest.config.ts` coverage.include usa `src/packages/*/Runtime.ts` (nome literal); contrato nomeia `<Nome>Runtime.ts`. Ajuste de config é do Agent A.

## Tarefas sugeridas

### Agent B (próxima)
- Commitar mudanças locais (ChartRenderer.tsx, CodeRenderer.tsx, BOARD.md, testes)
- Rebase em origin/main (PRs #6 e #7 já mergeados)
- Verificar se `form-generator.test.tsx` ainda passa com o `code` como textarea do PR #7
- Revalidar typecheck/lint/test/build

### Agent C (próxima)
- Substituir shell `App.tsx` por UI definitiva (3 painéis: sidebar, inspector, stage)
- Conectar Inspector ao `useDeckStore` + `IframeBridge` + `PackageRegistry`
- Incluir stories dos pacotes no glob do Storybook (`.storybook/main.ts`)
- Revisar PR #6 (ContentTab) — já mergeado, verificar se não há regressões na UI
