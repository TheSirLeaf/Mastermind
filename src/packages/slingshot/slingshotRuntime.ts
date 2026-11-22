import type { RuntimeAPI, RuntimeController } from '../core/types';

import type { SlingshotSpec } from './SlingshotPackage';

/**
 * Cena da transição "Estilingue": cobre o slide que entra (um estilingue derruba uma pilha de
 * blocos) e depois revela o conteúdo. Clique pula a cena.
 *
 * É serializada para o HTML exportado, então não pode referenciar nada fora do próprio corpo.
 */
export function slingshotScene(
  slide: HTMLElement,
  spec: SlingshotSpec,
  api: RuntimeAPI
): RuntimeController | null {
  if (!slide || api.reduced) return null;

  const NS = 'http://www.w3.org/2000/svg';
  let overlay: HTMLElement | null = null;
  let token = 0;
  let outTimer = 0;

  const split = (value: unknown): string[] =>
    String(value ?? '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

  const clear = (): void => {
    token += 1;
    window.clearTimeout(outTimer);
    overlay?.remove();
    overlay = null;
    slide.classList.remove('pk-shot-hold', 'pk-shot-out');
  };

  const make = (
    tag: string,
    attrs: Record<string, string | number>,
    parent: Element
  ): SVGElement => {
    const el = document.createElementNS(NS, tag);
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
    parent.appendChild(el);
    return el;
  };

  const clamp = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
  const inOut = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const outBack = (x: number): number =>
    1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  const outBounce = (value: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    let x = value;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  };

  const play = (): void => {
    clear();
    const my = token;
    const box = document.createElement('div');
    box.className = 'pk-shot-scene';
    const sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('viewBox', '0 0 1920 1080');
    sv.setAttribute('aria-hidden', 'true');
    box.appendChild(sv);
    slide.appendChild(box);
    overlay = box;
    slide.classList.add('pk-shot-hold');
    let skip = false;
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      skip = true;
    });

    /* geometria e tempos */
    const GY = 900;
    const REST = { x: 330, y: 745 };
    const PULL = { x: 235, y: 800 };
    const TIPL = { x: 294, y: 732 };
    const TIPR = { x: 366, y: 736 };
    const BR = 34;
    const T_BALL = 800;
    const T_PULL = 1000;
    const T_PULLEND = 1450;
    const T_REL = 1530;
    const T_SNAP = 1630;
    const FLY = 850;
    const T_HIT = T_SNAP + FLY;
    const TOTAL = T_HIT + 1750;
    const G = 1500;
    const VX = (1146 - REST.x) / (FLY / 1000);
    const VY = (690 - REST.y - 0.5 * G * Math.pow(FLY / 1000, 2)) / (FLY / 1000);

    const defs = make('defs', {}, sv);
    const grad = make('radialGradient', { id: 'pkShotBall', cx: '.35', cy: '.3', r: '.8' }, defs);
    make('stop', { offset: '0', 'stop-color': '#9CC9B4' }, grad);
    make('stop', { offset: '1', 'stop-color': '#3C7A5A' }, grad);

    const world = make('g', {}, sv);
    const gStatic = make('g', {}, world);
    make(
      'rect',
      { x: 120, y: GY + 14, width: 1680, height: 28, rx: 10, fill: '#E9D3CF', opacity: 0.8 },
      gStatic
    );
    make(
      'rect',
      { x: 120, y: GY, width: 1680, height: 14, rx: 7, fill: '#C77C8A', opacity: 0.6 },
      gStatic
    );
    make('text', { x: 330, y: 976, class: 'pk-shot-lab' }, gStatic).textContent = String(
      spec.leftLabel ?? ''
    );
    make('text', { x: 1378, y: 976, class: 'pk-shot-lab' }, gStatic).textContent = String(
      spec.rightLabel ?? ''
    );
    make('text', { x: 1800, y: 112, class: 'pk-shot-skip' }, gStatic).textContent = String(
      spec.skipText ?? ''
    );

    /* estilingue (parte de trás) */
    const gSling = make('g', {}, world);
    const gBack = make('g', {}, gSling);
    make('path', { d: 'M330 902 L330 832', class: 'pk-shot-wood w22' }, gBack);
    make('path', { d: `M330 838 Q318 790 ${TIPL.x} ${TIPL.y}`, class: 'pk-shot-wood w16' }, gBack);
    const bandL = make(
      'line',
      { class: 'pk-shot-band', x1: TIPL.x, y1: TIPL.y, x2: REST.x, y2: REST.y },
      gBack
    );

    /* blocos: 5 fileiras de 3, de baixo para cima */
    const labels = split(spec.blocks);
    const bugs = split(spec.bugs);
    let seed = 7;
    const rnd = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    interface Block {
      r: number;
      c: number;
      k: number;
      x0: number;
      y0: number;
      xf: number;
      yf: number;
      rf: number;
      tum: number;
      d: number;
      dur: number;
      lift: number;
      g: SVGElement;
    }
    const blocks: Block[] = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const g = make('g', { opacity: 0 }, world);
        const label = labels[r * 3 + c] ?? '';
        make(
          'rect',
          {
            x: -66,
            y: -32,
            width: 132,
            height: 64,
            rx: 8,
            class: `pk-shot-blk${bugs.indexOf(label) >= 0 ? ' bug' : ''}`,
          },
          g
        );
        make('text', { x: 0, y: 5, class: 'pk-shot-t' }, g).textContent = label;
        blocks.push({
          r,
          c,
          k: r * 3 + c,
          x0: 1246 + 132 * c,
          y0: 868 - 64 * r,
          xf: 0,
          yf: 0,
          rf: 0,
          tum: 0,
          d: 0,
          dur: 0,
          lift: 0,
          g,
        });
      }
    }
    const slots: Array<{ x: number; y: number; a: number }> = [];
    [1734, 1609, 1484, 1359, 1234, 1109].forEach((x) => slots.push({ x, y: 868, a: 2 }));
    [1672, 1547, 1422, 1297, 1172].forEach((x) => slots.push({ x, y: 810, a: 6 }));
    [1610, 1485, 1360, 1235].forEach((x) => slots.push({ x, y: 752, a: 11 }));
    blocks
      .slice()
      .sort((a, b) => a.r - b.r || b.c - a.c)
      .forEach((b, i) => {
        const slot = slots[i] ?? { x: b.x0, y: b.y0, a: 0 };
        const sign = i % 2 ? 1 : -1;
        b.xf = slot.x;
        b.yf = slot.y;
        b.rf = sign * (slot.a * (0.45 + 0.55 * rnd()));
        b.tum = -sign * (35 + 70 * rnd());
        const dx = Math.abs(b.xf - b.x0);
        const dy = Math.abs(b.yf - b.y0);
        const hit = b.c === 0 && (b.r === 2 || b.r === 3);
        b.d = 40 * b.c + 18 * Math.abs(b.r - 2.5) - (hit ? 9 : 0);
        b.dur = 380 + 0.9 * dx + 0.5 * dy;
        b.lift = (hit ? 130 : 24) + 0.12 * dx + (b.r >= 3 ? 36 : 0);
      });

    /* bola */
    const ball = make('g', { opacity: 0 }, world);
    make('circle', { r: BR, fill: 'url(#pkShotBall)', stroke: '#2F6A4C', 'stroke-width': 3 }, ball);
    make(
      'path',
      {
        d: 'M-14 1 L-4 12 L16 -10',
        fill: 'none',
        stroke: '#fff',
        'stroke-width': 6,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      ball
    );

    /* estilingue (frente) */
    const gFront = make('g', {}, world);
    make('path', { d: `M330 838 Q342 790 ${TIPR.x} ${TIPR.y}`, class: 'pk-shot-wood w16' }, gFront);
    const bandR = make(
      'line',
      { class: 'pk-shot-band', x1: TIPR.x, y1: TIPR.y, x2: REST.x, y2: REST.y },
      gFront
    );

    /* pontilhado da trajetória e poeira */
    const dots: Array<{ t: number; el: SVGElement }> = [];
    for (let i = 0; i < 14; i += 1) {
      dots.push({
        t: T_SNAP + 40 + i * 58,
        el: make('circle', { r: 5, fill: '#C77C8A', opacity: 0 }, world),
      });
    }
    const dust: Array<{ vx: number; vy: number; el: SVGElement }> = [];
    for (let i = 0; i < 9; i += 1) {
      const angle = ((-70 - i * 17) * Math.PI) / 180;
      const speed = 120 + (90 * ((i * 37) % 5)) / 4;
      dust.push({
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        el: make('circle', { r: 10, fill: '#D9BDB8', opacity: 0 }, world),
      });
    }

    const ballAt = (now: number): { x: number; y: number; s: number; rot?: number; a?: number } => {
      if (now < T_SNAP) {
        if (now < T_PULL) return { x: REST.x, y: REST.y, s: clamp((now - T_BALL) / 250) };
        if (now < T_PULLEND) {
          const u = inOut((now - T_PULL) / (T_PULLEND - T_PULL));
          return { x: REST.x + (PULL.x - REST.x) * u, y: REST.y + (PULL.y - REST.y) * u, s: 1 };
        }
        if (now < T_REL) return { x: PULL.x, y: PULL.y, s: 1 };
        const v = Math.pow((now - T_REL) / (T_SNAP - T_REL), 2);
        return { x: PULL.x + (REST.x - PULL.x) * v, y: PULL.y + (REST.y - PULL.y) * v, s: 1 };
      }
      if (now < T_HIT) {
        const t = (now - T_SNAP) / 1000;
        return { x: REST.x + VX * t, y: REST.y + VY * t + 0.5 * G * t * t, s: 1, rot: t * 680 };
      }
      const d = (now - T_HIT) / 1000;
      const y = Math.min(GY - BR, 690 - 190 * d + 0.5 * G * d * d);
      return { x: 1146 - 300 * d, y, s: 1, rot: -d * 500, a: 1 - clamp((d - 0.55) / 0.45) };
    };

    const render = (now: number): void => {
      gStatic.setAttribute('opacity', String(clamp(now / 300)));
      gSling.setAttribute('opacity', String(clamp(now / 300)));

      blocks.forEach((b) => {
        const start = 100 + 35 * b.k;
        let x = b.x0;
        let y = b.y0;
        let rot = 0;
        let opacity = 1;
        if (now < start) opacity = 0;
        else if (now < start + 420) y = b.y0 - 520 * (1 - outBounce((now - start) / 420));
        if (now >= T_HIT + b.d) {
          const t = clamp((now - T_HIT - b.d) / b.dur);
          x = b.x0 + (b.xf - b.x0) * (1 - Math.pow(1 - t, 1.6));
          y = b.y0 + (b.yf - b.y0) * t * t - b.lift * 4 * t * (1 - t);
          rot = b.rf * t + b.tum * Math.sin(t * Math.PI);
          if (t >= 1) {
            const q = (now - T_HIT - b.d - b.dur) / 1000;
            y -= 7 * Math.exp(-q * 14) * Math.abs(Math.sin(q * 22));
          }
        }
        b.g.setAttribute('opacity', String(opacity));
        b.g.setAttribute(
          'transform',
          `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`
        );
      });

      const b0 = ballAt(now);
      let px = b0.x;
      let py = b0.y;
      ball.setAttribute('opacity', String(now < T_BALL ? 0 : (b0.a ?? 1)));
      ball.setAttribute(
        'transform',
        `translate(${b0.x.toFixed(1)} ${b0.y.toFixed(1)}) rotate(${(b0.rot ?? 0).toFixed(1)}) scale(${(b0.s <= 0 ? 0.01 : outBack(b0.s)).toFixed(3)})`
      );
      if (now >= T_SNAP) {
        const dt = (now - T_SNAP) / 1000;
        px = REST.x + 10 * Math.exp(-dt * 9) * Math.sin(dt * 38);
        py = REST.y + 14 * Math.exp(-dt * 9) * Math.cos(dt * 38);
      }
      [bandL, bandR].forEach((band) => {
        band.setAttribute('x2', px.toFixed(1));
        band.setAttribute('y2', py.toFixed(1));
      });

      dots.forEach((dot) => {
        const tt = (dot.t - T_SNAP) / 1000;
        if (dot.t > T_HIT || now < dot.t) {
          dot.el.setAttribute('opacity', '0');
          return;
        }
        dot.el.setAttribute('cx', (REST.x + VX * tt).toFixed(1));
        dot.el.setAttribute('cy', (REST.y + VY * tt + 0.5 * G * tt * tt).toFixed(1));
        dot.el.setAttribute('opacity', Math.max(0, 0.55 - (now - dot.t) / 900).toFixed(2));
      });

      const h = now - T_HIT;
      dust.forEach((p) => {
        if (h < 0 || h > 700) {
          p.el.setAttribute('opacity', '0');
          return;
        }
        const s = h / 1000;
        p.el.setAttribute('cx', (1180 + p.vx * s).toFixed(1));
        p.el.setAttribute('cy', (690 + p.vy * s + 160 * s * s).toFixed(1));
        p.el.setAttribute('r', (8 + 20 * s).toFixed(1));
        p.el.setAttribute('opacity', (0.5 * (1 - h / 700)).toFixed(2));
      });
      const shake = h > 0 && h < 280 ? Math.sin(h * 0.09) * 7 * (1 - h / 280) : 0;
      world.setAttribute('transform', `translate(${shake.toFixed(1)} ${(shake * 0.4).toFixed(1)})`);
    };

    const finish = (): void => {
      if (my !== token) return;
      slide.classList.add('pk-shot-out');
      slide.classList.remove('pk-shot-hold');
      outTimer = window.setTimeout(() => {
        if (my === token) clear();
      }, 560);
    };

    const t0 = performance.now();
    render(0);
    api.frame(() => {
      if (my !== token || !api.alive()) return false;
      const now = performance.now() - t0;
      if (skip || now >= TOTAL) {
        finish();
        return false;
      }
      render(now);
      return true;
    });
  };

  return { play, final: clear };
}
