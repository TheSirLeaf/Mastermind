import { describe, expect, it } from 'vitest';

import {
  MAX_MESSAGES,
  MAX_NAME,
  MAX_TEXT,
  ROOM_CODE_RE,
  generateRoomCode,
  normalizeRoomCode,
  parseClientMessage,
  trimMessages,
} from '../../src/live/protocol';
import { slideHasChat, withSlideChat } from '../../src/packages/core/deck';

describe('código da sala', () => {
  it('gera 5 caracteres sem ambíguos e sempre válidos', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRoomCode();
      expect(code).toMatch(ROOM_CODE_RE);
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it('normaliza o que a pessoa digita', () => {
    expect(normalizeRoomCode(' ab-c2 d ')).toBe('ABC2D');
    expect(ROOM_CODE_RE.test('ABC2D')).toBe(true);
    expect(ROOM_CODE_RE.test('ABCDO')).toBe(false);
  });
});

describe('mensagens do cliente', () => {
  const parse = (value: unknown) => parseClientMessage(JSON.stringify(value));

  it('espectador: nome aparado e limitado; vazio é recusado', () => {
    expect(parse({ t: 'hello', role: 'spectator', name: '  Ana   Maria ' })).toEqual({
      t: 'hello',
      role: 'spectator',
      name: 'Ana Maria',
    });
    expect(parse({ t: 'hello', role: 'spectator', name: '   ' })).toBeNull();
    const long = parse({ t: 'hello', role: 'spectator', name: 'x'.repeat(100) });
    expect(long && 'name' in long ? long.name.length : 0).toBe(MAX_NAME);
  });

  it('apresentador precisa de uma chave', () => {
    expect(parse({ t: 'hello', role: 'presenter', hostKey: 'curta' })).toBeNull();
    expect(parse({ t: 'hello', role: 'presenter', hostKey: 'chave-bem-longa' })).toMatchObject({
      role: 'presenter',
    });
  });

  it('chat: texto limitado e sem quebras; vazio é recusado', () => {
    const msg = parse({ t: 'chat', text: 'a'.repeat(1000) });
    expect(msg && 'text' in msg ? msg.text.length : 0).toBe(MAX_TEXT);
    expect(parse({ t: 'chat', text: '   ' })).toBeNull();
    expect(parse({ t: 'chat', text: 'oi\n\n  tudo bem' })).toEqual({
      t: 'chat',
      text: 'oi tudo bem',
    });
  });

  it('slide e tipos desconhecidos', () => {
    expect(parse({ t: 'slide', index: 3, chat: true })).toEqual({
      t: 'slide',
      index: 3,
      chat: true,
    });
    expect(parse({ t: 'slide', index: -1, chat: true })).toBeNull();
    expect(parse({ t: 'slide', index: 1.5, chat: true })).toBeNull();
    expect(parse({ t: 'explodir' })).toBeNull();
    expect(parseClientMessage('não é json')).toBeNull();
    expect(parseClientMessage('x'.repeat(5000))).toBeNull();
    expect(parseClientMessage(42)).toBeNull();
  });

  it('mantém só as últimas mensagens', () => {
    const list = Array.from({ length: MAX_MESSAGES + 20 }, (_, i) => ({
      id: String(i),
      name: 'a',
      text: 'b',
      ts: i,
    }));
    const trimmed = trimMessages(list);
    expect(trimmed).toHaveLength(MAX_MESSAGES);
    expect(trimmed[0]?.id).toBe('20');
  });
});

describe('chat por slide', () => {
  it('marca e desmarca o slide', () => {
    const html = '<section class="slide dark" data-notes=""><h2>x</h2></section>';
    expect(slideHasChat(html)).toBe(false);
    const on = withSlideChat(html, true);
    expect(slideHasChat(on)).toBe(true);
    expect(slideHasChat(withSlideChat(on, false))).toBe(false);
  });
});
