import type { JSX } from 'react';

import type { HelperAPI } from '../core/types';

import {
  cellsOf,
  codeWindowsOf,
  cursorOf,
  dbCellsOf,
  dialogsOf,
  listOf,
  textOf,
  toastsOf,
  type SimRow,
  type SimSpec,
  type SimToast,
} from './SimSpec';

function toneClass(tone: SimRow['tone']): string {
  return tone === 'ok' ? 'pk-sim-ok' : tone === 'danger' ? 'pk-sim-danger' : 'pk-sim-warn';
}

function statusDot(row: SimRow, index: number, statusColumn: number): JSX.Element | null {
  if (index !== statusColumn) return null;
  return <span className={`pk-sim-dotcell ${toneClass(row.tone)}`} aria-hidden="true" />;
}

function toastIcon(toast: SimToast): string {
  if (toast.icon) return toast.icon;
  if (toast.tone === 'error') return '×';
  if (toast.tone === 'success') return '✓';
  if (toast.tone === 'warning') return '!';
  return 'i';
}

/** `Rótulo: valor` -> par (o primeiro `:` separa). */
function pairOf(text: string): [string, string] {
  const at = text.indexOf(':');
  return at < 0 ? ['', text] : [text.slice(0, at + 1).trim(), text.slice(at + 1).trim()];
}

export function SimRenderer({ spec, h }: { spec: SimSpec; h: HelperAPI }): JSX.Element {
  const windows = codeWindowsOf(spec);
  const hasCode = windows.length > 0;
  const toasts = toastsOf(spec);
  const cursor = cursorOf(spec);
  const dialogs = dialogsOf(spec);

  const sideShow = spec.sideShow !== false;
  const tagText = textOf(spec, 'tagText');
  const tableTitle = textOf(spec, 'tableTitle');
  const formTitle = textOf(spec, 'formTitle');
  const validText = textOf(spec, 'validText');
  const codeNote = textOf(spec, 'codeNote');
  const columns = listOf(spec.columns);
  const rows = Array.isArray(spec.rows) ? spec.rows : [];
  const fields = Array.isArray(spec.fields) ? spec.fields : [];
  const buttons = Array.isArray(spec.buttons) ? spec.buttons : [];
  const buttonsAtTable = spec.buttonsAt === 'table';
  const items = Array.isArray(spec.items) ? spec.items : [];
  const hasTable = columns.length > 0;
  const hasForm = fields.length > 0 || (buttons.length > 0 && !(buttonsAtTable && hasTable));
  const hasList = items.length > 0 || Boolean(spec.listTitle);
  const hasSum = Boolean(spec.sumValue);
  const hasPanel = hasTable || hasForm || Boolean(spec.heading) || Boolean(spec.date);

  const chips = Array.isArray(spec.txChips) ? spec.txChips : [];
  const dbColumns = listOf(spec.dbColumns);
  const dbRows = Array.isArray(spec.dbRows) ? spec.dbRows : [];
  const notes = listOf(spec.txNote);
  const hasTx = chips.length > 0 || dbColumns.length > 0;
  const stateText = textOf(spec, 'txState');
  const stateTone = spec.txStateTone ?? 'ok';

  const buttonsRow =
    buttons.length > 0 ? (
      <div className="pk-sim-btns">
        {buttons.map((button) => (
          <span
            key={button.label}
            className={`pk-sim-btn is-${button.tone ?? 'primary'}`}
            data-sim-btn={button.label}
          >
            {button.label}
          </span>
        ))}
      </div>
    ) : null;

  let lineIndex = 0;

  return (
    <div className="pk-sim" style={{ maxWidth: `${spec.width}px` }}>
      <div
        className={`pk-sim-grid${hasCode ? '' : ' is-code-off'}`}
        style={
          hasCode
            ? { gridTemplateColumns: `${Math.round(spec.width * 0.45)}px minmax(0,1fr)` }
            : undefined
        }
      >
        {hasCode ? (
          <div className="pk-sim-col">
            {windows.map((win, winIndex) => (
              <div className="pk-sim-code-win" key={`code-${winIndex}`}>
                <div className="pk-sim-code-top">
                  <span className="pk-sim-dots">
                    <i key="dot-1" />
                    <i key="dot-2" />
                    <i key="dot-3" />
                  </span>
                  <span className="pk-sim-file">{win.file}</span>
                  {win.tag ? <span className="pk-sim-tag">{win.tag}</span> : null}
                </div>
                <pre
                  className="pk-sim-code"
                  style={{ fontSize: `${spec.codeFontSize}px`, lineHeight: spec.codeLineHeight }}
                >
                  <code>
                    {h.hl(win.code, win.lang || spec.codeLang, 'pk-sim-tk-').map((line, index) => {
                      const globalIndex = lineIndex;
                      lineIndex += 1;
                      return (
                        <span
                          key={`line-${index}`}
                          className="pk-sim-ln"
                          data-line={globalIndex}
                          data-n={index + 1}
                          // HTML já escapado/realçado pelo helper do core.
                          dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                        />
                      );
                    })}
                  </code>
                </pre>
                {codeNote && winIndex === windows.length - 1 ? (
                  <div className="pk-sim-fail">{codeNote}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="pk-sim-col">
          <div className="pk-sim-app">
            <div className="pk-sim-bar">
              <span className="pk-sim-dot" />
              {spec.appName}
              {tagText ? <span className="pk-sim-simtag">{tagText}</span> : null}
              <span className="pk-sim-winbtns">
                <i key="min">–</i>
                <i key="max">▢</i>
                <i key="close">✕</i>
              </span>
            </div>
            <div className={`pk-sim-body${sideShow ? '' : ' is-side-off'}`}>
              {sideShow ? (
                <div className="pk-sim-side">
                  {spec.logoImage ? (
                    <div
                      className="pk-sim-logo is-image"
                      aria-hidden="true"
                      style={{
                        backgroundImage: /^(var|url)\(/.test(spec.logoImage)
                          ? spec.logoImage
                          : `url("${spec.logoImage}")`,
                      }}
                    />
                  ) : (
                    <div className="pk-sim-logo" aria-hidden="true">
                      {spec.logoText || spec.appName.trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  {spec.subtitle ? <div className="pk-sim-sub">{spec.subtitle}</div> : null}
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
              ) : null}
              <div className={`pk-sim-main${hasPanel ? '' : ' is-flush'}`}>
                {spec.heading || spec.date ? (
                  <div className="pk-sim-head">
                    <b>{spec.heading}</b>
                    {spec.date ? <span className="pk-sim-date">{spec.date}</span> : null}
                  </div>
                ) : null}

                {hasTable ? (
                  <div className="pk-sim-grp">
                    {tableTitle ? <div className="pk-sim-grp-t">{tableTitle}</div> : null}
                    {buttonsAtTable ? buttonsRow : null}
                    <table className="pk-sim-table">
                      <thead>
                        <tr>
                          {columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            data-sim-row={rowIndex}
                            className={[
                              row.isNew ? 'is-new' : '',
                              row.leaves ? 'is-out is-hidden' : '',
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
                ) : null}

                {hasForm ? (
                  <div className="pk-sim-grp">
                    {formTitle ? <div className="pk-sim-grp-t">{formTitle}</div> : null}
                    {validText ? (
                      <span className="pk-sim-valid is-on" data-sim-valid>
                        {validText}
                      </span>
                    ) : null}
                    {buttonsAtTable && hasTable ? null : buttonsRow}
                    {fields.length > 0 ? (
                      <div className="pk-sim-fields">
                        {fields.map((field) => (
                          <div className="pk-sim-fld" key={field.label}>
                            <label>{field.label}</label>
                            <div>{field.value}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {hasList ? (
                  <div className="pk-sim-list">
                    <div className="pk-sim-list-h">
                      <b>{spec.listTitle}</b>
                      {spec.listSub ? <span>{spec.listSub}</span> : null}
                      {spec.listAction ? (
                        <span className="pk-sim-btn is-primary" data-sim-btn={spec.listAction}>
                          {spec.listAction}
                        </span>
                      ) : null}
                    </div>
                    {items.map((item, index) => (
                      <div className="pk-sim-item is-ok" key={index} data-sim-item={index}>
                        <span className="pk-sim-item-ic" aria-hidden="true">
                          ✓
                        </span>
                        {item.label}
                      </div>
                    ))}
                  </div>
                ) : null}

                {hasSum ? (
                  <div className="pk-sim-sum">
                    <div className="pk-sim-sum-n" data-sim-sum>
                      {spec.sumValue}
                    </div>
                    <div className="pk-sim-sum-t">
                      <b>{spec.sumLabel}</b>
                      {spec.sumSub ? <span>{spec.sumSub}</span> : null}
                    </div>
                    <div className="pk-sim-sum-bar">
                      <i data-sim-sumbar />
                    </div>
                  </div>
                ) : null}

                <div className="pk-sim-dim" data-sim-dim />
                <div className="pk-sim-toasts" data-sim-toasts>
                  {toasts.map((toast) => (
                    <div
                      key={toast.id}
                      className={`pk-sim-toast is-${toast.tone ?? 'info'}${toast.visible ? ' is-show' : ''}`}
                      data-sim-toast={toast.id}
                    >
                      <div className="pk-sim-toast-ic">{toastIcon(toast)}</div>
                      <div className="pk-sim-toast-body">
                        <span className="pk-sim-toast-app">{toast.app}</span>
                        <b>{toast.title}</b>
                        <p>{toast.body}</p>
                        {toast.action ? (
                          <span className="pk-sim-toast-action">{toast.action}</span>
                        ) : null}
                      </div>
                      <span className="pk-sim-toast-time">{toast.time ?? 'agora'}</span>
                    </div>
                  ))}
                </div>

                {dialogs.map((dialog) => (
                  <div
                    key={dialog.id}
                    className={`pk-sim-msg is-${dialog.kind}`}
                    data-sim-msg={dialog.id}
                  >
                    <div className="pk-sim-msg-bar">
                      <span>{dialog.title}</span>
                      <span>✕</span>
                    </div>
                    {dialog.kind === 'file' ? (
                      <div className="pk-sim-file-body">
                        {listOf(dialog.rows).map((row, index) => {
                          const [label, value] = pairOf(row);
                          return (
                            <div className="pk-sim-file-row" key={index}>
                              <span>{label}</span>
                              <div>{value}</div>
                            </div>
                          );
                        })}
                        {dialog.text ? <p>{dialog.text}</p> : null}
                      </div>
                    ) : (
                      <div className="pk-sim-msg-body">
                        <span className="pk-sim-msg-ic">
                          {dialog.kind === 'error' ? '×' : dialog.kind === 'question' ? '?' : 'i'}
                        </span>
                        <p style={{ margin: 0 }}>{dialog.text}</p>
                      </div>
                    )}
                    <div className="pk-sim-msg-foot">
                      {listOf(dialog.buttons).map((label) => (
                        <u key={label} data-sim-btn={label}>
                          {label}
                        </u>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {cursor.visible ? (
              <div
                className={`pk-sim-cursor${cursor.trail ? ' has-trail' : ''}`}
                data-sim-cursor
                style={{
                  left: `${cursor.x}%`,
                  top: `${cursor.y}%`,
                  width: `${cursor.size}px`,
                  height: `${cursor.size}px`,
                }}
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  <path
                    d="M4 2 24 14l-9 1.8L10 25z"
                    fill="#fff"
                    stroke="#1E1B1C"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : null}
          </div>

          {hasTx ? (
            <div className="pk-sim-tx">
              <div className="pk-sim-tx-h">
                <span>{spec.txTitle}</span>
                {stateText ? (
                  <span className={`pk-sim-tx-state is-${stateTone}`} data-sim-state>
                    {stateText}
                  </span>
                ) : null}
              </div>
              {chips.length > 0 ? (
                <div className="pk-sim-tx-row">
                  {chips.map((chip, index) => (
                    <span key={`${chip.table}-${index}`} style={{ display: 'contents' }}>
                      {index > 0 ? (
                        <i key={`arrow-${index}`} className="pk-sim-ar" data-sim-ar>
                          {chip.arrow || '→'}
                        </i>
                      ) : null}
                      <div
                        key={`chip-${index}`}
                        className="pk-sim-chip is-ok"
                        data-sim-chip={index}
                      >
                        <b>{chip.table}</b>
                        <span>{chip.detail}</span>
                      </div>
                    </span>
                  ))}
                </div>
              ) : null}
              {dbColumns.length > 0 ? (
                <table className="pk-sim-db">
                  <thead>
                    <tr>
                      {dbColumns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dbRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        data-sim-dbrow={rowIndex}
                        className={row.highlight ? 'is-hl' : undefined}
                      >
                        {dbCellsOf(row.cells).map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {notes.length > 0 ? (
                <div className="pk-sim-notes">
                  {notes.map((note, index) => (
                    <span className="pk-sim-note is-on" data-sim-note={index} key={index}>
                      {note}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
