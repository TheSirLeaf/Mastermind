# agent-b.md — 2026-11-10

## Feito

- Refatorou `code` pacote para a estrutura do contrato (seção 7 do AGENTS_CONTRACT.md):
  `CodePackage.ts`, `CodeRenderer.tsx`, `CodeRuntime.ts`, `formSchema.ts`, `code.css.ts`, `index.ts`, `Code.stories.tsx`.
- Refatorou `chart` pacote para a mesma estrutura:
  `ChartPackage.ts`, `ChartRenderer.tsx`, `ChartRuntime.ts`, `formSchema.ts`, `chart.css.ts`, `index.ts`, `Chart.stories.tsx`.
- Removeu os arquivos monolíticos `CodePackage.tsx` e `ChartPackage.tsx`.
- Atualizou `src/packages/index.ts` (mantém exports `CodePackage`, `ChartPackage`, `registerBuiltins`).
- Criou `FormGenerator` em `src/components/Inspector/forms/FormGenerator.tsx` (JSON Schema → React Hook Form + Zod; tipos text/textarea/code/number/range/color/select/toggle/seg/check/list/row/info/buttons; showIf condicional).
- Testes unit: `tests/unit/code.test.ts` (5) e `tests/unit/chart.test.ts` (4) cobrindo runtime (play/final/null-casos/reduced/alive/countUp).
- `npm run typecheck`, `npm run lint`, `npm run test` (39 testes) e `npm run build` passam.

## Em Andamento

- (nada)

## Próximo (Próximas 2-3 sessões)

- Aguardar integração do FormGenerator no Inspector pelo Agent C.
- Avaliar pacotes futuros (tabela, imagem, etc.) se solicitado.
- Ajustar stories se o Agent C mover o glob do Storybook para `src/packages/**`.

## Bloqueios / Dependências

- O glob do Storybook (`.storybook/main.ts`) aponta para `../stories/`; as stories dos pacotes ficam em `src/packages/<nome>/<Nome>.stories.tsx` conforme o contrato (seção 7). Precisa do Agent C incluir esse caminho no glob para aparecer no Storybook.
- O `vitest.config.ts` coverage.include usa `src/packages/*/Runtime.ts` (nome literal), enquanto o contrato nomeia o arquivo `<Nome>Runtime.ts` (ex.: `CodeRuntime.ts`); cobertura dos runtimes não é reportada automaticamente. Ajuste de config é responsabilidade do Agent A (build/CI).

## Decisões Tomadas

- `CodeSpec`/`ChartSpec` estendem `PackageSpec` para satisfazer o índice `[key: string]: unknown`.
- `PackageDef.render` usa `React.createElement(CodeRenderer, { spec, h })` porque `CodePackage.ts` é `.ts` (sem JSX) conforme contrato.
- Mantido `packages/index.ts` protegido; apenas atualizados caminhos de importação.
