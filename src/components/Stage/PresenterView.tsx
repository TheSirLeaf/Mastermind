// Visão do apresentador (interação ao vivo ligada): o slide atual, o próximo, as notas, o chat da
// plateia e o código da sala. A tela exibida ao público fica em outra janela (`/screen/CODE`).
import { slideHasChat, slideNotes } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { MonitorUp, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLiveStore } from '../../live/liveStore';
import { screenChannelName, type ScreenMessage } from '../../spectator/screenChannel';

import { buildFrameHTML } from './presentationFrame';

const pad = (n: number): string => String(n).padStart(2, '0');

export function PresenterView() {
  const deck = useDeckStore((state) => state.deck);
  const startIndex = useDeckStore((state) => state.currentIndex);
  const setPresenting = useUIStore((state) => state.setPresenting);
  const setPreviewMode = useUIStore((state) => state.setPreviewMode);
  const live = useLiveStore();
  const [html, setHtml] = useState<string | null>(null);
  const [index, setIndex] = useState(Math.min(startIndex, deck.slides.length - 1));
  const [seconds, setSeconds] = useState(0);
  const mainRef = useRef<HTMLIFrameElement>(null);
  const nextRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const closing = useRef(false);
  // O deck é fotografado ao abrir; mudanças no editor não afetam esta apresentação.
  const slides = useMemo(() => deck.slides, []); // eslint-disable-line react-hooks/exhaustive-deps

  const code = live.code;
  const hasNext = index + 1 < slides.length;
  const joinUrl = code ? `${location.origin}/join/${code}` : '';

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    useLiveStore.getState().stop();
    setPreviewMode(false);
    setPresenting(false);
  };

  // Abre a sala e monta o HTML da apresentação.
  useEffect(() => {
    useLiveStore.getState().start();
    let cancelled = false;
    void buildFrameHTML(deck, startIndex).then((built) => {
      if (!cancelled) setHtml(built);
    });
    return () => {
      cancelled = true;
      useLiveStore.getState().stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Canal com a tela exibida.
  useEffect(() => {
    if (!code || !html) return;
    const channel = new BroadcastChannel(screenChannelName(code));
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ScreenMessage>) => {
      if (event.data.type !== 'hello') return;
      const state = useLiveStore.getState();
      channel.postMessage({
        type: 'init',
        html,
        index: indexRef.current,
        chatOpen: state.room.chat,
        messages: state.messages.slice(-5),
      } satisfies ScreenMessage);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [code, html]);

  const indexRef = useRef(index);
  indexRef.current = index;

  // O slide mudou dentro da apresentação (setas, cliques): avisa a sala, a tela exibida e a prévia.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __mm?: string; index?: number } | undefined;
      if (event.source === mainRef.current?.contentWindow) {
        if (data?.__mm === 'present-exit') close();
        if (data?.__mm === 'slide' && typeof data.index === 'number') setIndex(data.index);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const chat = slideHasChat(slides[index]?.html ?? '');
    useLiveStore.getState().sendSlide(index, chat);
    channelRef.current?.postMessage({ type: 'goto', index } satisfies ScreenMessage);
    nextRef.current?.contentWindow?.postMessage(
      { __mm: 'goto', index: Math.min(index + 1, slides.length - 1) },
      '*'
    );
  }, [index, slides, html]);

  // Chat/mensagens para a tela exibida.
  useEffect(() => {
    channelRef.current?.postMessage({
      type: 'chat',
      open: live.room.chat,
      messages: live.messages.slice(-5),
    } satisfies ScreenMessage);
  }, [live.room.chat, live.messages]);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    mainRef.current?.contentWindow?.postMessage({ __mm: 'goto', index: clamped }, '*');
  };

  const openScreen = () => {
    if (!code) return;
    window.open(`/screen/${code}`, 'mm-screen', 'popup,width=1280,height=720');
  };

  const notes = slideNotes(slides[index]?.html ?? '');
  const status =
    live.status === 'open'
      ? 'Sala aberta'
      : live.status === 'closed'
        ? 'Sem conexão'
        : 'Conectando…';

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-[#0b0b0d] text-payday-text"
      role="dialog"
      aria-modal="true"
      aria-label="Visão do apresentador"
    >
      <header className="flex items-center gap-4 border-b border-payday-border px-4 py-2 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-widest text-payday-textDim">Código</span>
          <span data-testid="room-code" className="font-mono text-2xl tracking-[0.3em] text-accent">
            {code ?? '·····'}
          </span>
        </div>
        <span className="hidden truncate text-xs text-payday-textMuted md:block">
          Participar: <b>{joinUrl}</b>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-payday-textMuted">
          <Users className="h-3.5 w-3.5" /> <span data-testid="spectators">{live.spectators}</span>{' '}
          na plateia
        </span>
        <span className="text-xs text-payday-textDim">{status}</span>
        <span className="ml-auto font-mono text-xs tabular-nums text-payday-textMuted">
          {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
        </span>
        <button
          type="button"
          onClick={openScreen}
          className="inline-flex items-center gap-1.5 rounded border border-accent/40 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10"
        >
          <MonitorUp className="h-3.5 w-3.5" /> Abrir tela de exibição
        </button>
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-1.5 rounded border border-payday-border px-3 py-1.5 text-xs text-payday-textMuted transition hover:text-accent"
        >
          <X className="h-3.5 w-3.5" /> Encerrar
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <section className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative aspect-video max-h-full w-full overflow-hidden rounded-lg border border-payday-border bg-black">
            {html ? (
              <iframe
                ref={mainRef}
                title="Slide atual"
                srcDoc={html}
                className="absolute inset-0 h-full w-full border-0"
                onLoad={() => mainRef.current?.contentWindow?.focus()}
              />
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="rounded border border-payday-border px-4 py-1.5 transition hover:border-accent/50 disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="font-mono text-xs text-payday-textMuted">
              {index + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={!hasNext}
              className="rounded border border-payday-border px-4 py-1.5 transition hover:border-accent/50 disabled:opacity-30"
            >
              Próximo →
            </button>
          </div>
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
              Próximo
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg border border-payday-border bg-black">
              {html && hasNext ? (
                <iframe
                  ref={nextRef}
                  title="Próximo slide"
                  srcDoc={html}
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 h-full w-full border-0"
                  onLoad={() =>
                    nextRef.current?.contentWindow?.postMessage(
                      { __mm: 'goto', index: Math.min(index + 1, slides.length - 1) },
                      '*'
                    )
                  }
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-payday-textDim">
                  {hasNext ? '' : 'Último slide'}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-28 overflow-auto rounded-lg border border-payday-border p-2 text-xs text-payday-textMuted">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
              Notas
            </div>
            {notes || <span className="text-payday-textDim">Sem notas neste slide.</span>}
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-payday-border">
            <div className="flex items-center justify-between border-b border-payday-border px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-payday-textDim">
                Chat da plateia
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-payday-textMuted">
                <input
                  type="checkbox"
                  checked={live.room.chat}
                  onChange={(event) => useLiveStore.getState().setChatOpen(event.target.checked)}
                  aria-label="Chat aberto"
                />
                Aberto
              </label>
            </div>
            <div
              data-testid="presenter-chat"
              className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2"
            >
              {live.messages.length === 0 ? (
                <p className="p-2 text-center text-xs text-payday-textDim">Sem mensagens.</p>
              ) : null}
              {live.messages.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1 break-words">
                    <b className="mr-1 text-accent">{m.name}</b>
                    {m.text}
                  </div>
                  <button
                    type="button"
                    aria-label={`Apagar mensagem de ${m.name}`}
                    onClick={() => useLiveStore.getState().deleteMessage(m.id)}
                    className="shrink-0 text-payday-textDim opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
