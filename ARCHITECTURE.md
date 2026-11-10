# Mastermind — Architecture Decision Record

**Date:** 2026-11-10
**Status:** Accepted

---

## Context

The repository contains a single massive HTML file (`Editor_Dialcron_v2.html` ~1800 lines) that bundles:

- A slide presentation editor (3-pane layout: slide list, stage with iframe, property inspector)
- An embedded presentation template (base64-encoded)
- A **package system** for extensible slide elements (Code box, Charts: bar/hbar/line/donut)
- Inline CSS, inline JS (IIFE), no build step, no TypeScript, no tests

The package system is the crown jewel: each package defines:

- `render(spec, h)` → HTML string
- `css` → injected styles
- `runtime(root, spec, api)` → animation in exported presentation
- `form[]` → dynamic form schema for the inspector
- `adopt` → recognize/upgrade existing elements
- Import/export `.dialcron-pkg.json` with function serialization

Goal: Decide on a stack that enables future improvement, testability, and extensibility.

---

## Decision: React + TypeScript + Vite

### Why not Blazor?

- No WinForms integration needed (Mastermind is repo-agnostic)
- Package runtimes need canvas/SVG animation, Monaco Editor, drag-drop → costly JS interop
- No ecosystem for Storybook, visual testing, JSON Schema forms

### Why not Angular?

- Opinionated overhead for a tool this size
- Team has no Angular constraint

### Why not Vanilla TS?

- Package system maps 1:1 to React components (props = spec, children = slots)
- Form generation (JSON Schema → React Hook Form + Zod) is solved
- State management (slides, selection, history) benefits from Zustand + Immer
- Storybook, Vitest, Playwright work out of the box

---

## Package System in React (Design)

### Core Types (`packages/core/types.ts`)

```ts
// Shared between Editor and Presentation runtime
export interface PackageSpec {
  [key: string]: unknown;
}

export interface PackageDef<TSpec extends PackageSpec = PackageSpec> {
  id: string; // kebab-case, unique
  name: string;
  version: string;
  icon: string; // lucide icon name
  author?: string;
  description?: string;
  defaults: TSpec;
  presets?: Preset<TSpec>[];
  box?: { w?: number; h?: number };

  // Form schema for inspector (JSON Schema + UI hints)
  form: FormSchema;

  // Editor preview render (React component)
  render: (spec: TSpec, h: HelperAPI) => React.ReactNode;

  // Injected CSS (string or CSS Modules)
  css?: string;

  // Presentation runtime (runs inside iframe)
  runtime?: PackageRuntime<TSpec>;

  // Duration hint for preview auto-stop
  duration?: (spec: TSpec) => number;

  // Adopt existing elements from legacy presentations
  adopt?: {
    match: (el: Element) => Element | null;
    parse: (root: Element, h: HelperAPI) => TSpec;
    apply: (root: Element, spec: TSpec, h: HelperAPI) => void;
  };
}

export interface Preset<TSpec> {
  name: string;
  desc?: string;
  spec: Partial<TSpec>;
}

export interface PackageRuntime<TSpec> {
  (
    root: HTMLElement,
    spec: TSpec,
    api: RuntimeAPI
  ): {
    play(): void | Promise<void>;
    final(): void;
  } | null;
}

export interface RuntimeAPI {
  reduced: boolean;
  alive(): boolean;
  wait(ms: number): Promise<void>;
  frame(fn: (ts: number) => boolean | void): void;
}

export interface HelperAPI {
  esc: (s: string) => string;
  num: (s: string) => number;
  fmt: (v: number, d?: number) => string;
  range: (s: string) => Record<number, true>;
  hl: (code: string, lang: string, prefix?: string) => string[];
}
```

### Package Registry (`packages/core/PackageRegistry.ts`)

```ts
class PackageRegistry {
  private defs = new Map<string, PackageDef>();
  private components = new Map<string, React.ComponentType<{ spec: any }>>();

  register(def: PackageDef) {
    this.defs.set(def.id, def);
    // Compile render fn to React component for editor preview
    this.components.set(def.id, ({ spec }) => def.render(spec, H));
  }

  get(id: string): PackageDef | undefined;
  getComponent(id: string): React.ComponentType | undefined;
  list(): PackageDef[];

  // Serialize for export (functions → strings)
  serialize(ids: string[]): SerializedPackage[];

  // Deserialize from .dialcron-pkg.json
  async import(json: string): Promise<ImportResult>;
}
```

### Form Generation (`packages/components/Inspector/forms/FormGenerator.tsx`)

```ts
// JSON Schema (from package.form) → React Hook Form + Zod
// Field types: text, textarea, code, range, color, select, toggle, seg, check, list, row, info, buttons
// Conditional visibility: showIf: { k: 'field', eq|ne|in: value }
```

### Editor Preview vs Presentation Runtime

| Context            | Runs Where          | Code                                                             |
| ------------------ | ------------------- | ---------------------------------------------------------------- |
| **Editor Preview** | Main thread (React) | `PackageDef.render(spec, H)` → React nodes                       |
| **Presentation**   | Iframe (isolated)   | `PackageDef.runtime(root, spec, api)` → imperative DOM animation |

The iframe receives a **registry JSON** (`pkg-registry`) + **host script** (`pkg-host.js`) that:

1. Parses registry
2. On slide enter: finds `[data-pkg]` elements, runs each package's `runtime`
3. Provides `api: { alive, wait, frame, reduced }`

---

## Package Structure (File System)

```
src/packages/
├── code/
│   ├── CodePackage.ts         # PackageDef + registration
│   ├── CodeRenderer.tsx       # Editor preview (Monaco read-only)
│   ├── CodeEditor.tsx         # Inspector form (Monaco editable)
│   ├── CodeRuntime.ts         # Presentation typing animation
│   ├── formSchema.ts          # Zod schema for spec
│   └── index.ts               # exports
├── chart/
│   ├── ChartPackage.ts
│   ├── ChartRenderer.tsx      # SVG via recharts or custom
│   ├── ChartRuntime.ts        # Count-up animation
│   ├── formSchema.ts
│   └── index.ts
└── index.ts                   # registerBuiltins(registry)
```

---

## Data Flow

```
User edits form in Inspector
        │
        ▼
PackageDef.form (JSON Schema) validates via Zod
        │
        ▼
spec updated in SlideStore (Zustand + Immer)
        │
        ▼
Editor Preview re-renders: <PackageComponent spec={spec} />
        │
        ▼
User clicks "Export HTML"
        │
        ▼
buildHTML() serializes:
  - Slides HTML (with data-pkg, data-spec)
  - pkg-registry JSON (id, version, runtime fn as string)
  - pkg-host.js (injected)
  - pkg-css (concatenated)
        │
        ▼
Standalone .html file → opens in browser → pkg-host runs runtimes
```

---

## Migration Plan

| Phase            | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| **1. Scaffold**  | Vite + React + TS + Tailwind + Vitest + Storybook            |
| **2. Core**      | Types, Registry, SlideStore, History, IframeBridge, AutoSave |
| **3. Editor UI** | Layout, Sidebar, Stage, Inspector tabs, FormGenerator        |
| **4. Packages**  | Port `code` + `chart` with full type safety                  |
| **5. Export**    | Standalone HTML + PDF, pkg-host extraction                   |
| **6. Polish**    | Templates, themes, E2E tests, CI/CD                          |

---

## Git Ignore

```
# Current monolithic file (archived)
holy-grail.html

# Build output
dist/
node_modules/
.env
*.log
```

---

## References

- Current implementation: `Editor_Dialcron_v2.html` (renamed to `holy-grail.html`)
- WinForms origin: `Repositories/DialcronWinforms/`
- Package examples: Code box, Chart (bar/hbar/line/donut)
