// components/Inspector/InspectorSection.tsx
// Seção de acordeão do inspetor: abrir uma fecha as outras do mesmo grupo,
// então o painel raramente precisa de rolagem.
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface InspectorSectionProps {
  /** Identifica a seção dentro do grupo. */
  id: string;
  /** Seções do mesmo grupo se alternam (ex.: `style`, `content`). */
  group: string;
  title: string;
  icon?: ReactNode;
  /** Aberta enquanto o usuário ainda não escolheu outra no grupo. */
  defaultOpen?: boolean | undefined;
  children: ReactNode;
}

export function InspectorSection({
  id,
  group,
  title,
  icon,
  defaultOpen = false,
  children,
}: InspectorSectionProps) {
  const chosen = useUIStore((state) => state.openSections[group]);
  const setOpenSection = useUIStore((state) => state.setOpenSection);
  const open = chosen === undefined ? defaultOpen : chosen === id;

  return (
    <section className="border-b border-payday-border/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenSection(group, open ? '' : id)}
        className={clsx(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide transition',
          open ? 'text-accent' : 'text-payday-textMuted hover:text-payday-text'
        )}
      >
        <ChevronRight
          className={clsx('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')}
        />
        {icon}
        <span className="truncate">{title}</span>
      </button>
      {open ? <div className="space-y-2 px-3 pb-3 pt-1">{children}</div> : null}
    </section>
  );
}
