import { beforeEach, describe, expect, it } from 'vitest';

import { EDITOR_BRIDGE_SRC } from '../../src/packages/core/pkgHost';

declare global {
  interface Window {
    __MM_EDITOR__?: boolean;
  }
}

function bootEditor(): void {
  document.body.innerHTML = `
    <div id="stage" style="width:1920px;height:1080px">
      <div id="deck">
        <section class="slide active"><p class="lead">Oi</p></section>
        <section class="slide"><p>Outro</p></section>
      </div>
    </div>`;
  new Function(EDITOR_BRIDGE_SRC)();
}

function send(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent('message', { data: { __mm: 'editor', ...data } }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  delete window.__MM_EDITOR__;
});

describe('EDITOR_BRIDGE_SRC', () => {
  it('aplica patch de animação no elemento do path', () => {
    bootEditor();
    send({
      type: 'patch-element',
      path: [0, 0],
      attrs: { 'data-anim': 'fade' },
      classes: { add: ['anim'] },
      style: { '--d': '0.2s', '--anim-duration': '0.5s' },
    });

    const el = document.querySelector('.slide.active p');
    expect(el?.classList.contains('anim')).toBe(true);
    expect(el?.getAttribute('data-anim')).toBe('fade');
    expect((el as HTMLElement).style.getPropertyValue('--d')).toBe('0.2s');
  });

  it('remove classes, atributos e estilos quando o patch manda null', () => {
    bootEditor();
    const el = document.querySelector('.slide.active p') as HTMLElement;
    el.classList.add('anim');
    el.setAttribute('data-anim', 'zoom');
    el.style.setProperty('--d', '1s');

    send({
      type: 'patch-element',
      path: [0, 0],
      attrs: { 'data-anim': null },
      classes: { remove: ['anim'] },
      style: { '--d': null },
    });

    expect(el.classList.contains('anim')).toBe(false);
    expect(el.hasAttribute('data-anim')).toBe(false);
    expect(el.style.getPropertyValue('--d')).toBe('');
  });

  it('reinicia o slide no preview e aplica o estado estático ao parar', () => {
    bootEditor();
    const slide = document.querySelector('.slide.active') as HTMLElement;

    send({ type: 'preview-anim' });
    expect(slide.classList.contains('active')).toBe(true);
    expect(slide.classList.contains('mm-static')).toBe(false);

    send({ type: 'stop-preview' });
    expect(slide.classList.contains('mm-static')).toBe(true);

    send({ type: 'preview-anim' });
    expect(slide.classList.contains('mm-static')).toBe(false);
  });
});
