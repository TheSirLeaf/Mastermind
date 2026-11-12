import type { HelperAPI, PackageSpec } from '../core/types';

export interface ChartRow {
  label: string;
  val: string;
  hl?: boolean;
  /** Cor própria do item (modo Por item). */
  color?: string;
}

export interface ChartSpec extends PackageSpec {
  kind: 'bar' | 'hbar' | 'line' | 'donut';
  title: string;
  rows: ChartRow[];
  color: string;
  hlColor: string;
  max: string;
  prefix?: string;
  suffix: string;
  decimals: number;
  showValues: boolean;
  grid: boolean;
  animate: boolean;
  countUp: boolean;
  delay: number;
  w: number;
  /** Como os itens são coloridos: uma cor (+ destaque), paleta automática ou por item. */
  colorMode?: 'single' | 'palette' | 'custom';
  /** Estilo da entrada: crescer, aparecer ou subir. */
  animStyle?: 'grow' | 'fade' | 'rise';
  /** Duração da entrada de cada item, em segundos. */
  animDuration?: number;
  /** Intervalo entre um item e o seguinte, em segundos. */
  stagger?: number;
  /** Curva da animação (função CSS de timing). */
  animEase?: string;
}

/** Cores usadas pelo modo Paleta e como ponto de partida do Por item. */
export const CHART_PALETTE = [
  '#F7D98B',
  '#C77C8A',
  '#8FD3A8',
  '#9CC5E8',
  '#B9A6E8',
  '#F0B27A',
  '#72A68A',
  '#E8A0B4',
];

/** Cor de um item, de acordo com o modo de coloração do gráfico. */
export function chartItemColor(spec: ChartSpec, row: ChartRow, index: number): string {
  const mode = spec.colorMode ?? (spec.kind === 'donut' ? 'palette' : 'single');
  const fallback = CHART_PALETTE[index % CHART_PALETTE.length] ?? spec.color;
  if (mode === 'palette') return fallback;
  if (mode === 'custom') return row.color || fallback;
  return row.hl ? spec.hlColor : spec.color;
}

export interface ChartRendererProps {
  spec: ChartSpec;
  h: HelperAPI;
}

const W = 900;
const H = 420;

function points(rows: ChartRow[], maxValue: number) {
  const pad = 60;
  const inner = W - pad * 2;
  const innerH = H - 120;
  const step = rows.length > 1 ? inner / (rows.length - 1) : 0;
  return rows.map((row, index) => {
    const value = Number(String(row.val).replace(/\./g, '').replace(',', '.')) || 0;
    const x = pad + index * step;
    const y = H - 70 - (maxValue > 0 ? (value / maxValue) * innerH : 0);
    return { x, y, value, row };
  });
}

export function ChartRenderer({ spec, h }: ChartRendererProps): JSX.Element {
  const rows = spec.rows ?? [];
  const values = rows.map((row) => h.num(row.val));
  const maxValue = h.num(spec.max) > 0 ? h.num(spec.max) : Math.max(...values, 0);
  const title = spec.title ? <div className="pk-title">{spec.title}</div> : null;

  if (spec.kind === 'hbar') {
    return (
      <div
        data-testid="pk-chart-container"
        className="pk-chart"
        style={{ width: `${spec.w}px`, maxWidth: '100%' }}
      >
        {title}
        {rows.map((row, index) => {
          const value = values[index] ?? 0;
          const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div data-testid={`pk-hbar-${index}`} className="pk-hr" key={index}>
              <div className="pk-hn">{row.label}</div>
              <div className="pk-ht">
                <i
                  className="pk-hb"
                  data-pk-item
                  style={{
                    width: `${pct.toFixed(2)}%`,
                    background: chartItemColor(spec, row, index),
                  }}
                />
              </div>
              <div className="pk-hv">
                {spec.prefix}
                {h.fmt(value, spec.decimals)}
                {spec.suffix}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (spec.kind === 'donut') {
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    // O offset precisa ser o início acumulado do segmento, não o fim dele.
    // Caso contrário cada arco começa deslocado pelo próprio comprimento.
    const segments = rows.map((row, index) => {
      const value = values[index] ?? 0;
      const dash = (value / total) * circumference;
      const segment = { row, dash, offset };
      offset += dash;
      return segment;
    });
    return (
      <div
        data-testid="pk-chart-container"
        className="pk-chart"
        style={{ width: `${spec.w}px`, maxWidth: '100%' }}
      >
        {title}
        <svg data-testid="pk-donut" className="pk-svg" viewBox="0 0 360 300" role="img">
          <g transform="translate(180 150) rotate(-90)">
            {segments.map(({ row, dash, offset }, index) => (
              <circle
                key={index}
                data-testid={`pk-hl-${index}`}
                r={radius}
                fill="none"
                data-pk-item
                data-pk-seg
                stroke={chartItemColor(spec, row, index)}
                strokeWidth={38}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                opacity={spec.colorMode === 'single' && !row.hl ? 0.75 : 1}
              />
            ))}
          </g>
          <text
            x="180"
            y="150"
            textAnchor="middle"
            className="pk-cv pk-cv-total"
            style={{ fontSize: 32 }}
          >
            {spec.prefix}
            {h.fmt(total, spec.decimals)}
            {spec.suffix}
          </text>
          <text x="180" y="178" textAnchor="middle" className="pk-cl">
            total
          </text>
        </svg>
      </div>
    );
  }

  const pts = points(rows, maxValue);
  if (spec.kind === 'line') {
    const path = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    return (
      <div
        data-testid="pk-chart-container"
        className="pk-chart"
        style={{ width: `${spec.w}px`, maxWidth: '100%' }}
      >
        {title}
        <svg data-testid="pk-line" className="pk-svg" viewBox={`0 0 ${W} ${H}`} role="img">
          {spec.grid
            ? [0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  className="pk-gr"
                  x1={60}
                  x2={W - 60}
                  y1={H - 70 - (H - 120) * f}
                  y2={H - 70 - (H - 120) * f}
                />
              ))
            : null}
          <line className="pk-base" x1={60} x2={W - 60} y1={H - 70} y2={H - 70} />
          <path
            d={path}
            data-pk-line
            pathLength={1}
            fill="none"
            stroke={spec.color}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {pts.map((p, index) => (
            <g key={index}>
              <circle
                data-pk-item
                data-pk-dot
                cx={p.x}
                cy={p.y}
                r={7}
                fill={chartItemColor(spec, p.row, index)}
              />
              {spec.showValues ? (
                <text x={p.x} y={p.y - 18} textAnchor="middle" className="pk-cv pk-line-v">
                  {spec.prefix}
                  {h.fmt(p.value, spec.decimals)}
                  {spec.suffix}
                </text>
              ) : null}
              <text x={p.x} y={H - 38} textAnchor="middle" className="pk-cl">
                {p.row.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  const pad = 60;
  const barWidth = 60;
  const gap = (W - pad * 2 - rows.length * barWidth) / Math.max(1, rows.length);
  return (
    <div
      data-testid="pk-chart-container"
      className="pk-chart"
      style={{ width: `${spec.w}px`, maxWidth: '100%' }}
    >
      {title}
      <svg className="pk-svg" viewBox={`0 0 ${W} ${H}`} role="img">
        <line className="pk-base" x1={pad} x2={W - pad} y1={H - 70} y2={H - 70} />
        {rows.map((row, index) => {
          const value = values[index] ?? 0;
          const height = maxValue > 0 ? (value / maxValue) * (H - 150) : 0;
          const x = pad + gap / 2 + index * (barWidth + gap);
          const y = H - 70 - height;
          const fill = chartItemColor(spec, row, index);
          return (
            <g key={index}>
              <rect
                className="pk-b pk-bar"
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={6}
                fill={fill}
                data-h={height}
              />
              {spec.showValues ? (
                <text
                  x={x + barWidth / 2}
                  y={y - 14}
                  textAnchor="middle"
                  className="pk-cv pk-bar-v"
                >
                  {spec.prefix}
                  {h.fmt(value, spec.decimals)}
                  {spec.suffix}
                </text>
              ) : null}
              <text x={x + barWidth / 2} y={H - 38} textAnchor="middle" className="pk-cl">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
