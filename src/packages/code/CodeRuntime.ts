import type { RuntimeAPI } from '../core/types';

import type { CodeSpec } from './CodeRenderer';

export function codeRuntime(root: HTMLElement, spec: CodeSpec, api: RuntimeAPI) {
  const pre = root.querySelector('pre.pk-pre');
  if (!pre) return null;
  const original = pre.innerHTML;
  const lines = Array.from(pre.querySelectorAll('.pk-ln')) as HTMLElement[];
  const texts = lines.map((line) => line.textContent ?? '');
  let cancelled = false;

  const final = () => {
    cancelled = true;
    pre.innerHTML = original;
  };

  if (!spec.typing || api.reduced) return { play: () => undefined, final };

  return {
    play: async () => {
      const caret = spec.caret ? document.createElement('span') : null;
      if (caret) caret.className = 'pk-caret';
      let shown = 0;
      await api.wait(spec.delay);
      for (let i = 0; i < texts.length && !cancelled; i++) {
        const el = lines[i];
        if (!el) continue;
        const text = texts[i] ?? '';
        el.textContent = '';
        if (spec.lineGlow) el.classList.add('pk-hl');
        for (let c = 0; c < text.length; c++) {
          if (cancelled || !api.alive()) return;
          el.textContent += text[c] ?? '';
          shown += 1;
          if (caret) {
            el.appendChild(caret);
          }
          if (shown % 3 === 0 || c === text.length - 1) {
            await api.wait((1000 / Math.max(1, spec.cps)) * (c === text.length - 1 ? 4 : 3));
          }
        }
        if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
        if (spec.lineGlow) el.classList.remove('pk-hl');
      }
      if (caret) caret.remove();
    },
    final,
  };
}
