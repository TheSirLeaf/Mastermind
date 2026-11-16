export const simCss = `
.pk-sim{width:100%;color:#3B3032;font-family:'DM Sans',system-ui,sans-serif}
.pk-sim-grid{display:grid;grid-template-columns:760px minmax(0,1fr);gap:36px;align-items:start}
.pk-sim-grid.is-code-off{grid-template-columns:minmax(0,1fr)}
.pk-sim-col{display:grid;gap:16px;align-content:start;min-width:0}

.pk-sim-code-win{background:#17060D;border:1px solid rgba(247,217,139,.25);border-radius:22px;overflow:hidden;box-shadow:0 30px 70px rgba(10,2,6,.5)}
.pk-sim-code-top{display:flex;align-items:center;gap:14px;padding:14px 20px;background:rgba(255,248,245,.05);border-bottom:1px solid rgba(255,248,245,.08);color:rgba(255,248,245,.75)}
.pk-sim-dots{display:flex;gap:6px}
.pk-sim-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,248,245,.2)}
.pk-sim-dots i:first-child{background:#C95C62}.pk-sim-dots i:nth-child(2){background:#D6A84F}.pk-sim-dots i:nth-child(3){background:#72A68A}
.pk-sim-file{font:500 13px ui-monospace,Consolas,monospace;color:rgba(255,248,245,.55)}
.pk-sim-tag{margin-left:auto;font:700 11px 'DM Sans',system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#F7D98B}
.pk-sim-code{margin:0;padding:20px 24px;color:#FFF8F5;font:400 17px/1.6 ui-monospace,'Cascadia Mono',Consolas,monospace;white-space:pre;tab-size:2;overflow:visible}
.pk-sim-code code{display:block;background:none;border:0;border-radius:0;padding:0;margin:0;font:inherit;color:inherit}
.pk-sim-ln{display:block;position:relative;padding:0 24px;margin:0 -24px;min-height:1.6em;border-left:3px solid transparent;transition:background .3s,border-color .3s}
.pk-sim-nums .pk-sim-ln{padding-left:62px}
.pk-sim-ln::before{display:none;content:attr(data-n);position:absolute;left:22px;width:26px;text-align:right;color:rgba(255,248,245,.28);font-size:.8em}
.pk-sim-nums .pk-sim-ln::before{display:block}
.pk-sim-ln.is-cur{background:rgba(247,217,139,.09);border-left-color:#F7D98B}
.pk-sim-ln.is-err{background:rgba(201,92,98,.18);border-left-color:#C95C62}
.pk-sim-h{visibility:hidden}
.pk-sim-caret{position:relative;display:inline-block;width:0;height:1em}
.pk-sim-caret::after{content:"";position:absolute;left:1px;top:-.1em;width:2px;height:1.2em;background:#F7D98B;animation:pk-sim-blink 1s steps(1) infinite}
@keyframes pk-sim-blink{50%{opacity:0}}
@media print{.pk-sim-h{visibility:visible!important}.pk-sim-caret{display:none}}
.pk-sim-tk-kw{color:#F7D98B}.pk-sim-tk-str{color:#C77C8A}.pk-sim-tk-num{color:#72A68A}
.pk-sim-tk-cm{color:rgba(255,248,245,.35);font-style:italic}.pk-sim-tk-fn{color:#8FB8D8}
.pk-sim-tk-ty{color:#E0B7C1}.pk-sim-tk-op{color:rgba(255,248,245,.55)}
.pk-sim-fail{margin:0 20px 18px;padding:10px 14px;border-radius:10px;background:rgba(201,92,98,.12);border:1px solid rgba(201,92,98,.3);color:rgba(255,248,245,.65);font-size:13px;display:flex;gap:10px;align-items:center}
.pk-sim-fail b{color:#E78E93}

.pk-sim-app{position:relative;background:#FFF8F5;border-radius:16px;overflow:hidden;color:#3B3032;box-shadow:0 30px 70px rgba(10,2,6,.5),0 0 0 1px rgba(247,217,139,.25);font-size:14px}
.pk-sim-bar{height:36px;background:#F5E8E5;display:flex;align-items:center;gap:9px;padding-left:13px;font-size:13px;color:#5C4B4E;border-bottom:1px solid #E9D4D0}
.pk-sim-dot{width:13px;height:13px;border-radius:4px;background:linear-gradient(135deg,#8E3B52,#C77C8A)}
.pk-sim-simtag{font-size:9.5px;letter-spacing:.16em;font-weight:700;color:#A0455F;border:1px solid rgba(160,69,95,.4);border-radius:999px;padding:2px 8px;margin-left:6px}
.pk-sim-winbtns{margin-left:auto;display:flex}
.pk-sim-winbtns i{width:42px;height:36px;display:grid;place-items:center;font-style:normal;font-size:13px;color:#5C4B4E}
.pk-sim-body{display:grid;grid-template-columns:158px minmax(0,1fr)}
.pk-sim-side{background:#FFF8F5;border-right:1px solid #EBD6D4;padding:14px 12px;display:flex;flex-direction:column;gap:8px}
.pk-sim-logo{width:74px;height:74px;margin:0 auto;border-radius:16px;background:linear-gradient(135deg,#4A1B2C,#C77C8A);display:grid;place-items:center;color:#F7D98B;font:600 34px/1 'Cormorant Garamond',Georgia,serif}
.pk-sim-sub{font-size:10.5px;text-align:center;color:#75696B;margin:-2px 0 6px;line-height:1.25}
.pk-sim-sidebtn{background:#8E3B52;color:#fff;border-radius:7px;padding:8px 0;text-align:center;font-weight:700;font-size:12.5px;transition:transform .2s,background .2s,box-shadow .2s}
.pk-sim-sidebtn.is-active{background:#4A1B2C;box-shadow:inset 0 0 0 1px rgba(247,217,139,.35)}
.pk-sim-sidebtn.is-press{transform:scale(.95);background:#C77C8A;box-shadow:0 0 0 4px rgba(247,217,139,.5)}
.pk-sim-main{padding:14px 18px 16px;display:flex;flex-direction:column;gap:11px;background:#FFF8F5;min-width:0}
.pk-sim-head{display:flex;align-items:center;justify-content:space-between}
.pk-sim-head b{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#8E3B52;font-weight:600;line-height:1}
.pk-sim-date{border:1px solid #D9BFC0;border-radius:6px;padding:4px 10px;background:#fff;font-size:12.5px;white-space:nowrap}
.pk-sim-grp{border:1px solid #E6CFCF;border-radius:9px;padding:12px 12px 10px;position:relative;background:#fff;margin-top:4px}
.pk-sim-grp-t{position:absolute;top:-9px;left:10px;background:#FFF8F5;padding:0 7px;font-size:11.5px;font-weight:700;color:#8E3B52}
.pk-sim-table{width:100%;border-collapse:collapse;font-size:11.5px}
.pk-sim-table th{text-align:left;font-weight:600;color:#75696B;padding:5px 6px;border-bottom:1px solid #E6CFCF;white-space:nowrap}
.pk-sim-table td{padding:6px;border-bottom:1px solid #F0E0DF;white-space:nowrap}
.pk-sim-table tr:last-child td{border-bottom:none}
.pk-sim-table tr.is-hidden{display:none}
.pk-sim-table tr.is-hl td{background:rgba(247,217,139,.2)}
.pk-sim-dotcell{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:1px}
.pk-sim-ok{background:#72A68A}.pk-sim-warn{background:#D6A84F}.pk-sim-danger{background:#C95C62}
.pk-sim-valid{display:none;margin-bottom:8px;font-size:12px;color:#3F7A5E;font-weight:600}
.pk-sim-valid.is-on{display:inline-block}
.pk-sim-btns{display:flex;gap:8px;margin:8px 0 10px}
.pk-sim-btn{border-radius:6px;padding:6px 16px;font-size:12px;font-weight:700;border:1px solid transparent;transition:transform .2s,box-shadow .2s,background .2s}
.pk-sim-btn.is-primary{background:#8E3B52;color:#fff}
.pk-sim-btn.is-secondary{background:#fff;color:#8E3B52;border-color:#D9BFC0}
.pk-sim-btn.is-danger{background:#C95C62;color:#fff}
.pk-sim-btn.is-press{transform:scale(.94);box-shadow:0 0 0 4px rgba(247,217,139,.55)}
.pk-sim-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}
.pk-sim-fld label{display:block;font-size:10.5px;color:#75696B;margin-bottom:2px}
.pk-sim-fld div{background:#fff;border:1px solid #D9BFC0;border-radius:5px;padding:5px 8px;font-size:12px;min-height:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-sim-dim{position:absolute;inset:0;background:rgba(20,6,12,.28);opacity:0;pointer-events:none;transition:opacity .25s;z-index:4}
.pk-sim-dim.is-show{opacity:1}
.pk-sim-msg{position:absolute;z-index:5;left:50%;top:50%;transform:translate(-50%,-50%) scale(.96);width:340px;background:#FFF8F5;border:1px solid #D9BFC0;border-radius:8px;box-shadow:0 24px 60px rgba(10,2,6,.45);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
.pk-sim-msg.is-show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.pk-sim-msg-bar{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:#F5E8E5;border-bottom:1px solid #E9D4D0;font-size:11.5px;color:#5C4B4E}
.pk-sim-msg-body{display:flex;gap:10px;align-items:flex-start;padding:16px 14px;font-size:12.5px;line-height:1.4}
.pk-sim-msg-ic{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:rgba(114,166,138,.18);color:#3F7A5E;font-weight:700;flex:none}
.pk-sim-msg.is-error .pk-sim-msg-ic{background:rgba(201,92,98,.18);color:#A33E45}
.pk-sim-msg-foot{padding:0 14px 12px;text-align:right}
.pk-sim-msg-foot u{font-size:11.5px;color:#8E3B52;text-decoration:none;border:1px solid #D9BFC0;border-radius:4px;padding:3px 16px;background:#fff}

.pk-sim-tx{background:rgba(247,217,139,.06);border:1px solid rgba(247,217,139,.18);border-radius:14px;padding:14px 18px;color:#FFF8F5}
.slide.light .pk-sim-tx{background:rgba(74,27,44,.04);border-color:rgba(74,27,44,.14);color:#3B3032}
.pk-sim-tx-h{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,248,245,.45)}
.slide.light .pk-sim-tx-h{color:rgba(59,48,50,.5)}
.pk-sim-tx-state{font-weight:700;color:rgba(255,248,245,.55);letter-spacing:.06em}
.slide.light .pk-sim-tx-state{color:rgba(59,48,50,.6)}
.pk-sim-tx-state.is-begin{color:#D6A84F}.pk-sim-tx-state.is-ok{color:#8FD0AE}.pk-sim-tx-state.is-rollback{color:#E78E93}
.pk-sim-tx-row{display:flex;align-items:center;gap:9px;margin-top:12px;flex-wrap:wrap}
.pk-sim-chip{border:1px solid rgba(247,217,139,.3);border-radius:9px;padding:7px 10px;min-width:0;transition:opacity .3s,border-color .3s,background .3s}
.pk-sim-chip b{display:block;font:600 11.5px ui-monospace,Consolas,monospace;color:#F7D98B;white-space:nowrap}
.pk-sim-chip span{display:block;font-size:10.5px;color:rgba(255,248,245,.45);margin-top:2px;white-space:nowrap}
.slide.light .pk-sim-chip b{color:#8E3B52}.slide.light .pk-sim-chip span{color:rgba(59,48,50,.55)}
.pk-sim-chip.is-pending{border-style:dashed;opacity:.45}
.pk-sim-chip.is-ok{border-color:rgba(114,166,138,.55)}
.pk-sim-chip.is-fail{border-color:rgba(201,92,98,.7);background:rgba(201,92,98,.14)}
.pk-sim-chip.is-fail span{color:#E78E93}
.pk-sim-chip.is-undo{opacity:.45}
.pk-sim-ar{font-size:10px;color:rgba(247,217,139,.45);flex:none}
.slide.light .pk-sim-ar{color:rgba(142,59,82,.45)}
.pk-sim-note{margin-top:10px;font-size:11px;color:#F7D98B;opacity:0;transition:opacity .4s}
.pk-sim-note.is-on{opacity:1}
.pk-sim.is-rollback .pk-sim-code-win{border-color:rgba(201,92,98,.45)}

/* janela sem lateral, logo por imagem, linha selecionada */
.pk-sim-body.is-side-off{grid-template-columns:minmax(0,1fr)}
.pk-sim-main{position:relative}
.pk-sim-main.is-flush{padding:0;gap:0}
.pk-sim-logo.is-image{background:center/contain no-repeat;border-radius:0}
.pk-sim-table tr.is-sel td{background:#F3D6D5}
.pk-sim-tx-state.is-idle{color:rgba(255,248,245,.5)}
.slide.light .pk-sim-tx-state.is-idle{color:rgba(59,48,50,.5)}

/* lista de tarefas e resumo */
.pk-sim-list{padding:6px 0}
.pk-sim-main:not(.is-flush) .pk-sim-list{border:1px solid #E6CFCF;border-radius:9px;background:#fff}
.pk-sim-list-h{display:flex;align-items:center;gap:12px;padding:12px 20px 8px}
.pk-sim-list-h b{font-size:15px}
.pk-sim-list-h>span:not(.pk-sim-btn){font-size:13px;color:#75696B}
.pk-sim-list-h .pk-sim-btn{margin-left:auto}
.pk-sim-item{display:flex;align-items:center;gap:12px;padding:7px 20px;font:400 14px ui-monospace,Consolas,monospace;color:#3B3032;border-left:3px solid transparent;transition:background .25s,border-color .25s}
.pk-sim-item-ic{flex:none;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;background:#72A68A;color:#fff;box-sizing:border-box}
.pk-sim-item.is-idle .pk-sim-item-ic{background:#D9C9C6;color:transparent}
.pk-sim-item.is-fail .pk-sim-item-ic{background:#C95C62}
.pk-sim-item.is-run .pk-sim-item-ic{background:transparent;border:2px solid #D6A84F;border-top-color:transparent;color:transparent;animation:pkSimSpin .7s linear infinite}
.pk-sim-item.is-mark{background:rgba(247,217,139,.25);border-left-color:#D6A84F}
@keyframes pkSimSpin{to{transform:rotate(360deg)}}
.pk-sim-sum{display:flex;align-items:center;gap:18px;padding:12px 20px 16px;border-top:1px solid #EBD6D4;background:#FBF1EE}
.pk-sim-main:not(.is-flush) .pk-sim-sum{border:1px solid #EBD6D4;border-radius:9px}
.pk-sim-sum-n{font:600 54px/1 'Cormorant Garamond',Georgia,serif;color:#3C7A5A;font-variant-numeric:lining-nums;min-width:96px}
.pk-sim-sum-t{font-size:15px;line-height:1.35;color:#5C4B4E}
.pk-sim-sum-t b,.pk-sim-sum-t span{display:block}
.pk-sim-sum-bar{flex:1;height:10px;border-radius:999px;background:#E6D4D1;overflow:hidden}
.pk-sim-sum-bar i{display:block;height:100%;background:linear-gradient(90deg,#72A68A,#9CC9B4);transform-origin:left}

/* diálogos próprios */
.pk-sim-msg-foot{display:flex;justify-content:flex-end;gap:8px}
.pk-sim-msg-foot u{transition:transform .2s,box-shadow .2s}
.pk-sim-msg-foot u.is-press{transform:scale(.95);box-shadow:0 0 0 3px rgba(247,217,139,.6)}
.pk-sim-msg.is-question .pk-sim-msg-ic{background:rgba(214,168,79,.2);color:#9A6B12}
.pk-sim-msg.is-file{width:460px}
.pk-sim-file-body{display:grid;gap:8px;padding:14px}
.pk-sim-file-row{display:grid;grid-template-columns:80px minmax(0,1fr);align-items:center;gap:8px}
.pk-sim-file-row span{text-align:right;font-size:11.5px;color:#75696B}
.pk-sim-file-row div{border:1px solid #D9BFC0;border-radius:4px;background:#fff;padding:4px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-sim-file-body p{margin:0;font-size:11.5px;color:#75696B}

/* painel inferior: tabela e notas */
.pk-sim-db{width:100%;border-collapse:collapse;font:400 12.5px ui-monospace,Consolas,monospace;margin-top:10px}
.pk-sim-db th{text-align:left;font-size:10.5px;letter-spacing:.1em;color:rgba(255,248,245,.45);padding:3px 10px;font-weight:700}
.pk-sim-db td{padding:6px 10px;border-top:1px solid rgba(255,248,245,.08);color:rgba(255,248,245,.8);transition:color .3s}
.pk-sim-db tr.is-hl td{background:rgba(247,217,139,.1)}
.pk-sim-db td.is-danger{color:#F0A0A5;font-weight:700}.pk-sim-db td.is-warn{color:#F7D98B;font-weight:700}.pk-sim-db td.is-ok{color:#9CC9B4;font-weight:700}
.slide.light .pk-sim-db th{color:rgba(59,48,50,.5)}
.slide.light .pk-sim-db td{color:#3B3032;border-top-color:rgba(59,48,50,.1)}
.pk-sim-notes{display:flex;flex-wrap:wrap;gap:4px 14px}
.slide.light .pk-sim-note{color:#8E3B52}

/* Windows 11 notifications */
.pk-sim-toasts{position:absolute;top:14px;right:14px;width:320px;display:flex;flex-direction:column;gap:8px;z-index:8;pointer-events:none}
.pk-sim-toast{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;padding:11px 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(30,30,32,.94);backdrop-filter:blur(18px);box-shadow:0 16px 42px rgba(0,0,0,.38);color:#fff;opacity:0;transform:translateX(118%);transition:opacity .28s ease,transform .28s cubic-bezier(.2,.8,.25,1)}
.pk-sim-toast.is-show{opacity:1;transform:none}
.pk-sim-toast.is-click{outline:2px solid rgba(247,217,139,.9);outline-offset:2px;transform:scale(.985)}
.pk-sim-toast-ic{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.12);font-weight:800;font-size:15px;color:#F7D98B}
.pk-sim-toast.is-success .pk-sim-toast-ic{background:rgba(114,166,138,.25);color:#A9E3C4}
.pk-sim-toast.is-error .pk-sim-toast-ic{background:rgba(201,92,98,.28);color:#F0A5A9}
.pk-sim-toast.is-warning .pk-sim-toast-ic{background:rgba(214,168,79,.25);color:#F3D08A}
.pk-sim-toast-body{min-width:0}
.pk-sim-toast-app{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-sim-toast-body b{display:block;font-size:12.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-sim-toast-body p{margin:3px 0 0;font-size:11.5px;line-height:1.35;color:rgba(255,255,255,.68)}
.pk-sim-toast-action{display:inline-block;margin-top:8px;border:1px solid rgba(255,255,255,.22);border-radius:5px;padding:2px 9px;font-size:10.5px;color:#F7D98B}
.pk-sim-toast-time{font-size:10px;color:rgba(255,255,255,.42);white-space:nowrap}

/* Cursor */
.pk-sim-cursor{position:absolute;z-index:9;pointer-events:none;transform:translate(-2px,-2px);filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))}
.pk-sim-cursor svg{display:block;width:100%;height:100%}
.pk-sim-cursor.has-trail::after{content:'';position:absolute;left:6px;top:6px;width:10px;height:10px;border-radius:50%;background:rgba(247,217,139,.35);box-shadow:0 0 0 5px rgba(247,217,139,.08)}
.pk-sim-click{position:absolute;z-index:9;width:16px;height:16px;margin:-8px 0 0 -8px;border:2px solid #F7D98B;border-radius:50%;pointer-events:none;animation:pkSimClick .5s ease-out both}
@keyframes pkSimClick{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(2.6)}}

@media (prefers-reduced-motion: reduce){
  .pk-sim-toast,.pk-sim-cursor{transition:none!important}
  .pk-sim-click{animation:none!important}
  .pk-sim *{transition:none!important;animation:none!important}
}
/* Esquemas de cor do bloco de código (os mesmos do pacote de código) */
.pk-sim-pal{background:var(--pk-bg)!important;border-color:color-mix(in srgb,var(--pk-fg) 16%,transparent)!important}
.pk-sim-pal .pk-sim-code-top{background:color-mix(in srgb,var(--pk-fg) 6%,transparent)!important;border-bottom-color:color-mix(in srgb,var(--pk-fg) 12%,transparent)!important}
.pk-sim-pal .pk-sim-code{color:var(--pk-fg)!important}
.pk-sim-pal .pk-sim-file{color:color-mix(in srgb,var(--pk-fg) 60%,transparent)!important}
.pk-sim-pal .pk-sim-tag{color:var(--pk-ac)!important}
.pk-sim-pal .pk-sim-dots i:first-child{background:var(--pk-ac)}
.pk-sim-pal .pk-sim-ln::before{color:color-mix(in srgb,var(--pk-fg) 35%,transparent)!important}
.pk-sim-pal .pk-sim-ln.is-cur{background:color-mix(in srgb,var(--pk-ac) 14%,transparent)!important;border-left-color:var(--pk-ac)!important}
.pk-sim-pal .pk-sim-caret::after{background:var(--pk-ac)}
.pk-sim-pal .pk-sim-tk-kw{color:var(--pk-kw)!important}.pk-sim-pal .pk-sim-tk-str{color:var(--pk-str)!important}
.pk-sim-pal .pk-sim-tk-num{color:var(--pk-num)!important}.pk-sim-pal .pk-sim-tk-fn,.pk-sim-pal .pk-sim-tk-ty{color:var(--pk-fn)!important}
.pk-sim-pal .pk-sim-tk-op{color:color-mix(in srgb,var(--pk-fg) 65%,transparent)!important}
.pk-sim-pal .pk-sim-tk-cm{color:var(--pk-cm)!important}
`;
