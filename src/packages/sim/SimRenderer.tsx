import type { JSX } from 'react';

import type { HelperAPI } from '../core/types';

import { cellsOf, listOf, type SimRow, type SimSpec } from './SimSpec';

function toneClass(tone: SimRow['tone']): string {
  return tone === 'ok' ? 'pk-sim-ok' : tone === 'danger' ? 'pk-sim-danger' : 'pk-sim-warn';
}

function statusDot(row: SimRow, index: number, statusColumn: number): JSX.Element | null {
  if (index !== statusColumn) return null;
  return <span className={`pk-sim-dotcell ${toneClass(row.tone)}`} aria-hidden="true" />;
}

export function SimRenderer({ spec, h }: { spec: SimSpec; h: HelperAPI }): JSX.Element {
  const codeLines = spec.codeEnabled
    ? h.hl(spec.codeCode, spec.codeLang, 'pk-sim-tk-')
    : [];
  const hasTx = spec.txChips.length > 0;

  return (
    <div className="pk-sim" style={{ maxWidth: `${spec.width}px` }}>
      <div
        className={`pk-sim-grid${spec.codeEnabled ? '' : ' is-code-off'}`}
        style={
          spec.codeEnabled
            ? { gridTemplateColumns: `${Math.round(spec.width * 0.45)}px minmax(0,1fr)` }
            : undefined
        }
      >
        {spec.codeEnabled ? (
          <div className="pk-sim-col">
            <div className="pk-sim-code-win">
              <div className="pk-sim-code-top">
                <span className="pk-sim-dots">
                  <i key="dot-1" />
                  <i key="dot-2" />
                  <i key="dot-3" />
                </span>
                <span className="pk-sim-file">{spec.codeFile}</span>
                <span className="pk-sim-tag">{spec.codeTag}</span>
              </div>
              <pre
                className="pk-sim-code"
                style={{ fontSize: `${spec.codeFontSize}px`, lineHeight: spec.codeLineHeight }}
              >
                <code>
                  {codeLines.map((line, index) => (
                    <span
                      key={`line-${index}`}
                      className="pk-sim-ln"
                      data-line={index}
                      data-n={index + 1}
                      // HTML já escapado/realçado pelo helper do core.
                      dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                    />
                  ))}
                </code>
              </pre>
              <div className="pk-sim-fail">
                <b>×</b> falhou em qualquer linha da transação? nada é gravado
              </div>
            </div>
          </div>
        ) : null}

        <div className="pk-sim-col">
          <div className="pk-sim-app">
            <div className="pk-sim-bar">
              <span className="pk-sim-dot" />
              {spec.appName}
              <span className="pk-sim-simtag">SIMULAÇÃO</span>
              <span className="pk-sim-winbtns">
                <i key="min">–</i>
                <i key="max">▢</i>
                <i key="close">✕</i>
              </span>
            </div>
            <div className="pk-sim-body">
              <div className="pk-sim-side">
                <div className="pk-sim-logo" aria-hidden="true">
                  D
                </div>
                <div className="pk-sim-sub">{spec.subtitle}</div>
                {listOf(spec.menu).map((item) => (
                  <div
                    key={item}
                    className={`pk-sim-sidebtn${item === spec.activeMenu ? ' is-active' : ''}`}
                    data-sim-menu={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="pk-sim-main">
                <div className="pk-sim-head">
                  <b>{spec.heading}</b>
                  <span className="pk-sim-date">{spec.date}</span>
                </div>

                <div className="pk-sim-grp">
                  <div className="pk-sim-grp-t">Atendimentos do dia</div>
                  <table className="pk-sim-table">
                    <thead>
                      <tr>
                        {listOf(spec.columns).map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {spec.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          data-sim-row={rowIndex}
                          className={[
                            row.isNew ? 'is-new' : '',
                            row.highlight ? 'is-hl' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {cellsOf(row).map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              {statusDot(row, cellIndex, spec.statusColumn)}
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pk-sim-grp">
                  <div className="pk-sim-grp-t">Atendimento</div>
                  <span className="pk-sim-valid is-on" data-sim-valid>
                    ✓ formulário válido
                  </span>
                  <div className="pk-sim-btns">
                    {spec.buttons.map((button) => (
                      <span
                        key={button.label}
                        className={`pk-sim-btn is-${button.tone ?? 'primary'}`}
                        data-sim-btn={button.label}
                      >
                        {button.label}
                      </span>
                    ))}
                  </div>
                  <div className="pk-sim-fields">
                    {spec.fields.map((field) => (
                      <div className="pk-sim-fld" key={field.label}>
                        <label>{field.label}</label>
                        <div>{field.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pk-sim-dim" data-sim-dim />
                {(['success', 'error', 'confirm'] as const).map((kind) => {
                  const text =
                    kind === 'success' ? spec.msgSuccess : kind === 'error' ? spec.msgError : spec.msgConfirm;
                  if (!text) return null;
                  return (
                    <div
                      key={kind}
                      className={`pk-sim-msg${kind === 'error' ? ' is-error' : ''}`}
                      data-sim-msg={kind}
                    >
                      <div className="pk-sim-msg-bar">
                        <span>{spec.heading}</span>
                        <span>✕</span>
                      </div>
                      <div className="pk-sim-msg-body">
                        <span className="pk-sim-msg-ic">{kind === 'error' ? '×' : kind === 'confirm' ? '?' : 'i'}</span>
                        <p style={{ margin: 0 }}>{text}</p>
                      </div>
                      <div className="pk-sim-msg-foot">
                        <u>{kind === 'confirm' ? 'Sim' : 'OK'}</u>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {hasTx ? (
            <div className="pk-sim-tx">
              <div className="pk-sim-tx-h">
                <span>{spec.txTitle}</span>
                <span className="pk-sim-tx-state is-ok" data-sim-state>
                  COMMIT ✓
                </span>
              </div>
              <div className="pk-sim-tx-row">
                {spec.txChips.map((chip, index) => (
                  <span key={`${chip.table}-${index}`} style={{ display: 'contents' }}>
                    {index > 0 ? (
                      <i key={`arrow-${index}`} className="pk-sim-ar" data-sim-ar>
                        {index === 1 ? 'FK →' : '→'}
                      </i>
                    ) : null}
                    <div key={`chip-${index}`} className="pk-sim-chip is-ok" data-sim-chip={index}>
                      <b>{chip.table}</b>
                      <span>{chip.detail}</span>
                    </div>
                  </span>
                ))}
              </div>
              <div className="pk-sim-note is-on" data-sim-note>
                {spec.txNote}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
