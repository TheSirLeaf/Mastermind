// spectator/ScreenView.tsx
// Tela exibida (projetor/segundo monitor): mostra a apresentação limpa, em sincronia com a visão do
// apresentador (que fica na outra janela) e, nos slides com chat, as mensagens da plateia.
import { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../live/protocol';

import { screenChannelName, type ScreenMessage } from './screenChannel';

export default function ScreenView() {
  const code = location.pathname.split('/')[2] ?? '';
  const [html, setHtml] = useState<string | null>(null);
  const [chat, setChat] = useState<{ open: boolean; messages: ChatMessage[] }>({
    open: false,
    messages: [],
  });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const indexRef = useRef(0);

  const goto = (index: number) => {
    indexRef.current = index;
    frameRef.current?.contentWindow?.postMessage({ __mm: 'goto', index }, '*');
  };

  useEffect(() => {
    document.title = 'Mastermind — Tela de exibição';
    const channel = new BroadcastChannel(screenChannelName(code));
    channel.onmessage = (event: MessageEvent<ScreenMessage>) => {
      const m = event.data;
      if (m.type === 'init') {
        indexRef.current = m.index;
        setHtml(m.html);
        setChat({ open: m.chatOpen, messages: m.messages });
      } else if (m.type === 'goto') goto(m.index);
      else if (m.type === 'chat') setChat({ open: m.open, messages: m.messages });
    };
    channel.postMessage({ type: 'hello' } satisfies ScreenMessage);
    return () => channel.close();
  }, [code]);

  const fullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="fixed inset-0 bg-black" onDoubleClick={fullscreen}>
      {html ? (
        <iframe
          ref={frameRef}
          title="Apresentação"
          srcDoc={html}
          onLoad={() => goto(indexRef.current)}
          className="pointer-events-none h-full w-full border-0"
        />
      ) : (
        <div className="grid h-full place-items-center text-center text-payday-textMuted">
          <div>
            <p className="text-lg">Aguardando o apresentador…</p>
            <p className="mt-1 text-sm text-payday-textDim">
              Deixe esta janela no projetor e dê dois cliques para ir para tela cheia.
            </p>
          </div>
        </div>
      )}

      {chat.open ? (
        <div
          data-testid="screen-chat"
          className="pointer-events-none absolute bottom-6 left-6 flex w-[min(560px,45vw)] flex-col gap-2"
        >
          {chat.messages.slice(-5).map((m) => (
            <div
              key={m.id}
              className="rounded-2xl bg-black/65 px-4 py-2 text-[clamp(14px,1.6vw,26px)] text-white shadow-lg backdrop-blur"
            >
              <b className="mr-2 text-[#F7D98B]">{m.name}</b>
              {m.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
