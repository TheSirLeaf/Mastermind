import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FILL,
  DEFAULT_FX,
  FX_PROPS,
  isEmptyFx,
  parseReflect,
  parseTextFx,
  reflectToCss,
  textFxToCss,
  textFxToNestedCss,
  withAlpha,
  type TextFx,
} from '../../src/editor/textFx';

const fx = (patch: Partial<TextFx>): TextFx => ({ ...structuredClone(DEFAULT_FX), ...patch });

describe('efeitos de texto', () => {
  it('sem efeito: toda propriedade controlada sai (null)', () => {
    const css = textFxToCss(DEFAULT_FX);
    expect(Object.keys(css).sort()).toEqual([...FX_PROPS].sort());
    expect(Object.values(css).every((v) => v === null)).toBe(true);
    expect(isEmptyFx(DEFAULT_FX)).toBe(true);
  });

  it('cor sólida com opacidade vira rgba', () => {
    expect(withAlpha('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(withAlpha('#ff0000', 1)).toBe('#FF0000');
    const css = textFxToCss(fx({ fill: { ...DEFAULT_FILL, color: '#336699', opacity: 0.25 } }));
    expect(css.color).toBe('rgba(51, 102, 153, 0.25)');
    expect(css['background-image']).toBeNull();
  });

  it('gradiente: várias cores ordenadas, recorte no texto e folga para o itálico não cortar', () => {
    const css = textFxToCss(
      fx({
        fill: {
          ...DEFAULT_FILL,
          kind: 'gradient',
          gradient: {
            type: 'linear',
            angle: 45,
            stops: [
              { color: '#00FF00', at: 100 },
              { color: '#FF0000', at: 0 },
              { color: '#0000FF', at: 50 },
            ],
          },
        },
      })
    );
    expect(css['background-image']).toBe(
      'linear-gradient(45deg, #FF0000 0%, #0000FF 50%, #00FF00 100%)'
    );
    expect(css['-webkit-background-clip']).toBe('text');
    expect(css['-webkit-text-fill-color']).toBe('transparent');
    // folga compensada: a caixa cresce, o texto não sai do lugar
    expect(css.padding).toBe('0.1em 0.2em');
    expect(css.margin).toBe('0 -0.2em');
    expect(css['box-decoration-break']).toBe('clone');
  });

  it('gradiente radial', () => {
    const css = textFxToCss(
      fx({
        fill: {
          ...DEFAULT_FILL,
          kind: 'gradient',
          gradient: { ...DEFAULT_FILL.gradient, type: 'radial' },
        },
      })
    );
    expect(css['background-image']).toMatch(/^radial-gradient\(circle at center, /);
  });

  it('brilho animado usa variáveis e a cor de base', () => {
    const css = textFxToCss(
      fx({
        fill: {
          ...DEFAULT_FILL,
          kind: 'shine',
          color: '#C77C8A',
          shine: { color: '#FFFFFF', seconds: 2, width: 20, angle: 100 },
        },
      })
    );
    expect(css.color).toBe('#C77C8A');
    expect(css['--mm-shine-t']).toBe('2s');
    expect(css['--mm-shine-w']).toBe('20%');
    expect(css['--mm-shine-a']).toBe('100deg');
    expect(css['background-image']).toBeNull();
  });

  it('contorno por fora usa paint-order; sombras em camadas', () => {
    const css = textFxToCss(
      fx({
        stroke: { width: 3, color: '#000000', opacity: 0.5, outside: true },
        shadows: [
          { x: 1, y: 2, blur: 3, color: '#FF0000', opacity: 1 },
          { x: 0, y: 0, blur: 10, color: '#00FF00', opacity: 0.5 },
        ],
      })
    );
    expect(css['-webkit-text-stroke']).toBe('3px rgba(0, 0, 0, 0.5)');
    expect(css['paint-order']).toBe('stroke fill');
    expect(css['text-shadow']).toBe('1px 2px 3px #FF0000, 0px 0px 10px rgba(0, 255, 0, 0.5)');
  });

  it('marca-texto, espaço, maiúsculas e opacidade', () => {
    const css = textFxToCss(
      fx({
        highlight: { color: '#FFFF00', opacity: 0.4, radius: 0.2, pad: 0.3 },
        spacing: 0.1,
        transform: 'uppercase',
        opacity: 0.5,
      })
    );
    expect(css['box-shadow']).toBe('inset 0 0 0 100em rgba(255, 255, 0, 0.4)');
    expect(css.padding).toBe('0.15em 0.3em');
    expect(css['letter-spacing']).toBe('0.1em');
    expect(css['text-transform']).toBe('uppercase');
    expect(css.opacity).toBe('0.5');
  });

  it('trecho dentro de outro com efeito: neutraliza o que é herdado', () => {
    const css = textFxToNestedCss(DEFAULT_FX);
    expect(css['-webkit-text-fill-color']).toBe('currentcolor');
    expect(css['text-shadow']).toBe('none');
    expect(css['-webkit-text-stroke']).toBe('0 transparent');
    // o que não é herdado continua só removido
    expect(css['background-image']).toBeNull();
  });

  it('o JSON guardado volta igual e campos inválidos caem no padrão', () => {
    const full = fx({
      fill: { ...DEFAULT_FILL, kind: 'gradient' },
      stroke: { width: 2, color: '#111111', opacity: 1, outside: false },
      shadows: [{ x: 1, y: 1, blur: 1, color: '#000000', opacity: 1 }],
      spacing: 0.05,
      transform: 'capitalize',
    });
    expect(parseTextFx(JSON.stringify(full))).toEqual(full);
    expect(parseTextFx('lixo')).toEqual(DEFAULT_FX);
    expect(
      parseTextFx('{"fill":{"kind":"gradient","gradient":{"stops":[]}}}').fill?.gradient.stops
    ).toHaveLength(2);
  });

  it('sombra com gradiente vira drop-shadow (não aparece através da letra)', () => {
    const css = textFxToCss(
      fx({
        fill: { ...DEFAULT_FILL, kind: 'gradient' },
        shadows: [{ x: 2, y: 4, blur: 10, color: '#000000', opacity: 1 }],
      })
    );
    expect(css['text-shadow']).toBeNull();
    expect(css.filter).toBe('drop-shadow(2px 4px 5px #000000)');
  });

  it('reflexo', () => {
    expect(reflectToCss(null)).toBeNull();
    expect(reflectToCss({ side: 'below', gap: 4, opacity: 0.3, fade: 40 })).toBe(
      'below 4px linear-gradient(transparent 40%, rgba(255, 255, 255, 0.3))'
    );
    expect(parseReflect('{"side":"left","gap":2}')).toEqual({
      side: 'left',
      gap: 2,
      opacity: 0.3,
      fade: 40,
    });
  });
});
