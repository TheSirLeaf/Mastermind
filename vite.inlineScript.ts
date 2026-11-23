import { readFileSync } from 'node:fs';

import { transformWithEsbuild, type Plugin } from 'vite';

const SUFFIX = '?inline-script';

/**
 * `import src from './arquivo.ts?inline-script'`: compila o TypeScript e devolve o JavaScript
 * como string, para ser embutido em `<script>` dentro de outro documento (ex.: o motor de
 * edição que roda no iframe do palco).
 */
export function inlineScript(): Plugin {
  return {
    name: 'mastermind-inline-script',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith(SUFFIX)) return null;
      const file = id.slice(0, -SUFFIX.length);
      this.addWatchFile(file);
      const { code } = await transformWithEsbuild(readFileSync(file, 'utf-8'), file, {
        loader: 'ts',
        format: 'iife',
        target: 'es2019',
        legalComments: 'none',
      });
      if (/<\/script/i.test(code)) {
        this.error(
          `${file}: o script embutido não pode conter a sequência de fechamento de script.`
        );
      }
      return `export default ${JSON.stringify(code)};`;
    },
  };
}
