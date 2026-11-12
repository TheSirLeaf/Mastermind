import { createElement } from 'react';

import type { HelperAPI, PackageDef, Preset } from '../core/types';

import { codeCss } from './code.css';
import { CodeRenderer, type CodeSpec } from './CodeRenderer';
import { codeRuntime } from './CodeRuntime';
import { codeForm } from './formSchema';

export type { CodeSpec };

export const codeDefaults: CodeSpec = {
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
  variant: 'typing',
  lineNumbers: false,
  palette: 'default',
};

export const codePresets: Preset<CodeSpec>[] = [
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
];

export const CodePackage: PackageDef<CodeSpec> = {
  id: 'code',
  name: 'Caixa de código',
  version: '1.0.0',
  icon: 'code',
  category: 'Código',
  author: 'Dialcron',
  description: 'Janela de código com realce de sintaxe, linhas destacadas e animação de digitação.',
  defaults: codeDefaults,
  presets: codePresets,
  box: { w: 900 },
  form: codeForm,
  css: codeCss,
  transitions: [
    {
      id: 'glitch',
      name: 'Glitch',
      description: 'O slide treme e se desfaz em cores antes do próximo aparecer.',
      css: '.t-out{animation:pkGlitchOut .6s steps(12,end) both}.t-in{animation:pkGlitchIn .6s steps(12,end) both}@keyframes pkGlitchOut{0%{transform:none;filter:none}30%{transform:translateX(-30px) skewX(6deg);filter:hue-rotate(90deg)}60%{transform:translateX(24px);filter:hue-rotate(200deg) contrast(1.4)}100%{transform:translateX(-10px);opacity:0}}@keyframes pkGlitchIn{0%{opacity:0;transform:translateX(30px) skewX(-6deg);filter:hue-rotate(-90deg)}60%{opacity:1;transform:translateX(-12px);filter:hue-rotate(-40deg)}100%{transform:none;filter:none}}',
    },
  ],
  render: (spec, h: HelperAPI) => createElement(CodeRenderer, { spec, h }),
  duration: (spec) =>
    spec.typing
      ? (spec.delay ?? 0) +
        (spec.code.replace(/\s+/g, ' ').length * 1000) / Math.max(5, spec.cps || 48) +
        1200
      : 0,
  // Referência direta (não wrapper): o runtime é serializado via String() no
  // export e precisa reviver autossuficiente no host do HTML standalone.
  runtime: codeRuntime,
};
