# agent-b.md — 2026-11-10

## Feito

- Commit `92f0445` feat(packages): refatora code e chart para estrutura de contrato.
- Push `agent-b/packages` → origin; PR #2 aberto (main).
- Rebase em `origin/agent-a/core` (PR #1) aplicado limpo, sem conflitos.
  - `tests/unit/export.test.ts` veio com 7 testes (era 4); `src/packages/index.ts` sem conflito.
  - Testes totais subiram 39 → 61 (vieram importDeck, store, pkgHost do core do Agent A).
- `npm run typecheck`, `npm run lint`, `npm run test` (61 testes) e `npm run build` verdes após o rebase.
- `pkgHost.test.ts` (Agent A) já testa `PKG_HOST_SRC`: runtime serializado como `{ $fn }`, play/final, pacotes sem runtime não quebram.

## Pacotes (contrato seção 7)

- `src/packages/code/`: CodePackage.ts, CodeRenderer.tsx, CodeRuntime.ts, formSchema.ts, code.css.ts, index.ts, Code.stories.tsx
- `src/packages/chart/`: ChartPackage.ts, ChartRenderer.tsx, ChartRuntime.ts, formSchema.ts, chart.css.ts, index.ts, Chart.stories.tsx
- Removidos CodePackage.tsx / ChartPackage.tsx monolíticos.
- Paridade com o monolito confirmada: presets completos (3 code, 4 chart), duration, linhas destacadas (hl/pk-hl), CSS prefixado (.pk-code/.pk-chart), count-up. `adopt` não existia nos originais (opcional).

## FormGenerator

- Única implementação: `src/components/Inspector/forms/FormGenerator.tsx` (referência apenas em comentário de App.tsx).
- Agent C não deve manter cópia; integrar este componente no Inspector.

## Bloqueios / Dependências

- Glob do Storybook (`.storybook/main.ts`) aponta para `../stories/`; stories dos pacotes estão em `src/packages/<nome>/<Nome>.stories.tsx`. Precisa do Agent C incluir esse caminho no glob.
- `vitest.config.ts` coverage.include usa `src/packages/*/Runtime.ts` (nome literal); contrato nomeia `<Nome>Runtime.ts` (ex.: `CodeRuntime.ts`). Cobertura dos runtimes não reportada automaticamente. Ajuste de config é do Agent A.

## Decisões Tomadas

- CodeSpec/ChartSpec estendem PackageSpec (índice [key: string]: unknown).
- PackageDef.render usa createElement (arquivos .ts sem JSX).
- packages/index.ts protegido: apenas caminhos de importação atualizados.

## PR #2 — Checks

- typecheck ✅ | lint ✅ | test ✅ (61) | build ✅ | .sync/agent-b.md ✅
