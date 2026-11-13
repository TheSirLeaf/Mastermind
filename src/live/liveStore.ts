// live/liveStore.ts
// Estado da sala ao vivo do lado do apresentador.
import { create } from 'zustand';

import { LiveClient, type LiveStatus } from './liveClient';
import {
  generateRoomCode,
  INITIAL_STATE,
  trimMessages,
  type ChatMessage,
  type RoomState,
  type ServerMessage,
} from './protocol';

interface LiveState {
  code: string | null;
  status: LiveStatus | 'off';
  room: RoomState;
  spectators: number;
  messages: ChatMessage[];
  error: string | null;
  /** Começa a sala (gera o código) e conecta como apresentador. */
  start: () => void;
  stop: () => void;
  sendSlide: (index: number, chat: boolean) => void;
  setView: (on: boolean) => void;
  publishDeck: (html: string) => Promise<boolean>;
  setChatOpen: (open: boolean) => void;
  deleteMessage: (id: string) => void;
}

let client: LiveClient | null = null;
let currentHostKey = '';
let lastSlide: { index: number; chat: boolean } | null = null;
let viewWanted = false;

function hostKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const useLiveStore = create<LiveState>()((set, get) => ({
  code: null,
  status: 'off',
  room: { ...INITIAL_STATE },
  spectators: 0,
  messages: [],
  error: null,

  start: () => {
    if (client) return;
    const code = generateRoomCode();
    currentHostKey = hostKey();
    lastSlide = null;
    viewWanted = false;
    set({
      code,
      status: 'connecting',
      room: { ...INITIAL_STATE },
      spectators: 0,
      messages: [],
      error: null,
    });
    client = new LiveClient({
      code,
      hello: { t: 'hello', role: 'presenter', hostKey: currentHostKey },
      onStatus: (status) => {
        set({ status });
        // Depois de (re)conectar, a sala precisa saber de novo onde estamos e se o slide é visível.
        if (status === 'open') {
          if (lastSlide) client?.send({ t: 'slide', ...lastSlide });
          if (viewWanted) client?.send({ t: 'view', on: true });
        }
      },
      onMessage: (message: ServerMessage) => {
        switch (message.t) {
          case 'welcome':
            set({
              room: message.state,
              messages: message.messages,
              spectators: message.spectators,
            });
            break;
          case 'state':
            set({ room: message.state });
            break;
          case 'chat':
            set({ messages: trimMessages([...get().messages, message.message]) });
            break;
          case 'chat-deleted':
            set({ messages: get().messages.filter((m) => m.id !== message.id) });
            break;
          case 'spectators':
            set({ spectators: message.count });
            break;
          case 'error':
            set({ error: message.message });
            break;
        }
      },
    });
    client.connect();
  },

  stop: () => {
    client?.close();
    client = null;
    lastSlide = null;
    viewWanted = false;
    set({ code: null, status: 'off', spectators: 0, messages: [], room: { ...INITIAL_STATE } });
  },

  sendSlide: (index, chat) => {
    lastSlide = { index, chat };
    client?.send({ t: 'slide', index, chat });
  },
  setView: (on) => {
    viewWanted = on;
    client?.send({ t: 'view', on });
  },
  /** Publica o deck (comprimido) para os espectadores verem o slide no celular. */
  publishDeck: async (html) => {
    const code = get().code;
    if (!code) return false;
    const stream = new Blob([html]).stream().pipeThrough(new CompressionStream('gzip'));
    const body = await new Response(stream).arrayBuffer();
    const response = await fetch(`/api/room/${code}/deck`, {
      method: 'PUT',
      headers: { 'x-host-key': currentHostKey },
      body,
    });
    return response.ok;
  },
  setChatOpen: (open) => {
    set({ room: { ...get().room, chat: open } });
    client?.send({ t: 'chat-open', open });
  },
  deleteMessage: (id) => client?.send({ t: 'chat-delete', id }),
}));
