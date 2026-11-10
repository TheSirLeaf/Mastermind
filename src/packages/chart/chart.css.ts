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
