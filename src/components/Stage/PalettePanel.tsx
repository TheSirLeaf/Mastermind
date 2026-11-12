// Barra inferior da aba Slides: cores mais comuns do slide selecionado.
// Passar o mouse mostra o hex; clicar copia.
import { useUIStore } from '@stores/uiStore';
import { Palette } from 'lucide-react';

import { Tooltip } from '../common/Tooltip';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function PalettePanel() {
  const colors = useUIStore((state) => state.slidePalette);
  const showToast = useUIStore((state) => state.showToast);

  const copy = async (hex: string) => {
    const ok = await copyText(hex);
    showToast(ok ? `${hex} copiado` : 'Não foi possível copiar', ok ? 'success' : 'error');
  };

  return (
    <div
      data-testid="palette-panel"
      className="flex h-11 shrink-0 items-center gap-3 border-t border-payday-border bg-[#0f0f10] px-3"
    >
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-payday-textDim">
        <Palette className="h-3.5 w-3.5" /> Paleta do slide
      </span>
      <div className="flex items-center gap-1.5">
        {colors.length === 0 ? (
          <span className="text-[11px] text-payday-textDim">Sem cores para mostrar.</span>
        ) : (
          colors.map((hex) => (
            <Tooltip key={hex} title={hex} description="Clique para copiar" side="top" delay={0}>
              <button
                type="button"
                aria-label={`Copiar ${hex}`}
                onClick={() => void copy(hex)}
                className="h-6 w-6 rounded-md border border-white/20 transition hover:scale-110 hover:border-white/70"
                style={{ background: hex }}
              />
            </Tooltip>
          ))
        )}
      </div>
    </div>
  );
}
