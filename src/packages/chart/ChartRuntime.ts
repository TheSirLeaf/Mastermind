import type { RuntimeAPI } from '../core/types';

import type { ChartSpec } from './ChartRenderer';

export function chartRuntime(root: HTMLElement, spec: ChartSpec, api: RuntimeAPI) {
  if (!spec.animate || api.reduced) return null;
  const bars = Array.from(root.querySelectorAll('.pk-b')) as SVGElement[];
  const values = Array.from(root.querySelectorAll('.pk-bar-v, .pk-line-v')) as SVGTextElement[];
  const originals = values.map((el) => el.textContent ?? '');
  const heights = bars.map((el) => Number(el.getAttribute('data-h') ?? 0));
  let cancelled = false;

  const final = () => {
    cancelled = true;
    bars.forEach((bar, index) => {
      bar.style.transform = '';
      bar.style.opacity = '';
      bar.setAttribute('height', String(heights[index] ?? 0));
    });
    values.forEach((el, index) => {
      el.textContent = originals[index] ?? '';
    });
  };

  return {
    play: async () => {
      bars.forEach((bar) => {
        bar.style.transform = 'scaleY(0)';
        bar.style.opacity = '0';
      });
      await api.wait(spec.delay * 1000);
      bars.forEach((bar) => {
        bar.style.opacity = '1';
        bar.style.transform = 'scaleY(1)';
        bar.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)';
      });
      if (spec.countUp) {
        const start = performance.now();
        const duration = 900;
        await new Promise<void>((resolve) => {
          const tick = (ts: number) => {
            if (cancelled || !api.alive()) return resolve();
            const t = Math.min(1, (ts - start) / duration);
            values.forEach((el, index) => {
              const original = originals[index] ?? '0';
              const target =
                Number(
                  original
                    .replace(/[^0-9,.-]/g, '')
                    .replace(/\./g, '')
                    .replace(',', '.')
                ) || 0;
              const suffix = original.replace(/[0-9.,\s-]/g, '');
              const current = target * t;
              el.textContent = `${current.toLocaleString('pt-BR', {
                minimumFractionDigits: Math.min(2, original.split(/[.,]/)[1]?.length ?? 0),
                maximumFractionDigits: Math.min(2, original.split(/[.,]/)[1]?.length ?? 0),
              })}${suffix}`;
            });
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
      }
    },
    final,
  };
}
