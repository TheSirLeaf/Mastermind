// live/protocol.ts
// Protocolo das salas ao vivo (apresentador ↔ espectadores). Compartilhado entre o app e o Worker
// (`worker/`), por isso não importa nada do React nem do navegador.

/** Código da sala: 5 letras/números sem caracteres ambíguos (0/O, 1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

export const MAX_NAME = 24;
export const MAX_TEXT = 280;
export const MAX_MESSAGES = 100;
/** Intervalo mínimo entre duas mensagens do mesmo espectador (ms). */
export const CHAT_COOLDOWN_MS = 800;

export function generateRoomCode(random: (n: number) => number = defaultRandom): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[random(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function defaultRandom(max: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) % max;
}

/** Normaliza o que a pessoa digitou ("abc-12 " → "ABC12"). */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: number;
}

/** Estado da sala que todos acompanham. */
export interface RoomState {
  /** Slide atual (0 = primeiro). */
  slide: number;
  /** O chat está aberto para os espectadores. */
  chat: boolean;
  /** Há um apresentador conectado. */
  live: boolean;
}

export const INITIAL_STATE: RoomState = { slide: 0, chat: false, live: false };

export type Role = 'presenter' | 'spectator';

/** Cliente → servidor. */
export type ClientMessage =
  | { t: 'hello'; role: 'presenter'; hostKey: string }
  | { t: 'hello'; role: 'spectator'; name: string }
  | { t: 'slide'; index: number; chat: boolean }
  | { t: 'chat-open'; open: boolean }
  | { t: 'chat'; text: string }
  | { t: 'chat-delete'; id: string };

/** Servidor → cliente. */
export type ServerMessage =
  | {
      t: 'welcome';
      role: Role;
      state: RoomState;
      messages: ChatMessage[];
      spectators: number;
    }
  | { t: 'state'; state: RoomState }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'chat-deleted'; id: string }
  | { t: 'spectators'; count: number }
  | { t: 'error'; code: ErrorCode; message: string };

export type ErrorCode = 'bad-request' | 'forbidden' | 'chat-closed' | 'rate-limit' | 'not-ready';

/** Nome do espectador: sem quebras de linha, aparado e limitado. */
export function cleanName(input: unknown): string {
  return typeof input === 'string' ? input.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '';
}

/** Texto do chat: aparado e limitado; vazio é inválido. */
export function cleanText(input: unknown): string {
  return typeof input === 'string' ? input.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
}

/** Interpreta uma mensagem recebida (JSON) do cliente; `null` se for inválida. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string' || raw.length > 4000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  switch (m.t) {
    case 'hello':
      if (m.role === 'presenter' && typeof m.hostKey === 'string' && m.hostKey.length >= 8) {
        return { t: 'hello', role: 'presenter', hostKey: m.hostKey.slice(0, 80) };
      }
      if (m.role === 'spectator') {
        const name = cleanName(m.name);
        return name ? { t: 'hello', role: 'spectator', name } : null;
      }
      return null;
    case 'slide':
      return typeof m.index === 'number' && Number.isInteger(m.index) && m.index >= 0
        ? { t: 'slide', index: Math.min(m.index, 9999), chat: m.chat === true }
        : null;
    case 'chat-open':
      return { t: 'chat-open', open: m.open === true };
    case 'chat': {
      const text = cleanText(m.text);
      return text ? { t: 'chat', text } : null;
    }
    case 'chat-delete':
      return typeof m.id === 'string' ? { t: 'chat-delete', id: m.id.slice(0, 64) } : null;
    default:
      return null;
  }
}

/** Mantém só as últimas mensagens. */
export function trimMessages(list: ChatMessage[]): ChatMessage[] {
  return list.length > MAX_MESSAGES ? list.slice(list.length - MAX_MESSAGES) : list;
}
