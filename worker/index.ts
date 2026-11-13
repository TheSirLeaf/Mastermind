// worker/index.ts
// Worker do Mastermind: só cuida de `/api/*` (salas ao vivo). O resto do site é servido pelos
// arquivos estáticos (`assets` no wrangler.jsonc) sem passar por aqui.
import { ROOM_CODE_RE } from '../src/live/protocol';

import { Room } from './room';

export { Room };

interface Env {
  ROOM: DurableObjectNamespace;
}

const ROOM_PATH = /^\/api\/room\/([^/]+)\/(ws|deck)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    const match = ROOM_PATH.exec(url.pathname);
    if (match) {
      const code = (match[1] ?? '').toUpperCase();
      if (!ROOM_CODE_RE.test(code)) {
        return Response.json({ error: 'Código de sala inválido.' }, { status: 400 });
      }
      if (match[2] === 'deck') {
        return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request);
      }
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Esperava uma conexão WebSocket.', { status: 426 });
      }
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request);
    }

    return Response.json({ error: 'Não encontrado.' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
