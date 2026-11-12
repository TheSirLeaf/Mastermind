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
.pk-code .pk-ln.pk-hl,.pk-code .pk-ln.pk-cur{background:rgba(247,217,139,.1);box-shadow:inset 2px 0 0 #F7D98B}
.pk-code .tk-kw{color:#F7D98B}.pk-code .tk-str{color:#C77C8A}.pk-code .tk-num{color:#72A68A}
.pk-code .tk-cm{color:rgba(255,248,245,.35);font-style:italic}.pk-code .tk-fn{color:#8FB8D8}
.pk-code .tk-ty{color:#E0B7C1}.pk-code .tk-op{color:rgba(255,248,245,.55)}
.pk-code.pk-light .tk-kw{color:#9A4A32}.pk-code.pk-light .tk-str{color:#8E3B52}
.pk-code.pk-light .tk-num{color:#3F7A5E}.pk-code.pk-light .tk-cm{color:rgba(59,48,50,.42)}
.pk-code.pk-light .tk-fn{color:#37628A}.pk-code.pk-light .tk-op{color:rgba(59,48,50,.6)}
.pk-code .pk-note{padding:12px 26px;border-top:1px solid rgba(255,248,245,.1);font:400 15px 'DM Sans',system-ui,sans-serif;color:rgba(255,248,245,.55)}
.pk-code.pk-light .pk-note{border-top-color:rgba(59,48,50,.1);color:rgba(59,48,50,.55)}
.pk-code .pk-h{visibility:hidden}
.pk-code .pk-caret{position:relative;display:inline-block;width:0;height:1em}
.pk-code .pk-caret::after{content:"";position:absolute;left:1px;top:-.1em;width:2px;height:1.2em;background:#F7D98B;animation:pk-blink 1s steps(1) infinite}
/* Estilo "Digitação": a janela das apresentações (sem numeração de linhas) */
.pk-code.pk-v-typing{border-radius:24px;box-shadow:0 30px 70px rgba(10,2,6,.5)}
.pk-code.pk-v-typing .pk-win{border-radius:24px;border-color:rgba(247,217,139,.25);background:#17060D;color:#EFE2DE}
.pk-code.pk-v-typing.pk-light .pk-win{background:#FFF8F5;border-color:rgba(142,59,82,.25);color:#3B3032}
.pk-code.pk-v-typing .pk-bar{gap:16px;padding:16px 22px;background:rgba(255,248,245,.05);border-bottom-color:rgba(255,248,245,.08)}
.pk-code.pk-v-typing.pk-light .pk-bar{background:rgba(142,59,82,.06);border-bottom-color:rgba(142,59,82,.12)}
.pk-code.pk-v-typing .pk-dot{width:11px;height:11px}
.pk-code.pk-v-typing .pk-dot:first-child{background:#8E3B52}
.pk-code.pk-v-typing .pk-file{margin-left:0;font-size:15px}
.pk-code.pk-v-typing .pk-tag{font-size:12px;letter-spacing:.16em;border:1px solid rgba(247,217,139,.3);padding:3px 9px;border-radius:6px}
.pk-code.pk-v-typing.pk-light .pk-tag{border-color:rgba(142,59,82,.35)}
.pk-code.pk-v-typing pre.pk-pre{padding:28px 34px}
.pk-code.pk-v-typing .pk-ln{margin:0 -34px;padding:0 34px 0 31px;border-left:3px solid transparent;transition:background .3s,border-color .3s}
.pk-code.pk-v-typing .pk-ln::before{display:none}
.pk-code.pk-v-typing.pk-nums .pk-ln{padding-left:86px}
.pk-code.pk-v-typing.pk-nums .pk-ln::before{display:block;left:24px;width:40px;text-align:right;font-size:.8em;color:rgba(255,248,245,.28)}
.pk-code.pk-v-typing.pk-light.pk-nums .pk-ln::before{color:rgba(59,48,50,.35)}
.pk-code.pk-v-typing .pk-ln.pk-hl,.pk-code.pk-v-typing .pk-ln.pk-cur{background:rgba(247,217,139,.09);border-left-color:#F7D98B;box-shadow:none}
.pk-code.pk-v-typing.pk-light .pk-ln.pk-hl,.pk-code.pk-v-typing.pk-light .pk-ln.pk-cur{background:rgba(142,59,82,.08);border-left-color:#8E3B52}
.pk-code.pk-v-typing .tk-fn{color:#E3A2B0}.pk-code.pk-v-typing .tk-op{color:#C77C8A}.pk-code.pk-v-typing .tk-str{color:#9CC9B4}
.pk-code.pk-v-typing .tk-ty{color:#F3C7CF}.pk-code.pk-v-typing .tk-num{color:#D6A84F}
.pk-code.pk-v-typing.pk-light .tk-kw{color:#8E3B52;font-weight:600}.pk-code.pk-v-typing.pk-light .tk-fn{color:#A04A63}.pk-code.pk-v-typing.pk-light .tk-op{color:#B0657A}
.pk-code.pk-v-typing.pk-light .tk-str{color:#3E7D5E}.pk-code.pk-v-typing.pk-light .tk-ty{color:#7A3144}.pk-code.pk-v-typing.pk-light .tk-num{color:#A8761A}
.pk-code.pk-pal{box-shadow:0 30px 70px rgba(0,0,0,.35)}
.pk-code.pk-pal .pk-win{background:var(--pk-bg)!important;color:var(--pk-fg)!important;border-color:color-mix(in srgb,var(--pk-fg) 16%,transparent)!important}
.pk-code.pk-pal .pk-bar{background:color-mix(in srgb,var(--pk-fg) 6%,transparent)!important;border-bottom-color:color-mix(in srgb,var(--pk-fg) 12%,transparent)!important}
.pk-code.pk-pal pre.pk-pre{color:var(--pk-fg)!important}
.pk-code.pk-pal .pk-file,.pk-code.pk-pal .pk-note{color:color-mix(in srgb,var(--pk-fg) 60%,transparent)!important}
.pk-code.pk-pal .pk-note{border-top-color:color-mix(in srgb,var(--pk-fg) 12%,transparent)!important}
.pk-code.pk-pal .pk-tag{color:var(--pk-ac)!important;border-color:color-mix(in srgb,var(--pk-ac) 45%,transparent)!important}
.pk-code.pk-pal .pk-dot:first-child{background:var(--pk-ac)}
.pk-code.pk-pal .pk-ln::before{color:color-mix(in srgb,var(--pk-fg) 35%,transparent)!important}
.pk-code.pk-pal .pk-ln.pk-hl,.pk-code.pk-pal .pk-ln.pk-cur{background:color-mix(in srgb,var(--pk-ac) 14%,transparent)!important;border-left-color:var(--pk-ac)!important}
.pk-code.pk-pal .pk-caret::after{background:var(--pk-ac)}
.pk-code.pk-pal .tk-kw{color:var(--pk-kw)!important}.pk-code.pk-pal .tk-str{color:var(--pk-str)!important}
.pk-code.pk-pal .tk-num{color:var(--pk-num)!important}.pk-code.pk-pal .tk-fn{color:var(--pk-fn)!important}
.pk-code.pk-pal .tk-ty{color:var(--pk-fn)!important}.pk-code.pk-pal .tk-op{color:color-mix(in srgb,var(--pk-fg) 65%,transparent)!important}
.pk-code.pk-pal .tk-cm{color:var(--pk-cm)!important}
@media print{.pk-code .pk-h{visibility:visible!important}.pk-code .pk-caret{display:none}}
@keyframes pk-blink{50%{opacity:0}}
@media (prefers-reduced-motion: reduce){.pk-code .pk-caret::after{animation:none}}
`;
