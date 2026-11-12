import type { RuntimeAPI } from '../core/types';

import type { ChartSpec } from './ChartRenderer';

/**
 * Animação de entrada do gráfico.
 *
 * Este arquivo é serializado via String() no export: tudo precisa estar dentro
 * da função (sem helpers de módulo) para reviver autossuficiente no HTML final.
 */
export function chartRuntime(root: HTMLElement, spec: ChartSpec, api: RuntimeAPI) {
  if (!spec.animate || api.reduced) return null;

  const style = spec.animStyle || 'grow';
  const durMs = (spec.animDuration && spec.animDuration > 0 ? spec.animDuration : 0.8) * 1000;
  const gapMs = (spec.stagger !== undefined && spec.stagger >= 0 ? spec.stagger : 0.08) * 1000;
  const ease = spec.animEase || 'cubic-bezier(.2,.8,.2,1)';

  const seen = new Set<Element>();
  const items: SVGElement[] = [];
  root.querySelectorAll('.pk-b,[data-pk-item]').forEach((node) => {
    if (seen.has(node)) return;
    seen.add(node);
    items.push(node as SVGElement);
  });
  const values = Array.from(
    root.querySelectorAll('.pk-bar-v,.pk-line-v,.pk-hv,.pk-cv-total')
  ) as HTMLElement[];
  const originals = values.map((el) => el.textContent ?? '');
  const heights = items.map((el) => Number(el.getAttribute('data-h') ?? 0));
  let cancelled = false;

  const isBar = (el: Element) => el.classList.contains('pk-b');
  const isHBar = (el: Element) => el.classList.contains('pk-hb');
  const isSeg = (el: Element) => el.hasAttribute('data-pk-seg');
  const isDot = (el: Element) => el.hasAttribute('data-pk-dot');
  const isLine = (el: Element) => el.hasAttribute('data-pk-line');
  const dashOf = (el: Element) => el.getAttribute('stroke-dasharray') || '0 1';

  /** Estado inicial (escondido) e final (visível) de cada tipo de marca. */
  const hidden = (el: SVGElement): Record<string, string> => {
    const base: Record<string, string> = { opacity: '0' };
    if (style === 'fade') return base;
    if (style === 'rise') return { ...base, transform: 'translateY(26px)' };
    if (isBar(el)) return { ...base, transform: 'scaleY(0)' };
    if (isHBar(el)) return { ...base, transform: 'scaleX(0)' };
    if (isSeg(el)) {
      const total = dashOf(el)
        .split(/\s+/)
        .reduce((sum, n) => sum + (Number(n) || 0), 0);
      return { ...base, strokeDasharray: `0 ${total}` };
    }
    if (isLine(el)) return { ...base, strokeDasharray: '1', strokeDashoffset: '1' };
    if (isDot(el)) return { ...base, transform: 'scale(0)' };
    return { ...base, transform: 'translateY(26px)' };
  };
  const shown = (el: SVGElement): Record<string, string> => {
    const base: Record<string, string> = { opacity: '1' };
    if (style === 'fade') return base;
    if (style === 'rise') return { ...base, transform: 'none' };
    if (isBar(el)) return { ...base, transform: 'scaleY(1)' };
    if (isHBar(el)) return { ...base, transform: 'scaleX(1)' };
    if (isSeg(el)) return { ...base, strokeDasharray: dashOf(el) };
    if (isLine(el)) return { ...base, strokeDashoffset: '0' };
    if (isDot(el)) return { ...base, transform: 'scale(1)' };
    return { ...base, transform: 'none' };
  };
  const apply = (el: HTMLElement | SVGElement, props: Record<string, string>) => {
    Object.keys(props).forEach((key) => {
      (el.style as unknown as Record<string, string>)[key] = props[key] as string;
    });
  };
  const transition = (delay: number) =>
    ['transform', 'opacity', 'stroke-dasharray', 'stroke-dashoffset']
      .map((prop) => `${prop} ${durMs}ms ${ease} ${delay}ms`)
      .join(',');

  const final = () => {
    cancelled = true;
    items.forEach((el, index) => {
      ['transform', 'opacity', 'transition', 'strokeDasharray', 'strokeDashoffset'].forEach(
        (key) => {
          (el.style as unknown as Record<string, string>)[key] = '';
        }
      );
      if (isBar(el)) el.setAttribute('height', String(heights[index] ?? 0));
    });
    values.forEach((el, index) => {
      el.style.opacity = '';
      el.style.transition = '';
      el.textContent = originals[index] ?? '';
    });
  };

  return {
    play: async () => {
      items.forEach((el) => apply(el, { ...hidden(el), transition: 'none' }));
      values.forEach((el) => {
        el.style.transition = 'none';
        el.style.opacity = '0';
      });
      await api.wait(spec.delay * 1000);
      if (cancelled) return;
      root.getBoundingClientRect(); // fixa o estado inicial antes de transicionar

      items.forEach((el, index) => {
        apply(el, { ...shown(el), transition: transition(index * gapMs) });
      });
      const aligned = values.length === items.length;
      values.forEach((el, index) => {
        const delay = (aligned ? index * gapMs : 0) + durMs * 0.5;
        el.style.transition = `opacity ${durMs * 0.5}ms ease ${delay}ms`;
        el.style.opacity = '1';
      });

      if (spec.countUp) {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = (ts: number) => {
            if (cancelled || !api.alive()) return resolve();
            let done = true;
            values.forEach((el, index) => {
              const offset = aligned ? index * gapMs : 0;
              const t = Math.min(1, Math.max(0, (ts - start - offset) / durMs));
              if (t < 1) done = false;
              const original = originals[index] ?? '0';
              const target =
                Number(
                  original
                    .replace(/[^0-9,.-]/g, '')
                    .replace(/\./g, '')
                    .replace(',', '.')
                ) || 0;
              // Prefixo (ex.: "R$ ") e sufixo (ex.: "%") ficam como estão; só o número conta.
              const prefix = (/^[^0-9-]*/.exec(original) ?? [''])[0];
              const suffix = original.slice(prefix.length).replace(/[0-9.,\s-]/g, '');
              const digits = Math.min(2, original.split(/[.,]/)[1]?.length ?? 0);
              el.textContent = `${prefix}${(target * t).toLocaleString('pt-BR', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
              })}${suffix}`;
            });
            if (done) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      } else {
        await api.wait(durMs + gapMs * Math.max(0, items.length - 1));
      }
    },
    final,
  };
}
