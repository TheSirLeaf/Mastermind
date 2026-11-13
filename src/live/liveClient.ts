// live/liveClient.ts
// Conexão WebSocket com a sala ao vivo (apresentador ou espectador), com reconexão automática.
import type { ClientMessage, ServerMessage } from './protocol';

export type LiveStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface LiveClientOptions {
  code: string;
  /** Mensagem enviada ao conectar (e a cada reconexão): quem sou eu. */
  hello: ClientMessage;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: LiveStatus) => void;
}

export function roomSocketUrl(code: string): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/api/room/${code}/ws`;
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private queue: ClientMessage[] = [];

  constructor(private readonly options: LiveClientOptions) {}

  connect(): void {
    this.stopped = false;
    this.options.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(roomSocketUrl(this.options.code));
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      this.raw(this.options.hello);
      for (const message of this.queue.splice(0)) this.raw(message);
      this.options.onStatus('open');
    };
    ws.onmessage = (event) => {
      try {
        this.options.onMessage(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        // Mensagem ilegível: ignora.
      }
    };
    ws.onclose = (event) => {
      this.ws = null;
      // 4003: o servidor recusou (outro apresentador); não adianta tentar de novo.
      if (this.stopped || event.code === 4003) {
        this.options.onStatus('closed');
        return;
      }
      this.attempts += 1;
      this.options.onStatus('reconnecting');
      const delay = Math.min(8000, 500 * 2 ** Math.min(this.attempts, 4));
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  /** Envia (ou guarda para enviar quando a conexão voltar). */
  send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.raw(message);
    else this.queue = [...this.queue.filter((m) => m.t !== message.t), message];
  }

  close(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this.options.onStatus('closed');
  }

  private raw(message: ClientMessage): void {
    this.ws?.send(JSON.stringify(message));
  }
}
