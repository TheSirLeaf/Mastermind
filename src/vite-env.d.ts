// vite-env.d.ts
/// <reference types="vite/client" />

/** Versão do package.json, injetada pelo Vite. */
declare const __APP_VERSION__: string;

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  import type React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
