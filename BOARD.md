# BOARD.md — Inter-agent coordination (Mastermind Packages domain)

## Owner
- Agent B owns the Packages domain (`src/packages/code`, `src/packages/chart`)

## Contract section references
- Seção 7: Pacotes (code, chart)
- Seção 8: FormGenerator (formulários dinâmicos)

## Proteção da main
- Branch protection rule aplicada via `gh api` (PUT /repos/TheSirLeaf/Mastermind/branches/main/protection):
  - `allow_force_pushes: false` — protege contra forced push
  - `allow_deletions: false` — protege contra delete de branch


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
- Status: ✅ Concluído
- Commit: f993003 (agent-b/packages)
- Rebase em origin/main concluído sem conflitos
- Validação: typecheck ✅ | lint ✅ | test ✅ (116 testes) | build ✅
- Nota: form-generator.test.tsx (8 testes) passa com code como textarea (PR #7); formGenerator.test.tsx (4 testes do PR #7) também passa

### B-6: Corrigir mal posicionamento do chart (barras + donut)
- Status: ✅ Concluído
- Commit: c489e82 (agent-b/packages)
- Correções em `src/packages/chart/ChartRenderer.tsx`:
  - gap das barras verticais dividido por `rows.length + 1` (espaçamento igual nas bordas, evita encostar no canto)
  - donut: cada segmento começa do topo (12h) via `strokeDashoffset={-dash}` em vez de offset acumulativo
  - removida variável `offset` inutilizada
- Validação: typecheck ✅ | lint ✅ | test ✅ (116 testes) | build ✅


## Investigação: mal posicionamento na main (itens encostando no canto superior esquerdo)

Relato do usuário: elementos aparecem mal posicionados, encostando no canto superior esquerdo do container, itens em locais que não deviam. Agent A está investigando também.

### Causas potenciais no domínio Packages (Agent B)

#### 1. ChartRenderer — barras verticais (ChartRenderer.tsx:169)
```
const gap = (W - pad * 2 - rows.length * barWidth) / Math.max(1, rows.length);
```
O gap é dividido por `rows.length` em vez de `rows.length + 1`, deixando espaçamento desigual entre bordas e barras. Pode causar barras desalinhadas ou muito próximas das bordas.

#### 2. ChartRenderer — donut (ChartRenderer.tsx:107)
```
strokeDashoffset={-offset}
```
O `offset` é acumulativo (cada segmento começa onde o anterior terminou), não do topo (12h). Se espera cada segmento iniciando do topo, eles aparecem rotacionados em "locais errados".

#### 3. packageElementHTML (export.ts:144)
```
return `<div class="pk-wrap" data-pkg="${escapeAttr(id)}" data-spec="${specJson}" style="width:${width}px;max-width:100%">${innerHTML}</div>`;
```
O `data-spec` carrega o spec como atributo HTML com JSON escapado. Caracteres especiais (newlines no código do CodePackage, aspas) podem corromper o parse e posicionar o pacote incorretamente.

#### 4. CodeRenderer (code.css.ts:14-16)
```
.pk-code pre.pk-pre{margin:0;padding:24px 26px;overflow:visible;...}
.pk-code .pk-ln{display:block;position:relative;padding-left:52px}
```
`overflow: visible` + padding esquerdo para números de linha podem fazer o texto de código encostar nas bordas ou desalinhar se o container não tiver largura suficiente.

### Ação sugerida
- Corrigir gap do chart (dividir por `rows.length + 1` ou usar `flex`/`grid` em vez de SVG absoluto)
- Verificar donut `strokeDashoffset` (reset para 0 no início ou usar `transform: rotate`)
- Validar `packageElementHTML` com specs contendo newlines/aspas
- Revisar CSS do code container (overflow, padding, width)


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
