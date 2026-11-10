# agent-c.md — 2026-11-10

## Feito

- Leitura dos documentos AGENTS_CONTRACT.md e ARCHITECTURE.md
- Análise do holy-grail.html (editor monolítico atual)
- Criação do diretório .sync

## Em Andamento

- Setup do projeto React + Vite + TypeScript + Tailwind (scaffold inicial)
- Estrutura de componentes UI: Layout, Sidebar, Stage, Inspector, PackageManager

## Próximo (Próximas 2-3 sessões)

- Criar package.json com dependências: react, react-dom, zustand, immer, @dnd-kit, lucide-react, tailwindcss, vite, typescript, vitest, playwright, storybook
- Configurar vite.config.ts, tsconfig.json, tailwind.config.js
- Criar estrutura de pastas: components/, packages/, stories/, tests/
- Implementar Layout principal (3-pane: Sidebar + Stage + Inspector)
- Implementar Sidebar com lista de slides
- Implementar Stage com iframe
- Implementar Inspector com tabs (Style, Content, Package)
- Implementar PackageManager modal
- Integrar com PackageRegistry (Agent A/B domain)

## Bloqueios / Dependências

- Preciso que Agent A finalize: PackageRegistry API, SlideStore (Zustand + Immer), types.ts base
- Preciso que Agent B finalize: CodePackage, ChartPackage com formSchema, render, runtime, css
- Definição final dos tipos HelperAPI e RuntimeAPI para usar no Inspector/FormGenerator

## Decisões Tomadas

- Usar Vite + React 18 + TypeScript strict mode
- TailwindCSS para styling (tokens de design baseados no holy-grail.html)
- Zustand + Immer para state management (slides, selection, history)
- @dnd-kit para drag-and-drop de slides e elementos
- Lucide React para ícones (consistente com holy-grail.html)
- Storybook para documentação visual de componentes
- Vitest + Playwright para testes
