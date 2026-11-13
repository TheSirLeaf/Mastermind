// Preferências da apresentação (aba Slides): barra de progresso, tipo e integração ao vivo.
import { presentationSettings } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Radio, X } from 'lucide-react';
import { useEffect } from 'react';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-5 w-9 shrink-0 rounded-full transition',
        checked ? 'bg-accent' : 'bg-white/15'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-4 w-4 rounded-full bg-black transition-all',
          checked ? 'left-[18px]' : 'left-0.5 bg-white/80'
        )}
      />
    </button>
  );
}

export function PresentationPrefsModal() {
  const open = useUIStore((state) => state.isPrefsOpen);
  const close = () => useUIStore.getState().setPrefsOpen(false);
  // Seleciona o objeto guardado (referência estável) e aplica os padrões fora do seletor.
  const stored = useDeckStore((state) => state.deck.settings);
  const settings = presentationSettings({ settings: stored });
  const set = useDeckStore((state) => state.setPresentationSettings);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useUIStore.getState().setPrefsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Preferências da apresentação"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="w-[min(520px,96vw)] overflow-hidden rounded-2xl border border-accent/30 bg-payday-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-payday-border px-5 py-3">
          <h2 className="text-base font-semibold text-payday-text">Preferências da apresentação</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="rounded p-1 text-payday-textMuted transition hover:bg-white/10 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <section className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-payday-text">Barra de progresso</h3>
              <p className="mt-0.5 text-[11px] text-payday-textMuted">
                Mostra a barra fina no rodapé durante a apresentação.
              </p>
            </div>
            <Toggle
              label="Barra de progresso"
              checked={settings.progressBar}
              onChange={(value) => set({ progressBar: value })}
            />
          </section>

          <section>
            <h3 className="text-sm font-medium text-payday-text">Tipo de apresentação</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={settings.mode === 'standard'}
                onClick={() => set({ mode: 'standard' })}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left transition',
                  settings.mode === 'standard'
                    ? 'border-accent/60 bg-accent/15'
                    : 'border-payday-border hover:bg-white/5'
                )}
              >
                <span className="block text-sm text-payday-text">Padrão</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-payday-textMuted">
                  Os slides passam em sequência.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={settings.mode === 'areas'}
                onClick={() => set({ mode: 'areas' })}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left transition',
                  settings.mode === 'areas'
                    ? 'border-accent/60 bg-accent/15'
                    : 'border-payday-border hover:bg-white/5'
                )}
              >
                <span className="flex items-center gap-1.5 text-sm text-payday-text">
                  Áreas
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-payday-textDim">
                    em breve
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-payday-textMuted">
                  O apresentador se move pela apresentação e escolhe os slides para exibir.
                </span>
              </button>
            </div>
            {settings.mode === 'areas' ? (
              <p className="mt-1.5 text-[11px] text-payday-textDim">
                A escolha é salva, mas por enquanto a apresentação segue o modo Padrão.
              </p>
            ) : null}
          </section>

          <section className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-payday-text">
                <Radio className="h-3.5 w-3.5 text-accent" /> Interação ao vivo
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-payday-textDim">
                  em breve
                </span>
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-payday-textMuted">
                A plateia entra pelo celular com o código da apresentação e um nome, e participa ao
                vivo: chat em certos slides, emojis que voam e perguntas que o apresentador escolhe
                para mostrar no slide. Usa duas telas: a do apresentador e a exibida.
              </p>
              <p className="mt-1 text-[11px] text-payday-textDim">
                A opção é salva na apresentação; a integração ainda será construída.
              </p>
            </div>
            <Toggle
              label="Interação ao vivo"
              checked={settings.live}
              onChange={(value) => set({ live: value })}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
