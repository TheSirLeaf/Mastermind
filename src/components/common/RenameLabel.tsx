// Rótulo que se renomeia com duplo clique (ou pelo lápis): Enter confirma, Esc cancela.
// Texto vazio volta ao nome automático.
import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface RenameLabelProps {
  value: string;
  onCommit: (name: string) => void;
  /** Clique simples (ex.: selecionar o elemento). */
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Mostra o lápis ao passar o mouse. */
  pencil?: boolean;
}

export function RenameLabel({
  value,
  onCommit,
  onClick,
  className,
  style,
  title,
  pencil = false,
}: RenameLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // Só ao entrar em edição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const finish = (save: boolean) => {
    setEditing(false);
    if (save && draft.trim() !== value.trim()) onCommit(draft.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label="Nome do elemento"
        value={draft}
        maxLength={60}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') finish(true);
          else if (event.key === 'Escape') finish(false);
        }}
        onClick={(event) => event.stopPropagation()}
        className="min-w-0 flex-1 rounded border border-accent/50 bg-black/40 px-1.5 py-0.5 text-[11px] text-payday-text outline-none"
        style={style}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      title={title ?? `${value} — duplo clique para renomear`}
      className={className}
      style={style}
    >
      <span className="truncate">{value}</span>
      {pencil ? (
        <span
          role="button"
          aria-label="Renomear"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
          className="ml-1.5 inline-grid h-4 w-4 shrink-0 place-items-center rounded text-payday-textDim hover:text-accent"
        >
          <Pencil className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}
