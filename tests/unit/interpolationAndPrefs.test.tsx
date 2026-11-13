import { PresentationPrefsModal } from '@components/Stage/PresentationPrefsModal';
import { createDefaultDeck, presentationSettings, SLIDE_TRANSITIONS } from '@packages/core/deck';
import { buildPresentationHTML, NAV_SCRIPT } from '@packages/core/export';
import { parseDeckHTML } from '@packages/core/importDeck';
import {
  keyframesEnd,
  keyframesPatch,
  normalizeKeyframe,
  normalizeKeyframes,
  readKeyframes,
} from '@packages/core/keyframes';
import { PackageRegistry } from '@packages/core/PackageRegistry';
import { PKG_HOST_SRC } from '@packages/core/pkgHost';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeckStore } from '../../src/store/deckStore';
import { useUIStore } from '../../src/stores/uiStore';

describe('keyframes (interpolação no slide)', () => {
  it('normaliza valores e ordena por tempo', () => {
    const k = normalizeKeyframe({ t: -3, x: 99999, s: 0, o: 5, ease: 'xyz' });
    expect(k).toMatchObject({ t: 0, x: 4000, s: 0.01, o: 1, ease: 'ease-in-out' });
    const list = normalizeKeyframes([{ t: 2 }, { t: 0.5 }]);
    expect(list.map((x) => x.t)).toEqual([0.5, 2]);
    expect(keyframesEnd(list)).toBe(2);
  });

  it('grava e lê do atributo data-kf; lista vazia remove o atributo', () => {
    const el = document.createElement('div');
    const patch = keyframesPatch([normalizeKeyframe({ t: 1, x: 40 })]);
    el.setAttribute('data-kf', patch.attrs?.['data-kf'] ?? '');
    expect(readKeyframes(el)[0]).toMatchObject({ t: 1, x: 40 });
    expect(keyframesPatch([]).attrs).toEqual({ 'data-kf': null });
    el.setAttribute('data-kf', 'lixo');
    expect(readKeyframes(el)).toEqual([]);
  });
});

describe('host da apresentação executa os keyframes', () => {
  interface Call {
    frames: Array<Record<string, unknown>>;
    options: { duration: number; fill: string };
    paused: boolean;
    played: boolean;
    finished: boolean;
  }

  function runHost(): { calls: Call[]; slide: HTMLElement } {
    const calls: Call[] = [];
    const proto = Element.prototype as unknown as Record<string, unknown>;
    proto.getAnimations = () => [];
    proto.animate = function (frames: Array<Record<string, unknown>>, options: Call['options']) {
      const call: Call = { frames, options, paused: false, played: false, finished: false };
      calls.push(call);
      return {
        id: '',
        currentTime: 0,
        pause: () => {
          call.paused = true;
        },
        play: () => {
          call.played = true;
        },
        finish: () => {
          call.finished = true;
        },
        cancel: () => undefined,
      };
    };
    (window as unknown as { __MM_HOST__?: boolean | undefined }).__MM_HOST__ = undefined;
    new Function(PKG_HOST_SRC)();
    document.body.innerHTML =
      '<section class="slide active"><div id="a" style="translate: 10px 20px" data-kf=\'[{"t":1,"x":100,"y":0,"s":2,"r":45,"o":0.5,"ease":"linear"},{"t":3,"x":0,"y":0,"s":1,"r":0,"o":1}]\'></div></section>';
    const slide = document.querySelector('.slide') as HTMLElement;
    (window as unknown as { __anim: (s: HTMLElement) => void }).__anim(slide);
    return { calls, slide };
  }

  it('monta uma animação pausada, com offsets relativos e valores somados ao estado natural', () => {
    const { calls } = runHost();
    expect(calls).toHaveLength(1);
    const call = calls[0] as Call;
    expect(call.options.duration).toBe(3000);
    expect(call.options.fill).toBe('both');
    expect(call.paused).toBe(true);
    expect(call.played).toBe(true); // o host dá play() logo depois de montar
    // primeiro keyframe em t=1: antes dele o elemento fica parado no estado natural
    expect(call.frames[0]).toMatchObject({
      offset: 0,
      translate: '10px 20px',
      scale: 1,
      opacity: 1,
    });
    expect(call.frames[1]).toMatchObject({
      offset: 1 / 3,
      translate: '110px 20px',
      scale: 2,
      rotate: '45deg',
      opacity: 0.5,
      easing: 'linear',
    });
    expect(call.frames[2]).toMatchObject({ offset: 1, translate: '10px 20px', scale: 1 });
  });

  it('só anima o que os keyframes usam (a entrada com fade do elemento continua valendo)', () => {
    const calls: Array<{ frames: Array<Record<string, unknown>> }> = [];
    const proto = Element.prototype as unknown as Record<string, unknown>;
    proto.getAnimations = () => [];
    proto.animate = function (frames: Array<Record<string, unknown>>) {
      calls.push({ frames });
      return {
        id: '',
        currentTime: 0,
        pause: () => undefined,
        play: () => undefined,
        finish: () => undefined,
        cancel: () => undefined,
      };
    };
    (window as unknown as { __MM_HOST__?: boolean | undefined }).__MM_HOST__ = undefined;
    new Function(PKG_HOST_SRC)();
    document.body.innerHTML = `<section class="slide active"><div data-kf='[{"t":1,"x":50,"y":0},{"t":2,"x":0,"y":0}]'></div></section>`;
    (window as unknown as { __anim: (s: Element) => void }).__anim(
      document.querySelector('.slide') as Element
    );
    const frame = calls[0]?.frames[1] as Record<string, unknown>;
    expect(frame).toHaveProperty('translate');
    expect(frame).not.toHaveProperty('opacity');
    expect(frame).not.toHaveProperty('rotate');
    expect(frame).not.toHaveProperty('scale');
  });

  it('sai do slide com o estado final (para imprimir)', () => {
    const { calls } = runHost();
    window.dispatchEvent(new Event('beforeprint'));
    expect((calls[0] as Call).finished).toBe(true);
  });
});

describe('transição Interpolar', () => {
  it('existe como opção e o script de navegação a executa', () => {
    expect(SLIDE_TRANSITIONS).toContain('morph');
    expect(NAV_SCRIPT).toContain("tr === 'morph'");
    expect(NAV_SCRIPT).toContain('data-name');
    expect(NAV_SCRIPT).not.toMatch(/\\\\b/);
  });
});

describe('preferências da apresentação', () => {
  beforeEach(() => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useUIStore.setState({ isPrefsOpen: true });
  });

  it('padrões: barra ligada, modo padrão, ao vivo desligado', () => {
    expect(presentationSettings({})).toEqual({
      progressBar: true,
      mode: 'standard',
      live: false,
      spectatorView: false,
    });
  });

  it('desligar a barra esconde-a na apresentação exportada', () => {
    const deck = createDefaultDeck();
    const registry = new PackageRegistry();
    const template = '<html><head></head><body>{{SLIDES}}{{NAV}}</body></html>';
    expect(buildPresentationHTML({ template, deck, registry })).not.toContain('mm-prefs');
    const off = buildPresentationHTML({
      template,
      deck: { ...deck, settings: { progressBar: false } },
      registry,
    });
    expect(off).toContain('id="mm-prefs"');
    expect(off).toContain('.progress{display:none!important}');
  });

  it('as preferências sobrevivem a exportar e reabrir', () => {
    const deck = { ...createDefaultDeck(), settings: { progressBar: false, live: true } };
    const html = buildPresentationHTML({
      template: '<html><head></head><body><div id="deck">{{SLIDES}}</div>{{NAV}}</body></html>',
      deck,
      registry: new PackageRegistry(),
    });
    expect(parseDeckHTML(html).settings).toEqual({ progressBar: false, live: true });
  });

  it('o painel altera as preferências do deck', () => {
    render(<PresentationPrefsModal />);
    fireEvent.click(screen.getByRole('switch', { name: 'Barra de progresso' }));
    expect(presentationSettings(useDeckStore.getState().deck).progressBar).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Interação ao vivo' }));
    expect(presentationSettings(useDeckStore.getState().deck).live).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Áreas/ }));
    expect(presentationSettings(useDeckStore.getState().deck).mode).toBe('areas');
    fireEvent.click(screen.getByRole('button', { name: /Padrão/ }));
    expect(presentationSettings(useDeckStore.getState().deck).mode).toBe('standard');
    vi.restoreAllMocks();
  });
});
