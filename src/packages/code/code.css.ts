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
