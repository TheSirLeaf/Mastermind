# Mastermind

Editor de apresentações em React + TypeScript — substituto do editor monolítico
`holy-grail.html` (Dialcron v6).

## Stack

- **Vite 6** + **React 18** + **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Zustand + Immer** para o estado do deck; histórico por snapshots
- **Tailwind CSS** com os tokens do design original
- **Vitest** (unit), **Playwright** (e2e), **Storybook** (visual)
- **Iframe isolado** para o palco: o deck é HTML real, com seleção e edição in-place

## Scripts

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run typecheck
npm run test
npm run lint
npm run build
npm run test:e2e
npm run storybook
```

## Estrutura

```
src/
  packages/
    core/            # CONTRATO: types, registry, history, deck, storage, export, iframe bridge
    code/            # pacote built-in "Caixa de código" (Agente B)
    chart/           # pacote built-in "Gráfico" (Agente B)
    index.ts         # registerBuiltins (ordem = ordem do CSS)
  store/deckStore.ts # Zustand + Immer + histórico
  App.tsx            # shell de 3 painéis (Agente C substitui pela UI final)
public/
  presentation-template.html  # template base com slots {{TITLE}}/{{SLIDES}}/{{PKG_CSS}}/{{PKG_REGISTRY}}/{{PKG_HOST}}/{{NAV}}
tests/unit/          # Vitest
```

## Modelo de dados

```ts
interface Slide {
  id: string;
  html: string;
} // <section class="slide ...">...</section>
interface Deck {
  title: string;
  slides: Slide[];
}
```

O editor carrega o deck completo dentro de um iframe. Seleção, hover e edição de
texto acontecem lá; o React recebe eventos via `postMessage` (`IframeBridge`).

## Pacotes

Um pacote é um `PackageDef<TSpec>` com `render`, `form`, `css`, `runtime`
opcional e `presets`. `registry.toHTML(id, spec)` gera o HTML inserido no slide;
o `runtime` é serializado para `.dialcron-pkg.json` / export e executado no host
da apresentação (`src/packages/core/pkgHost.ts`).

Formato do arquivo: `{ format: 'dialcron-package', spec: 1, packages: [...] }`,
funções como `{ $fn: "..." }` — compatível com o editor antigo.

- **Criar um pacote:** [`docs/PACKAGES.md`](docs/PACKAGES.md) (com um exemplo pronto em `docs/examples/`).
- **Deploy no Cloudflare Pages e CI/CD:** [`docs/DEPLOY.md`](docs/DEPLOY.md).
- **Interação ao vivo (espectadores):** [`docs/LIVE.md`](docs/LIVE.md).

## Fluxo de agentes

Ver `AGENTS_CONTRACT.md` e `ARCHITECTURE.md`. Branches:

- `agent-a/core` — core/infra, build, CI, remoto
- `agent-b/packages` — pacotes, FormGenerator, import/export
- `agent-c/editor-ui` — Layout, Sidebar, Stage, Inspector, Storybook, E2E

Worktrees em `.work/worktrees/` (ignoradas pelo git). PRs para `main` com squash.
