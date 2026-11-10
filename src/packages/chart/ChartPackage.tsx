import type { FormSchema, PackageDef, RuntimeAPI, HelperAPI, PackageSpec } from '../core/types';

export interface ChartRow {
  label: string;
  val: string;
  hl?: boolean;
}

export interface ChartSpec extends PackageSpec {
  kind: 'bar' | 'hbar' | 'line' | 'donut';
  title: string;
  rows: ChartRow[];
  color: string;
  hlColor: string;
  max: string;
  suffix: string;
  decimals: number;
  showValues: boolean;
  grid: boolean;
  animate: boolean;
  countUp: boolean;
  delay: number;
  w: number;
}

export const chartForm: FormSchema = [
  {
    group: 'Tipo',
    icon: 'chart',
    open: true,
    fields: [
      {
        k: 'kind',
        type: 'seg',
        options: [
          ['bar', 'Barras', 'chart'],
          ['hbar', 'Horizontal', 'hbars'],
          ['line', 'Linha', 'line'],
          ['donut', 'Rosca', 'donut'],
        ],
      },
      { k: 'title', label: 'Título (opcional)', type: 'text' },
    ],
  },
  {
    group: 'Dados',
    icon: 'table',
    open: true,
    fields: [
      {
        k: 'rows',
        type: 'list',
        addLabel: 'Adicionar item',
        item: [
          { k: 'label', type: 'text', placeholder: 'Rótulo', w: '1fr' },
          { k: 'val', type: 'text', placeholder: 'Valor', w: '64px' },
          { k: 'hl', type: 'check', title: 'Destacar', w: '24px' },
        ],
        itemDefault: { label: 'novo', val: '1', hl: false },
      },
      {
        type: 'buttons',
        items: [
          {
            label: 'Inverter ordem',
            icon: 'swap',
            do: (spec) => {
              const rows = (spec as ChartSpec).rows;
              rows?.reverse();
            },
          },
        ],
      },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    open: true,
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'color', label: 'Cor', type: 'color' },
          { k: 'hlColor', label: 'Cor de destaque', type: 'color' },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'max', label: 'Escala (máx.)', type: 'text', placeholder: 'auto' },
          { k: 'suffix', label: 'Sufixo', type: 'text', placeholder: '%' },
        ],
      },
      { k: 'decimals', label: 'Casas decimais', type: 'range', min: 0, max: 3, step: 1 },
      { k: 'showValues', label: 'Mostrar valores', type: 'toggle' },
      {
        k: 'grid',
        label: 'Linhas de grade',
        type: 'toggle',
        showIf: { k: 'kind', in: ['bar', 'line'] },
      },
    ],
  },
  {
    group: 'Animação',
    icon: 'play',
    open: true,
    fields: [
      { k: 'animate', label: 'Animar a entrada', type: 'toggle' },
      {
        k: 'countUp',
        label: 'Contar os valores de 0 até o final',
        type: 'toggle',
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'delay',
        label: 'Atraso',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.1,
        unit: ' s',
        showIf: { k: 'animate', eq: true },
      },
    ],
  },
];

export const chartCss = `
.pk-chart{width:100%;--pk-fg:rgba(255,248,245,.85);--pk-mut:rgba(255,248,245,.4);--pk-line:rgba(255,248,245,.14)}
.slide.light .pk-chart{--pk-fg:#3B3032;--pk-mut:rgba(59,48,50,.5);--pk-line:rgba(59,48,50,.16)}
.pk-chart .pk-title{font:600 13px 'DM Sans',system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--pk-mut);margin-bottom:14px}
.pk-chart .pk-svg{width:100%;height:auto;display:block;overflow:visible}
.pk-chart .pk-base{stroke:var(--pk-line);stroke-width:2}
.pk-chart .pk-gr{stroke:var(--pk-line);stroke-width:1;stroke-dasharray:4 6}
.pk-chart .pk-cv{fill:var(--pk-fg);font:700 16px 'DM Sans',system-ui,sans-serif}
.pk-chart .pk-cl{fill:var(--pk-mut);font:14px 'DM Sans',system-ui,sans-serif}
.pk-chart .pk-b{transform-box:fill-box;transform-origin:50% 100%}
.pk-chart .pk-ar{opacity:.16}
.pk-chart .pk-hr{display:grid;grid-template-columns:150px 1fr 90px;gap:18px;align-items:center;margin:14px 0}
.pk-chart .pk-hn{font:500 18px 'DM Sans',system-ui,sans-serif;color:var(--pk-fg)}
.pk-chart .pk-ht{height:14px;border-radius:99px;background:var(--pk-line);overflow:hidden}
.pk-chart .pk-ht i{display:block;height:100%;border-radius:99px;transform-origin:0 50%}
.pk-chart .pk-hv{font:700 18px 'DM Sans',system-ui,sans-serif;color:var(--pk-fg);text-align:right}
`;

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

export const ChartPackage: PackageDef<ChartSpec> = {
  id: 'chart',
  name: 'Gráfico',
  version: '1.0.0',
  icon: 'chart',
  author: 'Dialcron',
  description:
    'Barras verticais, barras horizontais, linha e rosca, com entrada animada e contagem dos valores.',
  defaults: {
    kind: 'bar',
    title: '',
    rows: [
      { label: '11/10', val: '5', hl: false },
      { label: '12/10', val: '8', hl: false },
      { label: '14/10', val: '11', hl: false },
      { label: '20/10', val: '11', hl: false },
      { label: '24/10', val: '40', hl: true },
      { label: '30/10', val: '9', hl: false },
    ],
    color: '#C77C8A',
    hlColor: '#F7D98B',
    max: '',
    suffix: '',
    decimals: 0,
    showValues: true,
    grid: false,
    animate: true,
    countUp: true,
    delay: 0.3,
    w: 900,
  },
  presets: [
    {
      name: 'Barras verticais',
      desc: 'Como o gráfico de commits do slide 19',
      spec: { kind: 'bar' },
    },
    {
      name: 'Barras horizontais',
      desc: 'Como as barras de cobertura',
      spec: {
        kind: 'hbar',
        suffix: '%',
        decimals: 1,
        rows: [
          { label: 'Linhas', val: '90,0', hl: true },
          { label: 'Branches', val: '91,2', hl: false },
          { label: 'FuncoesGerais', val: '98,8', hl: false },
        ],
      },
    },
    {
      name: 'Linha',
      desc: 'Evolução ao longo do tempo',
      spec: {
        kind: 'line',
        rows: [
          { label: 'S1', val: '12' },
          { label: 'S2', val: '30' },
          { label: 'S3', val: '24' },
          { label: 'S4', val: '48', hl: true },
        ],
      },
    },
    {
      name: 'Rosca',
      desc: 'Proporção entre categorias',
      spec: {
        kind: 'donut',
        w: 760,
        rows: [
          { label: 'Aprovados', val: '137', hl: true },
          { label: 'Ignorados', val: '0' },
          { label: 'Falhas', val: '3' },
        ],
      },
    },
  ],
  box: { w: 900 },
  form: chartForm,
  css: chartCss,
  render: (spec, h: HelperAPI) => {
    const rows = spec.rows ?? [];
    const values = rows.map((row) => h.num(row.val));
    const maxValue = h.num(spec.max) > 0 ? h.num(spec.max) : Math.max(...values, 0);
    const title = spec.title ? <div className="pk-title">{spec.title}</div> : null;

    if (spec.kind === 'hbar') {
      return (
        <div className="pk-chart" style={{ width: `${spec.w}px`, maxWidth: '100%' }}>
          {title}
          {rows.map((row, index) => {
            const value = values[index] ?? 0;
            const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div className="pk-hr" key={index}>
                <div className="pk-hn">{row.label}</div>
                <div className="pk-ht">
                  <i
                    className="pk-hb"
                    style={{
                      width: `${pct.toFixed(2)}%`,
                      background: row.hl ? spec.hlColor : spec.color,
                    }}
                  />
                </div>
                <div className="pk-hv">
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
      let offset = 0;
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      return (
        <div className="pk-chart" style={{ width: `${spec.w}px`, maxWidth: '100%' }}>
          {title}
          <svg className="pk-svg" viewBox="0 0 360 300" role="img">
            <g transform="translate(180 150) rotate(-90)">
              {rows.map((row, index) => {
                const value = values[index] ?? 0;
                const frac = value / total;
                const dash = frac * circumference;
                const circle = (
                  <circle
                    key={index}
                    r={radius}
                    fill="none"
                    stroke={row.hl ? spec.hlColor : spec.color}
                    strokeWidth={38}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    opacity={row.hl ? 1 : 0.75}
                  />
                );
                offset += dash;
                return circle;
              })}
            </g>
            <text x="180" y="150" textAnchor="middle" className="pk-cv" style={{ fontSize: 32 }}>
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
        <div className="pk-chart" style={{ width: `${spec.w}px`, maxWidth: '100%' }}>
          {title}
          <svg className="pk-svg" viewBox={`0 0 ${W} ${H}`} role="img">
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
            <path d={path} fill="none" stroke={spec.color} strokeWidth={4} strokeLinecap="round" />
            {pts.map((p, index) => (
              <g key={index}>
                <circle cx={p.x} cy={p.y} r={7} fill={p.row.hl ? spec.hlColor : spec.color} />
                {spec.showValues ? (
                  <text x={p.x} y={p.y - 18} textAnchor="middle" className="pk-cv pk-line-v">
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
      <div className="pk-chart" style={{ width: `${spec.w}px`, maxWidth: '100%' }}>
        {title}
        <svg className="pk-svg" viewBox={`0 0 ${W} ${H}`} role="img">
          <line className="pk-base" x1={pad} x2={W - pad} y1={H - 70} y2={H - 70} />
          {rows.map((row, index) => {
            const value = values[index] ?? 0;
            const height = maxValue > 0 ? (value / maxValue) * (H - 150) : 0;
            const x = pad + gap / 2 + index * (barWidth + gap);
            const y = H - 70 - height;
            const fill = row.hl ? spec.hlColor : spec.color;
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
  },
  duration: (spec) => (spec.animate ? spec.delay * 1000 + 900 : 0),
  runtime: (root, spec, api: RuntimeAPI) => {
    if (!spec.animate || api.reduced) return null;
    const bars = Array.from(root.querySelectorAll('.pk-b')) as SVGElement[];
    const values = Array.from(root.querySelectorAll('.pk-bar-v, .pk-line-v')) as SVGTextElement[];
    const originals = values.map((el) => el.textContent ?? '');
    const heights = bars.map((el) => Number(el.getAttribute('data-h') ?? 0));
    let cancelled = false;

    const final = () => {
      cancelled = true;
      bars.forEach((bar, index) => {
        bar.style.transform = '';
        bar.style.opacity = '';
        bar.setAttribute('height', String(heights[index] ?? 0));
      });
      values.forEach((el, index) => {
        el.textContent = originals[index] ?? '';
      });
    };

    return {
      play: async () => {
        bars.forEach((bar) => {
          bar.style.transform = 'scaleY(0)';
          bar.style.opacity = '0';
        });
        await api.wait(spec.delay * 1000);
        bars.forEach((bar) => {
          bar.style.opacity = '1';
          bar.style.transform = 'scaleY(1)';
          bar.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)';
        });
        if (spec.countUp) {
          const start = performance.now();
          const duration = 900;
          await new Promise<void>((resolve) => {
            const tick = (ts: number) => {
              if (cancelled || !api.alive()) return resolve();
              const t = Math.min(1, (ts - start) / duration);
              values.forEach((el, index) => {
                const original = originals[index] ?? '0';
                const target =
                  Number(
                    original
                      .replace(/[^0-9,.-]/g, '')
                      .replace(/\./g, '')
                      .replace(',', '.')
                  ) || 0;
                const suffix = original.replace(/[0-9.,\s-]/g, '');
                const current = target * t;
                el.textContent = `${current.toLocaleString('pt-BR', {
                  minimumFractionDigits: Math.min(2, original.split(/[.,]/)[1]?.length ?? 0),
                  maximumFractionDigits: Math.min(2, original.split(/[.,]/)[1]?.length ?? 0),
                })}${suffix}`;
              });
              if (t < 1) requestAnimationFrame(tick);
              else resolve();
            };
            requestAnimationFrame(tick);
          });
        }
      },
      final,
    };
  },
};
