import type { CSSProperties } from 'react';

import type { FormSchema, PackageDef, PackageSpec, RuntimeAPI, HelperAPI } from '../core/types';

export interface CodeSpec extends PackageSpec {
  file: string;
  tag: string;
  lang: string;
  code: string;
  theme: 'dark' | 'light';
  fontSize: number;
  lineHeight: number;
  titlebar: boolean;
  note: string;
  hl: string;
  lineGlow: boolean;
  typing: boolean;
  cps: number;
  delay: number;
  caret: boolean;
  w: number;
}

export const codeForm: FormSchema = [
  {
    group: 'Conteúdo',
    icon: 'code',
    open: true,
    fields: [
      { k: 'file', label: 'Nome do arquivo', type: 'text', placeholder: 'Controls/AgendaUC.cs' },
      {
        type: 'row',
        fields: [
          { k: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'C#' },
          {
            k: 'lang',
            label: 'Linguagem',
            type: 'select',
            options: [
              ['csharp', 'C#'],
              ['yaml', 'YAML'],
              ['json', 'JSON'],
              ['sql', 'SQL'],
              ['js', 'JavaScript'],
              ['py', 'Python'],
              ['text', 'Texto puro'],
            ],
          },
        ],
      },
      { k: 'code', label: 'Código', type: 'code', rows: 12 },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    open: true,
    fields: [
      {
        k: 'theme',
        label: 'Tema da janela',
        type: 'seg',
        options: [
          ['dark', 'Escuro', 'moon'],
          ['light', 'Claro', 'sun'],
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'fontSize', label: 'Fonte', type: 'range', min: 12, max: 40, step: 1, unit: 'px' },
          {
            k: 'lineHeight',
            label: 'Entrelinha',
            type: 'range',
            min: 1.2,
            max: 2.4,
            step: 0.05,
            unit: '×',
          },
        ],
      },
      { k: 'titlebar', label: 'Mostrar barra de título', type: 'toggle' },
      {
        k: 'note',
        label: 'Rodapé (opcional)',
        type: 'text',
        placeholder: 'Ex.: se algo falhar, tudo é desfeito',
      },
    ],
  },
  {
    group: 'Destaque de linhas',
    icon: 'highlight',
    open: false,
    fields: [
      {
        k: 'hl',
        label: 'Linhas em destaque',
        type: 'text',
        placeholder: '2, 4-6',
        help: 'Números de linha separados por vírgula; intervalos com hífen.',
      },
      { k: 'lineGlow', label: 'Realçar a linha digitada', type: 'toggle' },
    ],
  },
  {
    group: 'Animação',
    icon: 'play',
    open: true,
    fields: [
      { k: 'typing', label: 'Digitar o código', type: 'toggle' },
      { k: 'caret', label: 'Cursor piscando', type: 'toggle' },
      {
        k: 'cps',
        label: 'Velocidade',
        type: 'range',
        min: 8,
        max: 160,
        step: 1,
        unit: ' cps',
        showIf: { k: 'typing', eq: true },
      },
      {
        k: 'delay',
        label: 'Atraso',
        type: 'range',
        min: 0,
        max: 3000,
        step: 50,
        unit: ' ms',
        showIf: { k: 'typing', eq: true },
      },
    ],
  },
];

export const codeCss = `
.pk-code{width:100%;border-radius:16px;overflow:hidden;font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;box-shadow:0 30px 70px -30px rgba(0,0,0,.65)}
.pk-code .pk-win{border:1px solid rgba(255,248,245,.14);border-radius:16px;overflow:hidden;background:#1b0f16}
.pk-code.pk-light .pk-win{background:#FFF8F5;border-color:rgba(59,48,50,.14)}
.pk-code .pk-bar{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid rgba(255,248,245,.1);background:rgba(255,248,245,.04)}
.pk-code.pk-light .pk-bar{background:rgba(59,48,50,.04);border-bottom-color:rgba(59,48,50,.1)}
.pk-code .pk-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,248,245,.22)}
.pk-code.pk-light .pk-dot{background:rgba(59,48,50,.18)}
.pk-code .pk-dot:first-child{background:#C95C62}.pk-code .pk-dot:nth-child(2){background:#D6A84F}.pk-code .pk-dot:nth-child(3){background:#72A68A}
.pk-code .pk-file{margin-left:8px;font:500 14px ui-monospace,Consolas,monospace;color:rgba(255,248,245,.55)}
.pk-code.pk-light .pk-file{color:rgba(59,48,50,.55)}
.pk-code .pk-tag{margin-left:auto;font:700 12px 'DM Sans',system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#F7D98B}
.pk-code.pk-light .pk-tag{color:#8E3B52}
.pk-code pre.pk-pre{margin:0;padding:24px 26px;overflow:visible;color:#FFF8F5;line-height:var(--lh,1.7);font-size:var(--fs,24px);white-space:pre;tab-size:2}
.pk-code.pk-light pre.pk-pre{color:#3B3032}
.pk-code .pk-ln{display:block;position:relative;padding-left:52px}
.pk-code .pk-ln::before{content:attr(data-n);position:absolute;left:0;width:32px;text-align:right;color:rgba(255,248,245,.24);font-size:.8em}
.pk-code.pk-light .pk-ln::before{color:rgba(59,48,50,.3)}
.pk-code .pk-ln.pk-hl{background:rgba(247,217,139,.1);box-shadow:inset 2px 0 0 #F7D98B}
.pk-code .tk-kw{color:#F7D98B}.pk-code .tk-str{color:#C77C8A}.pk-code .tk-num{color:#72A68A}
.pk-code .tk-cm{color:rgba(255,248,245,.35);font-style:italic}.pk-code .tk-fn{color:#8FB8D8}
.pk-code .tk-ty{color:#E0B7C1}.pk-code .tk-op{color:rgba(255,248,245,.55)}
.pk-code.pk-light .tk-kw{color:#9A4A32}.pk-code.pk-light .tk-str{color:#8E3B52}
.pk-code.pk-light .tk-num{color:#3F7A5E}.pk-code.pk-light .tk-cm{color:rgba(59,48,50,.42)}
.pk-code.pk-light .tk-fn{color:#37628A}.pk-code.pk-light .tk-op{color:rgba(59,48,50,.6)}
.pk-code .pk-note{padding:12px 26px;border-top:1px solid rgba(255,248,245,.1);font:400 15px 'DM Sans',system-ui,sans-serif;color:rgba(255,248,245,.55)}
.pk-code.pk-light .pk-note{border-top-color:rgba(59,48,50,.1);color:rgba(59,48,50,.55)}
.pk-code .pk-caret{display:inline-block;width:.55em;height:1.05em;vertical-align:-.15em;background:#F7D98B;animation:pk-blink 1s steps(1) infinite}
@keyframes pk-blink{50%{opacity:0}}
@media (prefers-reduced-motion: reduce){.pk-code .pk-caret{animation:none}}
`;

export const CodePackage: PackageDef<CodeSpec> = {
  id: 'code',
  name: 'Caixa de código',
  version: '1.0.0',
  icon: 'code',
  author: 'Dialcron',
  description: 'Janela de código com realce de sintaxe, linhas destacadas e animação de digitação.',
  defaults: {
    file: 'Controls/AgendaUC.cs',
    tag: 'C#',
    lang: 'csharp',
    code: 'await conexao.RunInTransactionAsync(tx =>\n{\n    tx.Insert(novo.Cadastro);\n    tx.Insert(novo.Belo);\n});',
    theme: 'dark',
    fontSize: 24,
    lineHeight: 1.7,
    titlebar: true,
    note: '',
    hl: '',
    lineGlow: true,
    typing: true,
    cps: 48,
    delay: 900,
    caret: true,
    w: 900,
  },
  presets: [
    {
      name: 'C# · transação',
      desc: 'Trecho do AgendaUC com RunInTransactionAsync',
      spec: {
        file: 'Controls/AgendaUC.cs',
        tag: 'C#',
        lang: 'csharp',
        code: 'await conexao.RunInTransactionAsync(tx =>\n{\n    tx.Insert(novo.Cadastro);\n    novo.Belo.Atendimento = novo.Cadastro.Id;\n    tx.Insert(novo.Belo);\n    InserirServicos(tx, novo);\n});',
        note: 'se qualquer passo falhar, a transação inteira é desfeita',
      },
    },
    {
      name: 'YAML · workflow',
      desc: 'Início de um workflow do GitHub Actions',
      spec: {
        file: '.github/workflows/ci.yml',
        tag: 'YAML',
        lang: 'yaml',
        fontSize: 22,
        code: 'name: CI\non:\n  push:\n    branches: [main, develop]\njobs:\n  build-and-test:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: dotnet test -c Release',
      },
    },
    {
      name: 'SQL · consulta',
      desc: 'Exemplo de SELECT com JOIN',
      spec: {
        file: 'consulta.sql',
        tag: 'SQL',
        lang: 'sql',
        code: "SELECT c.Nome, a.DataHora, a.Situacao\nFROM Atendimento a\nJOIN Cadastro c ON c.Id = a.Cadastro\nWHERE a.Situacao <> 'E'\nORDER BY a.DataHora;",
      },
    },
  ],
  box: { w: 900 },
  form: codeForm,
  css: codeCss,
  render: (spec, h: HelperAPI) => {
    const lines = h.hl(spec.code, spec.lang, 'tk-');
    const highlighted = h.range(spec.hl);
    return (
      <div
        className={`pk-code pk-${spec.theme}${spec.typing ? ' pk-typing' : ''}`}
        style={{ width: `${spec.w}px`, maxWidth: '100%' }}
      >
        <div className="pk-win">
          {spec.titlebar ? (
            <div className="pk-bar">
              <span className="pk-dot" />
              <span className="pk-dot" />
              <span className="pk-dot" />
              {spec.file ? <span className="pk-file">{spec.file}</span> : null}
              {spec.tag ? <span className="pk-tag">{spec.tag}</span> : null}
            </div>
          ) : null}
          <pre
            className="pk-pre"
            style={
              {
                '--fs': `${spec.fontSize}px`,
                '--lh': String(spec.lineHeight),
              } as CSSProperties
            }
          >
            {lines.map((line, index) => (
              <span
                key={index}
                className={`pk-ln${highlighted[index + 1] ? ' pk-hl' : ''}`}
                data-n={index + 1}
                dangerouslySetInnerHTML={{ __html: line || ' ' }}
              />
            ))}
          </pre>
          {spec.note ? <div className="pk-note">{spec.note}</div> : null}
        </div>
      </div>
    );
  },
  duration: (spec) =>
    spec.typing ? spec.delay + (spec.code.length / Math.max(1, spec.cps)) * 1000 : 0,
  runtime: (root, spec, api: RuntimeAPI) => {
    const pre = root.querySelector('pre.pk-pre');
    if (!pre) return null;
    const original = pre.innerHTML;
    const lines = Array.from(pre.querySelectorAll('.pk-ln')) as HTMLElement[];
    const texts = lines.map((line) => line.textContent ?? '');
    const total = texts.join('\n').length;
    let cancelled = false;

    const final = () => {
      cancelled = true;
      pre.innerHTML = original;
    };

    if (!spec.typing || api.reduced) return { play: () => undefined, final };

    return {
      play: async () => {
        const caret = spec.caret ? document.createElement('span') : null;
        if (caret) caret.className = 'pk-caret';
        let shown = 0;
        await api.wait(spec.delay);
        for (let i = 0; i < texts.length && !cancelled; i++) {
          const el = lines[i];
          if (!el) continue;
          const text = texts[i] ?? '';
          el.textContent = '';
          if (spec.lineGlow) el.classList.add('pk-hl');
          for (let c = 0; c < text.length; c++) {
            if (cancelled || !api.alive()) return;
            el.textContent += text[c] ?? '';
            shown += 1;
            if (caret) {
              el.appendChild(caret);
            }
            if (shown % 3 === 0 || c === text.length - 1) {
              await api.wait((1000 / Math.max(1, spec.cps)) * (c === text.length - 1 ? 4 : 3));
            }
          }
          if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
          if (spec.lineGlow) el.classList.remove('pk-hl');
        }
        if (caret) caret.remove();
        void total;
      },
      final,
    };
  },
};
