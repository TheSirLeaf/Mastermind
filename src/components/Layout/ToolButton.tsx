// components/Layout/ToolButton.tsx
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import { Tooltip, type TooltipSide } from '../common/Tooltip';

export const toolButtonClass = (active = false, disabled = false): string =>
  clsx(
    'flex h-9 min-w-[34px] flex-col items-center justify-center gap-1 rounded-md px-1.5 transition 2xl:h-11 2xl:min-w-[46px] 2xl:px-2',
    active
      ? 'bg-accent/15 text-accent'
      : 'text-payday-textMuted hover:bg-white/10 hover:text-payday-text',
    disabled && 'pointer-events-none opacity-35'
  );

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  side?: TooltipSide;
  onClick: () => void;
}

/** Botão de ferramenta da barra inferior: ícone, rótulo curto e tooltip rico. */
export function ToolButton({
  icon: Icon,
  label,
  description,
  shortcut,
  active,
  disabled,
  side = 'top',
  onClick,
}: ToolButtonProps) {
  return (
    <Tooltip title={label} description={description} shortcut={shortcut} side={side}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        className={toolButtonClass(active, disabled)}
        onClick={onClick}
      >
        <Icon className="h-[18px] w-[18px]" />
        <span className="hidden text-[10px] leading-none 2xl:block">{label}</span>
      </button>
    </Tooltip>
  );
}

export function ToolDivider() {
  return <span className="mx-1 h-7 w-px shrink-0 bg-payday-border" aria-hidden="true" />;
}
