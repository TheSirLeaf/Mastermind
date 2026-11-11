import type { CSSProperties } from 'react';

import type { HelperAPI, PackageSpec } from '../core/types';

export interface CodeRendererProps {
  spec: CodeSpec;
  h: HelperAPI;
}

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

export function CodeRenderer({ spec, h }: CodeRendererProps): JSX.Element {
  const lines = h.hl(spec.code, spec.lang, 'tk-');
  const highlighted = h.range(spec.hl);
  return (
    <div
      data-testid="pk-code-container"
      className={`pk-code pk-${spec.theme}${spec.typing ? ' pk-typing' : ''}`}
      style={{ width: `${spec.w}px`, maxWidth: '100%' }}
    >
      <div className="pk-win">
        {spec.titlebar ? (
          <div data-testid="pk-titlebar" className="pk-bar">
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
              data-testid={`pk-code-line-${index + 1}`}
              className={`pk-ln${highlighted[index + 1] ? ' pk-hl' : ''}`}
              data-n={index + 1}
              dangerouslySetInnerHTML={{ __html: line || ' ' }}
            />
          ))}
        </pre>
        {spec.note ? (
          <div data-testid="pk-note" className="pk-note">
            {spec.note}
          </div>
        ) : null}
      </div>
    </div>
  );
}
