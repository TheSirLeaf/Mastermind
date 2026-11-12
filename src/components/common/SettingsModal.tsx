// components/common/SettingsModal.tsx
import { useUIStore, readWelcomeOnStart } from '@stores/uiStore';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

function Row({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/5">
      <input
        type="checkbox"
        className="mt-0.5 accent-accent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm text-payday-text">{title}</span>
        <span className="block text-[11px] text-payday-textMuted">{description}</span>
      </span>
    </label>
  );
}

export function SettingsModal() {
  const open = useUIStore((state) => state.isSettingsOpen);
  const close = useUIStore((state) => state.closeSettings);
  const tooltips = useUIStore((state) => state.tooltipsEnabled);
  const setTooltips = useUIStore((state) => state.setTooltipsEnabled);
  const setWelcome = useUIStore((state) => state.setWelcomeOnStart);
  const [welcome, setWelcomeState] = useState(true);

  useEffect(() => {
    if (!open) return;
    setWelcomeState(readWelcomeOnStart());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        className="w-full max-w-md rounded-2xl border border-payday-border bg-payday-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-payday-border p-4">
          <h2 className="font-serif text-xl text-accent">Configurações</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="rounded p-1.5 text-payday-textMuted transition hover:bg-white/10 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1 p-3">
          <Row
            title="Dicas ao passar o mouse"
            description="Mostra o nome, a descrição e o atalho de cada ferramenta."
            checked={tooltips}
            onChange={setTooltips}
          />
          <Row
            title="Aviso de boas-vindas ao abrir"
            description="Exibe a tela inicial quando o editor é aberto."
            checked={welcome}
            onChange={(value) => {
              setWelcomeState(value);
              setWelcome(value);
            }}
          />
        </div>
        <p className="border-t border-payday-border px-4 py-3 text-[11px] text-payday-textDim">
          As configurações ficam salvas neste navegador.
        </p>
      </div>
    </div>
  );
}
