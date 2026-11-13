import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { INITIAL_STATE, parseClientMessage } from '../../src/live/protocol';
import { roomMessage, roomUrl } from '../../src/live/roomLink';
import { H } from '../../src/packages/core/helper';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { registerBuiltins } from '../../src/packages/index';
import { matrixSvg, qrMatrix } from '../../src/packages/qr/qrMatrix';
import { QrPackage, qrDefaults } from '../../src/packages/qr/QrPackage';
import { QrRenderer, type QrSpec } from '../../src/packages/qr/QrRenderer';
import { qrRuntime } from '../../src/packages/qr/QrRuntime';

const spec = (over: Partial<QrSpec> = {}): QrSpec => ({ ...qrDefaults, ...over });
const api = {
  reduced: false,
  alive: () => true,
  wait: () => Promise.resolve(),
  frame: () => undefined,
};

describe('QR code', () => {
  it('gera a matriz quadrada com o padrão de posição no canto', () => {
    const m = qrMatrix('https://exemplo.com', 'M');
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    expect(m[0]?.startsWith('1111111')).toBe(true);
    // textos maiores pedem matrizes maiores
    expect(qrMatrix('x'.repeat(200), 'M').length).toBeGreaterThan(m.length);
  });

  it('o SVG usa as cores e a borda pedidas', () => {
    const svg = matrixSvg(['10', '01'], '#112233', '#FFEEDD', 3);
    expect(svg).toContain('viewBox="0 0 8 8"');
    expect(svg).toContain('fill="#FFEEDD"');
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain('M3 3h1v1h-1z');
  });

  it('renderiza no tamanho definido; o modo sala fica esmaecido e sem o link no texto', () => {
    const { container } = render(
      <QrRenderer h={H} spec={spec({ text: 'https://a.com', size: 500, showText: true })} />
    );
    const box = container.querySelector('.pk-qr') as HTMLElement;
    expect(box.style.width).toBe('500px');
    expect(box.className).not.toContain('pk-qr-ph');
    expect(container.querySelector('.pk-qr-text')?.textContent).toBe('https://a.com');

    const room = render(<QrRenderer h={H} spec={spec({ roomLink: true, showText: true })} />);
    expect(room.container.querySelector('.pk-qr')?.className).toContain('pk-qr-ph');
    expect(room.container.querySelector('.pk-qr-text')?.textContent).toBe('Link da sala');
  });

  it('está registrado como pacote embutido, com a opção de link da sala', () => {
    const registry = new PackageRegistry();
    registerBuiltins(registry);
    expect(registry.has('qr')).toBe(true);
    const fields = QrPackage.form.flatMap((g) =>
      g.fields.flatMap((f) => (f.type === 'row' ? (f.fields ?? []) : [f])).map((f) => f.k)
    );
    expect(fields).toEqual(expect.arrayContaining(['roomLink', 'text', 'size', 'fg', 'bg', 'ecc']));
  });
});

describe('QR da sala (runtime na apresentação)', () => {
  function mount(room: boolean) {
    const { container } = render(
      <QrRenderer h={H} spec={spec({ roomLink: room, showText: true })} />
    );
    document.body.appendChild(container);
    return container;
  }

  it('troca o exemplo pelo QR real quando chega o link da sala e acompanha mudanças do código', () => {
    const root = mount(true);
    const ctrl = qrRuntime(root, spec({ roomLink: true, showText: true }), api)!;
    const first = roomMessage('ABCDE');
    document.dispatchEvent(new CustomEvent('mm-room', { detail: first }));
    expect(root.querySelector('.pk-qr')?.className).not.toContain('pk-qr-ph');
    expect(root.querySelector('.pk-qr-text')?.textContent).toBe(roomUrl('ABCDE'));
    const svg1 = root.querySelector('.pk-qr-code')?.innerHTML;

    document.dispatchEvent(new CustomEvent('mm-room', { detail: roomMessage('ZZZZ2') }));
    expect(root.querySelector('.pk-qr-text')?.textContent).toBe(roomUrl('ZZZZ2'));
    expect(root.querySelector('.pk-qr-code')?.innerHTML).not.toBe(svg1);

    // depois do final() para de ouvir
    ctrl.final();
    document.dispatchEvent(new CustomEvent('mm-room', { detail: roomMessage('AAAA3') }));
    expect(root.querySelector('.pk-qr-text')?.textContent).toBe(roomUrl('ZZZZ2'));
  });

  it('lê a sala já conhecida ao montar o slide', () => {
    (window as unknown as { __mmRoom?: unknown }).__mmRoom = roomMessage('KKKK4');
    const root = mount(true);
    qrRuntime(root, spec({ roomLink: true, showText: true }), api);
    expect(root.querySelector('.pk-qr-text')?.textContent).toBe(roomUrl('KKKK4'));
    delete (window as unknown as { __mmRoom?: unknown }).__mmRoom;
  });

  it('sem o modo sala não há runtime', () => {
    expect(qrRuntime(mount(false), spec(), api)).toBeNull();
  });

  it('o runtime é autossuficiente (revive fora do bundle, como no export)', () => {
    const revived = new Function(`return (${String(qrRuntime)})`)() as typeof qrRuntime;
    const root = mount(true);
    revived(root, spec({ roomLink: true, showText: true }), api);
    document.dispatchEvent(new CustomEvent('mm-room', { detail: roomMessage('QRQR5') }));
    expect(root.querySelector('.pk-qr-text')?.textContent).toBe(roomUrl('QRQR5'));
  });
});

describe('visão do slide no celular', () => {
  it('estado inicial sem visão e mensagem "view" do apresentador', () => {
    expect(INITIAL_STATE).toMatchObject({ view: false, deck: 0, chat: false, live: false });
    expect(parseClientMessage(JSON.stringify({ t: 'view', on: true }))).toEqual({
      t: 'view',
      on: true,
    });
  });
});
