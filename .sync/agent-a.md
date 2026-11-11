# agent-a.md — 2026-11-10

## Feito

- Scaffold Vite + React 18 + TS strict + Tailwind + Vitest + Storybook + Playwright
- Contrato Core: `src/packages/core/types.ts` (PackageDef, FormSchema, HelperAPI, RuntimeAPI, Slide/Deck)
- `PackageRegistry` com registro, preview React, `toHTML`, CSS, serialize/import/export `.dialcron-pkg.json`
- Serialização compatível com o monolito (`{ $fn }`, ignora `_*` e `custom`)
- `HistoryManager` com snapshots, coalescência e limite
- `deckStore` (Zustand + Immer): CRUD de slides, seleção, edição de elemento, notas, undo/redo
- `IframeBridge` + script de seleção/edição dentro do iframe; escala do palco
- Auto-save em IndexedDB (`saveDeck`, `savePackages`, debounce)
- Export HTML autônomo com host de runtime de pacotes e navegação
- `public/presentation-template.html` extraído do monolito (fontes, CSS, slots de registry/host/css)
- Pacotes placeholder `code` e `chart` (Agente B substitui pelos definitivos)
- 30 testes unitários cobrindo core
- CI (lint, typecheck, test, build, e2e) e configs de Storybook/Playwright
- App shell funcional de 3 painéis (Agente C substitui pela UI definitiva)
- `parseDeckHTML` / `looksLikeDeckHTML` para importar o monolito, exportações e decks legados
- `exportPresentationFile`, `exportPackagesFile`, `downloadFile`, `slugifyTitle`, CSS de impressão/PDF
- Export inclui somente pacotes referenciados (`data-pkg`)
- Correção do path de `updateElementHTML` (section → filhos)
- Testes de importação, store (CRUD/undo/coalescência) e export: 50 testes
- Corrigido host de runtime: revivia apenas funções como string, não `{ $fn }` (runtimes não rodavam no export); teste de integração play/final
- Coverage inclui `src/packages/*/*Runtime.ts`; Storybook inclui stories em `src/packages/**`
- Removida a worktree/branch D (`agent-d/qa`) local e remota; restam A, B e C
- Pacote `sim` (Tela simulada): janela de app, tabela, formulário, transação, mensagens,
  painel de código opcional e roteiro por linha; presets Agenda (sucesso + rollback) e Cadastro
- Runtime do `sim` é autossuficiente (serializável), restaura o HTML final e respeita reduced motion;
  CSS prefixado `.pk-sim-*`; 4 testes novos (56 no total)

## Em Andamento
- Importação de decks HTML, export/PDF e endurecimento do core
- Revisão do sistema de pacotes: chaves de formulário são planas, presets não são mesclados
  pelo registry e runtimes precisam ser autossuficientes (o `sim` segue essas regras)

## Próximo (Agente A)

- Integrar PRs de B e C
- Endurecer export/PDF e import/export roundtrip
- E2E do fluxo completo

## Decisões Tomadas

- Slides continuam sendo HTML (`<section class="slide">`), preservando fidelidade e export do monolito
- Pacotes renderizam React no editor; `registry.toHTML()` (renderToStaticMarkup) gera o HTML inserido no slide
- Runtime de pacote é serializado como função e executado no iframe/export (mesma política do original)
- `src/packages/core` é o caminho canônico; `packages/core` do contrato mapeado por alias
- Vitest em `vitest.config.ts` separado para evitar conflito de tipos Vite 6 × Vitest 2
- Histórico trata título, slides e índice atual como um snapshot único

## Bloqueios / Dependências

- Nenhum para B/C: scaffold, store, registry e bridge prontos
- B: substituir `CodePackage.tsx` / `ChartPackage.tsx` placeholders e criar `FormGenerator`
- C: substituir `App.tsx` shell, usar `useDeckStore` + `IframeBridge` + `PackageRegistry`

## Notas de integração

- Edições parciais dos agentes B/C feitas antes da parada foram preservadas em `.work/incoming/`
- Worktrees: `.work/worktrees/agent-a`, `agent-b`, `agent-c`
- Branches: `agent-a/core`, `agent-b/packages`, `agent-c/editor-ui`
