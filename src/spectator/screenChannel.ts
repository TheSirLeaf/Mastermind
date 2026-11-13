// Mensagens entre a visão do apresentador e a tela exibida (mesmo navegador, via BroadcastChannel).
import type { ChatMessage } from '../live/protocol';

export type ScreenMessage =
  /** Tela exibida → apresentador: "acabei de abrir, me mande tudo". */
  | { type: 'hello' }
  /** Apresentador → tela: a apresentação inteira e o estado atual. */
  | { type: 'init'; html: string; index: number; chatOpen: boolean; messages: ChatMessage[] }
  | { type: 'goto'; index: number }
  | { type: 'chat'; open: boolean; messages: ChatMessage[] };

export const screenChannelName = (code: string): string => `mm-screen-${code}`;
