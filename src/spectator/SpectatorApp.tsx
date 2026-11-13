// spectator/SpectatorApp.tsx
// Tela do espectador (celular): entra na sala com o código e um nome e acompanha a apresentação.
import { Radio, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { LiveClient, type LiveStatus } from '../live/liveClient';
import {
  INITIAL_STATE,
  MAX_NAME,
  MAX_TEXT,
  ROOM_CODE_RE,
  normalizeRoomCode,
  trimMessages,
  type ChatMessage,
  type RoomState,
} from '../live/protocol';
import { roomMessage } from '../live/roomLink';

const NAME_KEY = 'mm-spectator-name';

/** Código vindo do endereço (`/join/ABCDE`). */
function codeFromPath(): string {
  const part = location.pathname.split('/')[2] ?? '';
  return normalizeRoomCode(decodeURIComponent(part));
}

/** O slide que está na tela do apresentador, só para olhar (sem controle). */
function SlideViewer({
  code,
  deckVersion,
  slide,
}: {
  code: string;
  deckVersion: number;
  slide: number;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const slideRef = useRef(slide);
  slideRef.current = slide;

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void fetch(`/api/room/${code}/deck`, { cache: 'no-store' })
      .then((response) =>
        response.ok && response.body
          ? new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text()
          : Promise.reject(new Error('deck'))
      )
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code, deckVersion]);

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ __mm: 'goto', index: slide }, '*');
  }, [slide]);

  return (
    <div
      className="relative aspect-video w-full shrink-0 overflow-hidden bg-black"
      data-testid="slide-viewer"
    >
      {html ? (
        <iframe
          ref={frameRef}
          title="Slide atual"
          srcDoc={html}
          onLoad={() => {
            frameRef.current?.contentWindow?.postMessage(
              { __mm: 'goto', index: slideRef.current },
              '*'
            );
            frameRef.current?.contentWindow?.postMessage(roomMessage(code), '*');
          }}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="grid h-full place-items-center text-xs text-payday-textDim">
          {failed ? 'Não foi possível carregar o slide.' : 'Carregando o slide…'}
        </div>
      )}
    </div>
  );
}

export default function SpectatorApp() {
  const [code, setCode] = useState(codeFromPath);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [room, setRoom] = useState<RoomState>({ ...INITIAL_STATE });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [text, setText] = useState('');
  const clientRef = useRef<LiveClient | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const me = useMemo(() => name.trim(), [name]);

  useEffect(() => {
    document.title = 'Mastermind — Participar';
  }, []);

  useEffect(() => {
    if (!joined) return;
    const client = new LiveClient({
      code,
      hello: { t: 'hello', role: 'spectator', name: me },
      onStatus: setStatus,
      onMessage: (message) => {
        switch (message.t) {
          case 'welcome':
            setRoom(message.state);
            setMessages(message.messages);
            break;
          case 'state':
            setRoom(message.state);
            break;
          case 'chat':
            setMessages((list) => trimMessages([...list, message.message]));
            break;
          case 'chat-deleted':
            setMessages((list) => list.filter((m) => m.id !== message.id));
            break;
          case 'error':
            setNotice(message.message);
            window.setTimeout(() => setNotice(null), 3500);
            break;
          default:
            break;
        }
      },
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [joined, code, me]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const join = (event: FormEvent) => {
    event.preventDefault();
    if (!ROOM_CODE_RE.test(code) || !me) return;
    localStorage.setItem(NAME_KEY, me);
    setJoined(true);
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !chatOn) return;
    clientRef.current?.send({ t: 'chat', text: value });
    setText('');
  };

  if (!joined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-accent" />
          <h1 className="font-serif text-3xl text-accent">Participar</h1>
          <p className="mt-1 text-sm text-payday-textMuted">
            Digite o código que está na tela e o seu nome.
          </p>
        </div>
        <form onSubmit={join} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-payday-textDim">
              Código da apresentação
            </span>
            <input
              aria-label="Código da apresentação"
              value={code}
              onChange={(event) => setCode(normalizeRoomCode(event.target.value).slice(0, 5))}
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              placeholder="ABCDE"
              className="w-full rounded-lg border border-payday-border bg-payday-surface px-3 py-3 text-center font-mono text-2xl uppercase tracking-[0.4em] text-payday-text outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-payday-textDim">
              Seu nome
            </span>
            <input
              aria-label="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, MAX_NAME))}
              autoComplete="nickname"
              placeholder="Como quer aparecer"
              className="w-full rounded-lg border border-payday-border bg-payday-surface px-3 py-3 text-lg text-payday-text outline-none focus:border-accent/60"
            />
          </label>
          <button
            type="submit"
            disabled={!ROOM_CODE_RE.test(code) || !me}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-accent-fg transition disabled:opacity-40"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const waiting = !room.live;
  const chatOn = room.live && room.chat;
  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between border-b border-payday-border px-4 py-3">
        <div>
          <div className="font-mono text-lg tracking-[0.3em] text-accent">{code}</div>
          <div className="text-[11px] text-payday-textDim">Você é {me}</div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            status !== 'open'
              ? 'bg-red-500/20 text-red-300'
              : waiting
                ? 'bg-white/10 text-payday-textMuted'
                : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {status !== 'open' ? 'Reconectando…' : waiting ? 'Aguardando o apresentador' : 'Ao vivo'}
        </span>
      </header>

      {room.live && room.view && room.deck > 0 ? (
        <SlideViewer code={code} deckVersion={room.deck} slide={room.slide} />
      ) : null}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-payday-textDim">
            {!room.live
              ? 'A apresentação foi encerrada ou ainda não começou.'
              : room.chat
                ? 'Nenhuma mensagem ainda. Comece a conversa!'
                : 'O chat abre em alguns slides.'}
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.name === me;
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-accent/20 text-payday-text' : 'bg-white/10 text-payday-text'
                }`}
              >
                {mine ? null : <div className="mb-0.5 text-[11px] text-accent">{m.name}</div>}
                <div className="break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {notice ? <div className="px-4 pb-1 text-center text-xs text-amber-300">{notice}</div> : null}
      <form onSubmit={send} className="flex gap-2 border-t border-payday-border p-3">
        <input
          aria-label="Mensagem"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_TEXT))}
          disabled={!chatOn}
          placeholder={chatOn ? 'Escreva uma mensagem' : 'Chat fechado neste momento'}
          className="min-w-0 flex-1 rounded-full border border-payday-border bg-payday-surface px-4 py-2.5 text-sm text-payday-text outline-none focus:border-accent/60 disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!chatOn || !text.trim()}
          className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-fg transition disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
