// worker/room.ts
// Sala ao vivo: um Durable Object por código. Usa a API de hibernação (o objeto dorme sem
// conexões ativas), então o estado fica no storage e a identidade de cada conexão no "attachment".
import { DurableObject } from 'cloudflare:workers';

import {
  CHAT_COOLDOWN_MS,
  INITIAL_STATE,
  MAX_DECK_BYTES,
  parseClientMessage,
  trimMessages,
  type ChatMessage,
  type ErrorCode,
  type Role,
  type RoomState,
  type ServerMessage,
} from '../src/live/protocol';

interface Attachment {
  role: Role | null;
  id: string;
  name: string;
  lastChat: number;
}

type RoomEnv = Record<string, unknown>;

export class Room extends DurableObject<RoomEnv> {
  private state: RoomState | null = null;
  private messages: ChatMessage[] | null = null;

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname.endsWith('/deck')) return this.deck(request);
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Esperava uma conexão WebSocket.', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    const attachment: Attachment = { role: null, id: crypto.randomUUID(), name: '', lastChat: 0 };
    server.serializeAttachment(attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const msg = parseClientMessage(data);
    if (!msg) return this.fail(ws, 'bad-request', 'Mensagem inválida.');
    const att = ws.deserializeAttachment() as Attachment;

    if (msg.t === 'hello') {
      if (att.role) return this.fail(ws, 'bad-request', 'Você já entrou na sala.');
      if (msg.role === 'presenter') return this.presenterHello(ws, att, msg.hostKey);
      att.role = 'spectator';
      att.name = msg.name;
      ws.serializeAttachment(att);
      this.send(ws, {
        t: 'welcome',
        role: 'spectator',
        state: await this.getState(),
        messages: await this.getMessages(),
        spectators: this.count('spectator'),
      });
      this.broadcast({ t: 'spectators', count: this.count('spectator') }, 'presenter');
      return;
    }

    if (!att.role) return this.fail(ws, 'not-ready', 'Entre na sala primeiro.');

    if (att.role === 'presenter') {
      if (msg.t === 'slide' || msg.t === 'chat-open' || msg.t === 'view') {
        const state = await this.getState();
        const next: RoomState =
          msg.t === 'slide'
            ? { ...state, slide: msg.index, chat: msg.chat }
            : msg.t === 'view'
              ? { ...state, view: msg.on }
              : { ...state, chat: msg.open };
        await this.setState(next);
        this.broadcast({ t: 'state', state: next });
        return;
      }
      if (msg.t === 'chat-delete') {
        const messages = (await this.getMessages()).filter((m) => m.id !== msg.id);
        await this.setMessages(messages);
        this.broadcast({ t: 'chat-deleted', id: msg.id });
        return;
      }
      return this.fail(ws, 'forbidden', 'Ação de espectador.');
    }

    // Espectador: só pode conversar.
    if (msg.t !== 'chat') return this.fail(ws, 'forbidden', 'Só o apresentador pode fazer isso.');
    const state = await this.getState();
    if (!state.chat) return this.fail(ws, 'chat-closed', 'O chat não está aberto agora.');
    const now = Date.now();
    if (now - att.lastChat < CHAT_COOLDOWN_MS) {
      return this.fail(ws, 'rate-limit', 'Calma: espere um instante para enviar de novo.');
    }
    att.lastChat = now;
    ws.serializeAttachment(att);
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      name: att.name,
      text: msg.text,
      ts: now,
    };
    await this.setMessages(trimMessages([...(await this.getMessages()), message]));
    this.broadcast({ t: 'chat', message });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.afterClose(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.afterClose(ws);
  }

  /* ---------------- internos ---------------- */

  /** Deck publicado para os espectadores: o apresentador envia (PUT) e a plateia baixa (GET). */
  private async deck(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      const meta = await this.ctx.storage.get<{ chunks: number }>('deckMeta');
      if (!meta) return new Response('Sem deck publicado.', { status: 404 });
      const parts: Uint8Array[] = [];
      for (let i = 0; i < meta.chunks; i += 1) {
        const part = await this.ctx.storage.get<Uint8Array>(`deck:${i}`);
        if (part) parts.push(part);
      }
      return new Response(new Blob(parts), {
        headers: {
          // gzip "cru": o navegador descomprime (DecompressionStream); evita dupla codificação na borda.
          'Content-Type': 'application/gzip',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (request.method !== 'PUT') return new Response('Método não permitido.', { status: 405 });
    const stored = await this.ctx.storage.get<string>('hostKey');
    if (!stored || request.headers.get('x-host-key') !== stored) {
      return new Response('Só o apresentador da sala pode publicar.', { status: 403 });
    }
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength === 0 || body.byteLength > MAX_DECK_BYTES) {
      return new Response('Tamanho inválido.', { status: 413 });
    }
    const CHUNK = 900 * 1024;
    const chunks = Math.ceil(body.byteLength / CHUNK);
    for (let i = 0; i < chunks; i += 1) {
      await this.ctx.storage.put(`deck:${i}`, body.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await this.ctx.storage.put('deckMeta', { chunks });
    const state = await this.getState();
    const next: RoomState = { ...state, deck: state.deck + 1 };
    await this.setState(next);
    this.broadcast({ t: 'state', state: next });
    return Response.json({ ok: true, deck: next.deck });
  }

  private async presenterHello(ws: WebSocket, att: Attachment, hostKey: string): Promise<void> {
    const stored = await this.ctx.storage.get<string>('hostKey');
    if (stored && stored !== hostKey) {
      this.fail(ws, 'forbidden', 'Esta sala já tem outro apresentador.');
      ws.close(4003, 'forbidden');
      return;
    }
    if (!stored) await this.ctx.storage.put('hostKey', hostKey);
    att.role = 'presenter';
    ws.serializeAttachment(att);
    const state: RoomState = { ...(await this.getState()), live: true };
    await this.setState(state);
    this.send(ws, {
      t: 'welcome',
      role: 'presenter',
      state,
      messages: await this.getMessages(),
      spectators: this.count('spectator'),
    });
    this.broadcast({ t: 'state', state }, 'spectator');
  }

  private async afterClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att?.role === 'presenter') {
      const stillThere = this.ctx.getWebSockets().some((other) => {
        if (other === ws) return false;
        const a = other.deserializeAttachment() as Attachment | null;
        return a?.role === 'presenter';
      });
      if (!stillThere) {
        // Sem apresentador a sala se encerra: o chat e a visão do slide fecham para todos.
        const state: RoomState = {
          ...(await this.getState()),
          live: false,
          chat: false,
          view: false,
        };
        await this.setState(state);
        this.broadcast({ t: 'state', state }, 'spectator');
      }
    } else if (att?.role === 'spectator') {
      this.broadcast({ t: 'spectators', count: this.count('spectator', ws) }, 'presenter');
    }
  }

  private count(role: Role, except?: WebSocket): number {
    return this.ctx.getWebSockets().filter((ws) => {
      if (ws === except) return false;
      const a = ws.deserializeAttachment() as Attachment | null;
      return a?.role === role;
    }).length;
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Conexão já caiu: o webSocketClose cuida.
    }
  }

  private broadcast(message: ServerMessage, only?: Role): void {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a?.role) continue;
      if (only && a.role !== only) continue;
      this.send(ws, message);
    }
  }

  private fail(ws: WebSocket, code: ErrorCode, message: string): void {
    this.send(ws, { t: 'error', code, message });
  }

  private async getState(): Promise<RoomState> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<RoomState>('state')) ?? { ...INITIAL_STATE };
    }
    return this.state;
  }

  private async setState(state: RoomState): Promise<void> {
    this.state = state;
    await this.ctx.storage.put('state', state);
  }

  private async getMessages(): Promise<ChatMessage[]> {
    if (!this.messages) {
      this.messages = (await this.ctx.storage.get<ChatMessage[]>('messages')) ?? [];
    }
    return this.messages;
  }

  private async setMessages(messages: ChatMessage[]): Promise<void> {
    this.messages = messages;
    await this.ctx.storage.put('messages', messages);
  }
}
