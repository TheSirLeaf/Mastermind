# Contrato de Colaboração — Mastermind (3 Agentes)

**Versão:** 1.0  
**Data:** 2026-11-10  
**Status:** Ativo

---

## 1. Visão Geral

Este documento define as regras de trabalho para **3 agentes** colaborando no projeto **Mastermind** (editor de apresentações React + TypeScript). O objetivo é permitir desenvolvimento paralelo, previsível e sem conflitos.

> **Princípio norteador:** _Contratos explícitos > comunicação implícita._

---

## 2. Divisão de Domínios (Ownership)

| Agente      | Domínio          | Responsabilidade Principal                                                                                  | Arquivos-Chave                                                                                      |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Agent A** | **Core / Infra** | Motor do editor, tipos base, build, CI, store, history, iframe bridge, auto-save                            | `packages/core/*`, `vite.config.ts`, `tsconfig.json`, `.github/workflows/*`                         |
| **Agent B** | **Packages**     | Pacotes built-in (code, chart, futuros), FormGenerator, PackageRegistry, import/export `.dialcron-pkg.json` | `packages/code/*`, `packages/chart/*`, `packages/*`, `components/Inspector/forms/FormGenerator.tsx` |
| **Agent C** | **Editor UI**    | Interface do usuário (Layout, Sidebar, Stage, Inspector, PackageManager), Storybook, E2E, UX                | `components/*`, `stories/*`, `tests/e2e/*`                                                          |

**Regra de ouro:** Cada agente é **dono** da arquitetura e decisões do seu domínio. Outros agentes _podem_ tocar para integração, mas **não decidem** sozinhos.

---

## 3. Contratos Compartilhados (Imutáveis sem Acordo)

Os arquivos abaixo **não podem ser alterados unilateralmente**. Qualquer mudança requer:

1. PR com descrição clara
2. Aprovação de **pelo menos 1 outro agente**
3. Atualização deste documento se houver mudança de contrato

### Arquivos Protegidos

| Arquivo                             | Por que é Contrato                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/core/types.ts`            | Interfaces base: `PackageDef`, `PackageSpec`, `RuntimeAPI`, `HelperAPI`, `FormSchema` |
| `packages/core/PackageRegistry.ts`  | API de registro, serialização, import/export de pacotes                               |
| `src/packages/index.ts`             | `registerBuiltins(registry)` — ordem de registro afeta CSS                            |
| `public/presentation-template.html` | Template base do iframe exportado (slots para registry, host, css)                    |
| `vite.config.ts`                    | Config de build, aliases, plugins                                                     |
| `tsconfig.json`                     | Opções TS strict, paths, referências                                                  |
| `tailwind.config.js`                | Tokens de design, content paths                                                       |
| `.github/workflows/ci.yml`          | Pipeline de CI (lint, typecheck, test, build)                                         |

---

## 4. Fluxo de Trabalho Git

### Branch Strategy

```
main (protegida, require 1 review, status checks pass)
  │
  ├─ agent-a/<tarefa-curta>     # ex: agent-a/store-immer-setup
  ├─ agent-b/<tarefa-curta>     # ex: agent-b/chart-runtime-fix
  └─ agent-c/<tarefa-curta>     # ex: agent-c/inspector-tabs-refactor
```

### Regras de Branch

- **Uma branch por tarefa pequena** (1–2 dias de trabalho)
- Nome: `agent-<letra>/<kebab-case-descritivo>`
- **Nunca** commit direto na `main`
- **Draft PR** enquanto em andamento → marcar "Ready for review" quando completo

### PR Template (Obrigatório)

```markdown
## Domínio Afetado

- [ ] Core/Infra (Agent A)
- [ ] Packages (Agent B)
- [ ] Editor UI (Agent C)

## Mudanças

- Breve descrição do que foi feito

## Testes Adicionados

- [ ] Unit (Vitest)
- [ ] E2E (Playwright)
- [ ] Visual (Storybook)
- [ ] Nenhum (justificar)

## Breaking Changes?

- [ ] Não
- [ ] Sim → descrever + migration path

## Checklist

- [ ] Lint passa (`npm run lint`)
- [ ] Typecheck passa (`npm run typecheck`)
- [ ] Testes passam (`npm run test`)
- [ ] Build passa (`npm run build`)
- [ ] Atualizou `.sync/agent-<letra>.md`
```

### Merge

- **Squash and merge** → histórico limpo
- Delete branch após merge
- CI deve passar (obrigatório)

---

## 5. Sincronização Assíncrona (`.sync/`)

Cada agente mantém um arquivo em `.sync/` atualizado **ao final de cada sessão** (ou quando mudar foco).

### Estrutura

```
.sync/
  agent-a.md
  agent-b.md
  agent-c.md
```

### Template por Agente

```markdown
# agent-<letra>.md — YYYY-MM-DD

## Feito

- Item 1
- Item 2

## Em Andamento

- Item 3 (XX%)

## Próximo (Próximas 2-3 sessões)

- Item 4
- Item 5

## Bloqueios / Dependências

- Preciso que Agent X finalize Y para prosseguir com Z
- Dúvida arquitetural: [descrição]

## Decisões Tomadas

- Escolha X sobre Y (motivo)
```

**Regra:** Ler os `.sync/` dos outros agentes **antes de iniciar trabalho** para evitar duplicação/conflito.

---

## 6. Padrões Técnicos Obrigatórios

### Lint + Format (CI bloqueia se falhar)

| Ferramenta | Config                                                                   | Escopo                                 |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------- |
| ESLint     | `eslint.config.js` (TS, React, import/order, no-floating-decimal)        | `packages/*`, `components/*`, `core/*` |
| Prettier   | Single quote, trailing comma es5, 100 cols, tab width 2                  | Todo `.ts/.tsx/.css/.json/.md`         |
| TypeScript | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | `tsconfig.json`                        |

### Testes

| Tipo   | Ferramenta | Onde          | Quando Rodar                |
| ------ | ---------- | ------------- | --------------------------- |
| Unit   | Vitest     | `tests/unit/` | Todo PR (CI)                |
| E2E    | Playwright | `tests/e2e/`  | Todo PR (CI)                |
| Visual | Storybook  | `stories/`    | Manual + Chromatic (futuro) |

**Cobertura mínima:** 80% em `core/` e `packages/*/runtime.ts`.

### Commits (Conventional Commits)

```
feat(core): adiciona HistoryManager com Immer
fix(packages/chart): corrige count-up em valores negativos
refactor(ui/inspector): extrai FormGenerator para componente separado
docs: atualiza AGENTS_CONTRACT.md com nova regra de sync
chore(ci): adiciona step de typecheck no workflow
```

---

## 7. Adicionando Novo Pacote (Checklist Compartilhado)

Qualquer agente pode criar pacote, mas **deve seguir o template**:

### Estrutura de Pastas

```
src/packages/<kebab-case-nome>/
├── <Nome>Package.ts          # PackageDef<TSpec> exportado (contrato principal)
├── <Nome>Renderer.tsx        # React component (preview no editor)
├── <Nome>Runtime.ts          # Função pura (animação na apresentação)
├── formSchema.ts             # FormSchema exportado (Zod + UI hints)
├── <nome>.css.ts             # CSS como string exportada (ex: `export const css = \`...\``)
├── index.ts                  # Re-exporta tudo: PackageDef, formSchema, css, Renderer, Runtime
└── <Nome>.stories.tsx        # Storybook (OBRIGATÓRIO: specs default + presets)
```

### Registro (em `src/packages/index.ts`)

```ts
import { CodePackage } from './code';
import { ChartPackage } from './chart';
import { NovoPacotePackage } from './novo-pacote'; // ← adiciona aqui

export function registerBuiltins(reg: PackageRegistry) {
  reg.register(CodePackage);
  reg.register(ChartPackage);
  reg.register(NovoPacotePackage);
}
```

### Validação Antes de PR

- [ ] `PackageDef` tipado com `TSpec` interface exportada
- [ ] `formSchema` cobre todos campos de `TSpec` (exceto `_internal`)
- [ ] `Renderer` usa `HelperAPI` (`h.esc`, `h.hl`, `h.num`, `h.fmt`, `h.range`)
- [ ] `Runtime` é **função pura serializável** (sem closures externas, sem imports)
- [ ] `css` string não vaza seletores globais (prefixar com `.pk-<id>`)
- [ ] Storybook com args para `defaults` e cada `preset`
- [ ] Test unit para `Runtime` (mocke `api.frame`, `api.wait`)
- [ ] Export/Import roundtrip funciona (`.dialcron-pkg.json`)

---

## 8. Convenções de Código

### Naming

| Coisa                      | Convenção                                         | Exemplo                              |
| -------------------------- | ------------------------------------------------- | ------------------------------------ |
| Package ID                 | kebab-case, único, prefixo opcional               | `code`, `chart`, `minha-tabela`      |
| TypeScript interfaces      | PascalCase + `Spec`/`Def`                         | `CodeSpec`, `ChartPackage`           |
| React components           | PascalCase                                        | `CodeRenderer`, `ChartRuntime`       |
| Arquivos                   | PascalCase para components, kebab-case para utils | `CodeRenderer.tsx`, `form-schema.ts` |
| CSS classes (apresentação) | `.pk-<package-id>-*`                              | `.pk-code .pk-ln`, `.pk-chart .pk-b` |
| Store slices (Zustand)     | camelCase + `Slice`                               | `slidesSlice`, `selectionSlice`      |

### PackageDef — Campos Obrigatórios

```ts
export const MeuPacote: PackageDef<MeuPacoteSpec> = {
  id: 'meu-pacote',           // único, kebab-case
  name: 'Meu Pacote',         // legível
  version: '1.0.0',           // semver
  icon: 'lucide-icon-name',   // nome do ícone Lucide
  description: '...',         // 1 linha
  defaults: { ... },          // TSpec completo
  presets: [ ... ],           // opcional
  box: { w: 800 },            // largura sugerida no stage
  form: formSchema,           // FormSchema[]
  render: (spec, h) => <MeuPacoteRenderer spec={spec} h={h} />,
  css: meuPacoteCss,          // string
  runtime: MeuPacoteRuntime,  // (root, spec, api) => { play, final } | null
  duration: (s) => 2000,      // ms hint para preview auto-stop
  adopt: { ... }              // opcional, para elementos legados
};
```

### Runtime API (Contrato Iframe)

```ts
interface RuntimeAPI {
  reduced: boolean; // prefers-reduced-motion
  alive(): boolean; // true se slide ainda ativo
  wait(ms: number): Promise<void>; // sleep cooperativo
  frame(fn: (ts: number) => boolean | void): void; // requestAnimationFrame loop
}
```

**Regra:** `runtime` deve retornar objeto com `play()` e `final()` ou `null` (sem animação). `final()` **sempre** chamado na troca de slide — restaurar HTML original para print/PDF.

---

## 9. Resolução de Conflitos

1. **Conflito de domínio** (ex: Agent B quer mudar `types.ts` que afeta Agent C) → Abre issue/PR, discute no `.sync/`, decide por consenso (2/3 agentes)
2. **Conflito técnico** (ex: CSS Modules vs string CSS) → Decide o **dono do domínio** (Agent B para packages), documenta no `AGENTS_CONTRACT.md`
3. **Bloqueio crítico** (CI quebrado, build falhando) → Qualquer agente pode fazer **hotfix direto na main** com commit `fix: ...` + aviso imediato no `.sync/`

---

## 10. Onboarding de Novo Agente

Se um 4º agente entrar:

1. Lê `AGENTS_CONTRACT.md` + `ARCHITECTURE.md` + `.sync/*`
2. Cria `.sync/agent-d.md`
3. Escolhe domínio vago ou combina divisão com existentes
4. Primeiro PR: adiciona seu nome na tabela da Seção 2

---

## 11. Versionamento deste Contrato

- **v1.0** — Inicial (este documento)
- Mudanças: PR com label `contract` + aprovação de 2/3 agentes
- Histórico no git log

---

## Assinatura (Implicitamente Aceito ao Contribuir)

| Agente  | Domínio      | Início     |
| ------- | ------------ | ---------- |
| Agent A | Core / Infra | 2026-11-10 |
| Agent B | Packages     | 2026-11-10 |
| Agent C | Editor UI    | 2026-11-10 |

---

**Próximo passo:** Agent A cria scaffold inicial (Vite + React + TS + estrutura). Agents B e C validam rodando localmente.
