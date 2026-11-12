// Linha do tempo do pacote de gráficos: a entrada animada dos itens.
import type { PackageTimeline, PackageTimelineEvent } from '../core/types';

import type { ChartSpec } from './ChartRenderer';

const ANIM_LABEL: Record<string, string> = { grow: 'Crescer', fade: 'Aparecer', rise: 'Subir' };

const round = (value: number, step: number): number => Math.round(value / step) * step;

function gaps(spec: ChartSpec): number {
  return Math.max(0, (spec.rows?.length ?? 1) - 1) * (spec.stagger ?? 0.08);
}

/** Duração da entrada (último item incluído), em segundos. */
export function chartEntrySeconds(spec: ChartSpec): number {
  return (spec.animDuration && spec.animDuration > 0 ? spec.animDuration : 0.8) + gaps(spec);
}

export const chartTimeline: PackageTimeline<ChartSpec> = {
  events(spec): PackageTimelineEvent[] {
    if (!spec.animate) return [];
    return [
      {
        id: 'entry',
        label: `Entrada · ${ANIM_LABEL[spec.animStyle ?? 'grow'] ?? 'Crescer'}`,
        start: spec.delay ?? 0,
        duration: chartEntrySeconds(spec),
        color: '#E8A0B4',
        resizable: true,
      },
    ];
  },

  move(spec, id, change) {
    if (id !== 'entry') return null;
    if (change.duration !== undefined) {
      // A ponta da barra muda a duração de cada item (o intervalo entre itens fica).
      const each = Math.min(3, Math.max(0.2, round(change.duration - gaps(spec), 0.1)));
      return { animDuration: each };
    }
    if (change.start !== undefined) {
      return { delay: Math.min(10, Math.max(0, round(change.start, 0.1))) };
    }
    return null;
  },
};
