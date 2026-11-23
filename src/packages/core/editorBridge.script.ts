/* Motor de edição que roda DENTRO do iframe do palco.
 *
 * Protocolo (postMessage):
 *   iframe → editor : ready · select · slide · slide-html · key · edit · package-resize
 *   editor → iframe : goto · select · set-slide · patch-element · preview-anim ·
 *                     stop-preview · fit · cmd
 *
 * Este arquivo é embutido como string (import ?raw); mantenha-o autônomo e sem
 * a sequência de fechamento de script.
 */
/* ---------- tipos ---------- */
/** Elementos do slide (HTML ou SVG: os dois têm `style`, `classList` e atributos). */
type El = HTMLElement;
interface Layout {
  x: number;
  y: number;
  s: number;
}
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Pose extends Record<string, unknown> {
  x: number;
  y: number;
  s: number;
  r: number;
  o: number;
  gc?: string;
}
interface PoseBase {
  keepTs: string;
  keepFl: string;
  text: Record<string, string>;
  translate: string;
  scale: string;
  rotate: string;
  opacity: string;
  x: number;
  y: number;
  s: number;
  r: number;
  o: number;
}
interface Snap {
  xs: number[];
  ys: number[];
}
interface Drag {
  mode: 'move' | 'rs';
  el: El;
  sx: number;
  sy: number;
  on: boolean;
  id: number;
  /** move: translate no começo · Alt: deixa uma cópia no lugar */
  base: { x: number; y: number };
  alt: boolean;
  /** rs: alça (`se`, `e`, `s`) e tamanho no começo */
  h: string;
  w0: number;
  h0: number;
  lock?: 'x' | 'y';
  pkg?: {
    aspect: boolean;
    inner: El;
    style: string | null;
    wrap: string | null;
    to?: { w: number; h: number };
  };
  slide?: El;
  ls?: number;
  r0?: Box;
  snap?: Snap;
}
interface Arrange {
  mode: 'move' | 'scale';
  el: El;
  sx: number;
  sy: number;
  l: Layout;
  on: boolean;
  id: number;
}
interface Clip {
  kind: string;
  html: string;
  slide: number;
  left: number;
  top: number;
}
interface PkgRegistryEntry {
  def?: { name?: string; resize?: { keepAspect?: boolean } };
}
interface CommandArg {
  h?: string;
  v?: string;
  dx?: number;
  dy?: number;
  cmd?: string;
  command?: string;
  value?: unknown;
  color?: string;
  props?: string[];
}
interface EditorMessage {
  __mm?: string;
  type?: string;
  index?: number;
  path?: number[] | null;
  edit?: boolean;
  html?: string;
  attrs?: Record<string, string | null>;
  classes?: { add?: string[]; remove?: string[] };
  style?: Record<string, string | null>;
  pose?: Pose | null;
  mode?: string;
  zoom?: number;
  animate?: boolean;
  x?: number;
  y?: number;
  indices?: number[];
  name?: string;
  arg?: CommandArg;
}
interface Cluster {
  lab: number[];
  w: number;
  r: number;
  g: number;
  b: number;
}
type StyleMap = Record<string, string | null>;
type BridgeWindow = Window & {
  __MM_EDITOR__?: boolean;
  __anim?: (slide: Element) => void;
  __mmClip?: Clip | null;
};

(function () {
  const win = window as BridgeWindow;
  if (win.__MM_EDITOR__) return;
  win.__MM_EDITOR__ = true;

  const deckNode = document.getElementById('deck');
  if (!deckNode || !document.getElementById('stage')) return;
  const deck: HTMLElement = deckNode;

  const GOLD = '#F7D98B';
  const INK = '#2A0E1A';

  /* ---------- overlay de seleção ---------- */
  const sel = document.createElement('div');
  sel.id = 'mm-sel';
  sel.style.cssText =
    'position:absolute;z-index:3000000;pointer-events:none;box-sizing:border-box;display:none;' +
    'border:2px solid ' +
    GOLD +
    ';box-shadow:0 0 0 1px rgba(16,6,11,.55),0 0 24px rgba(247,217,139,.3)';
  const tag = document.createElement('div');
  tag.id = 'mm-tag';
  sel.appendChild(tag);
  const handles = {} as Record<'se' | 'e' | 's', HTMLDivElement>;
  (['se', 'e', 's'] as const).forEach(function (name) {
    const h = document.createElement('div');
    h.className = 'mm-h';
    h.setAttribute('data-h', name);
    sel.appendChild(h);
    handles[name] = h;
  });
  deck.appendChild(sel);
  const grid = document.createElement('div');
  grid.id = 'mm-grid';
  deck.appendChild(grid);
  /* pontos do grid: espaçamento cresce ao afastar para manter a densidade na tela */
  function updateGrid() {
    let step = 80;
    while (step * scale < 28) step *= 2;
    const r = Math.max(1.2, 1.7 / scale);
    const off = 200000 % step;
    grid.style.backgroundImage =
      'radial-gradient(circle, #34343d ' +
      r.toFixed(2) +
      'px, transparent ' +
      (r + 0.6 / scale).toFixed(2) +
      'px)';
    grid.style.backgroundSize = step + 'px ' + step + 'px';
    grid.style.backgroundPosition = step / 2 - off + 'px ' + (step / 2 - off) + 'px';
  }

  const style = document.createElement('style');
  style.textContent = [
    'html,body{overflow:hidden}',
    'html,body,#stage{background:#17171b!important}',
    '#mm-grid{position:absolute;left:-200000px;top:-200000px;width:400000px;height:400000px;z-index:0;pointer-events:none}',
    /* elementos podem ser arrastados para fora do slide (grid); a apresentação continua cortando */
    /* o que sai do slide é cortado (como na apresentação); só no arrasto aparece inteiro */
    'body.mm-lift #deck>.slide.active{overflow:visible!important}',
    /* keyframe no palco: o elemento pode estar fora do slide (entrando/saindo) e precisa ser visto */
    'body.mm-posing:not(.mm-preview) #deck>.slide.active{overflow:visible!important}',
    'body.mm-canvas:not(.mm-preview) .slide.light::before{clip-path:inset(300px 260px 0 0)}',
    'body.mm-canvas:not(.mm-preview) .slide::after{clip-path:inset(0 70px 110px 0)}',
    'body.mm-lift #deck>.slide.active{z-index:2000000!important}',
    'body.mm-canvas #deck>.slide.mm-hl{box-shadow:0 0 0 12px #3b9cff,0 0 60px 10px rgba(59,156,255,.45)!important}',
    '#mm-labels{position:absolute;left:0;top:0;width:0;height:0;z-index:50;pointer-events:none}',
    '.mm-base-tag{position:absolute;white-space:nowrap;color:#9aa0b4;font:600 13px "Segoe UI",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;transform-origin:0 100%}',
    '.mm-base-tag b{color:#d7dae6;font-weight:700}',
    '#stage{display:block}',
    '#deck{left:0;top:0;transform-origin:0 0;-webkit-user-select:none;user-select:none}',
    '.slide{transition:none!important}',
    '.slide:not(.active){opacity:0;visibility:hidden;pointer-events:none}',
    '.notes-panel,.hint,.progress,.lightbox{display:none!important}',
    /* "Travado" vale só no export/apresentação; no editor o elemento continua selecionável */
    'body:not(.mm-preview) .slide.active [style*="pointer-events: none"],body:not(.mm-preview) .slide.active [style*="pointer-events:none"]{pointer-events:auto!important}',
    /* luz decorativa da capa: o template a deixa sem clique; no editor ela é um elemento como os outros */
    'body:not(.mm-preview) .slide.active .cover-glow{pointer-events:auto!important}',
    '#mm-sel.mm-pose .mm-h{display:none}',
    '.mm-locked-sel .mm-h{display:none}',
    'body:not(.mm-preview) .slide .pkg *,body:not(.mm-preview) .slide .pk-wrap *{animation:none!important}',
    'body:not(.mm-preview) .slide.active .chart .bar,body:not(.mm-preview) .slide.active .chart .cv,body:not(.mm-preview) .slide.active .sw-chip,body:not(.mm-preview) .slide.active .tbar-track i,body:not(.mm-preview) .slide.active .branch-svg .draw,body:not(.mm-preview) .slide.active .branch-svg .pop{animation:none!important}',
    'body:not(.mm-preview) .branch-svg .draw{stroke-dashoffset:0!important}',
    '*[contenteditable="true"],*[contenteditable="true"] *{outline:2px dashed ' +
      GOLD +
      ';outline-offset:6px;cursor:text;-webkit-user-select:text!important;user-select:text!important}',
    '.mm-h{position:absolute;pointer-events:auto;background:' +
      GOLD +
      ';border-style:solid;border-color:' +
      INK +
      ';z-index:1}',
    '.mm-h[data-h=se]{cursor:nwse-resize}',
    '.mm-h[data-h=e]{cursor:ew-resize}',
    '.mm-h[data-h=s]{cursor:ns-resize}',
    '#mm-tag{position:absolute;background:' +
      GOLD +
      ';color:' +
      INK +
      ';font:600 12px "Segoe UI",system-ui,sans-serif;white-space:nowrap;pointer-events:none}',
    'body.mm-dragging,body.mm-dragging *{cursor:grabbing!important}',
    '#mm-ghosts,#mm-guides{position:absolute;left:0;top:0;width:0;height:0;z-index:2999990;pointer-events:none}',
    '.mm-ghost{position:absolute;box-sizing:border-box;border-style:dashed;border-color:rgba(247,217,139,.55);border-radius:2px;pointer-events:none}',
    '.mm-ghost-off{pointer-events:auto;cursor:pointer;background:rgba(247,217,139,.06)}',
    'body.mm-preview #mm-ghosts,body.mm-arrange #mm-ghosts{display:none}',
    '.mm-guide{position:absolute;background:#ff3d8b;box-shadow:0 0 0 .5px rgba(255,61,139,.4)}',
    'body.mm-picking .slide.active *{cursor:crosshair!important}',
  ].join('\n');
  document.head.appendChild(style);

  let scale = 1;
  let viewTimer: ReturnType<typeof setTimeout> | undefined;
  deck.addEventListener('transitionend', function (e) {
    if (e.target === deck) drawSelection(selected);
  });
  let selected: El | null = null;
  let editing: El | null = null;
  let editingOriginal = '';
  let drag: Drag | null = null;
  let previewing = false;
  let previewTimer: ReturnType<typeof setTimeout> | undefined;

  /* Mundo: cada slide tem posição (data-x/data-y) e escala (data-s) no espaço; o editor
     controla a câmera (zoom/pan) e o modo ('edit' ou 'arrange' = mover/redimensionar slides). */
  let mode: 'edit' | 'arrange' = 'edit';
  const SLIDE_W = 1920;
  const SLIDE_H = 1080;
  const GAP = 160;
  document.body.classList.add('mm-canvas');
  const canvasStyle = document.createElement('style');
  canvasStyle.id = 'mm-canvas-style';
  document.head.appendChild(canvasStyle);

  function isBase(slide: Element | null): boolean {
    return !!slide && slide.hasAttribute && slide.hasAttribute('data-base-id');
  }
  function layoutOf(slide: El, index: number): Layout {
    if (isBase(slide)) {
      const k = slideList().filter(isBase).indexOf(slide);
      return { x: k * (SLIDE_W + GAP), y: -(SLIDE_H + 380), s: 1 };
    }
    const sc = parseFloat(slide.getAttribute('data-s') ?? '');
    const x = parseFloat(slide.getAttribute('data-x') ?? '');
    const y = parseFloat(slide.getAttribute('data-y') ?? '');
    return {
      x: isNaN(x) ? index * (SLIDE_W + GAP) : x,
      y: isNaN(y) ? 0 : y,
      s: sc > 0 ? sc : 1,
    };
  }
  function slideIndexOf(slide: Element): number {
    return Array.prototype.indexOf.call(slideList(), slide);
  }
  /* escala do slide que contém o elemento (a câmera já está em `scale`) */
  function esOf(el: El): number {
    const sl = slideOf(el);
    return sl ? layoutOf(sl, slideIndexOf(sl)).s : 1;
  }

  function buildCanvasCss() {
    const list = slideList();
    const css = [
      'body.mm-canvas .slide{inset:auto!important;opacity:1!important;visibility:visible!important;transition:none!important;pointer-events:auto!important;transform-origin:0 0!important}',
      'body.mm-canvas .slide:not(.active) *{pointer-events:none!important}',
      'body.mm-canvas .slide:not(.active){cursor:pointer}',
      'body.mm-canvas .slide.active{box-shadow:0 0 0 ' + 6 + 'px rgba(247,217,139,.4)}',
      'body.mm-arrange .slide *{pointer-events:none!important}',
      'body.mm-arrange .slide{cursor:move}',
      'body.mm-arrange .slide.active{box-shadow:0 0 0 8px ' + GOLD + '}',
      '.mm-arr .mm-h[data-h=e],.mm-arr .mm-h[data-h=s]{display:none}',
    ];
    list.forEach(function (sl, i) {
      const l = layoutOf(sl, i);
      css.push(
        'body.mm-canvas #deck>.slide:nth-child(' +
          (i + 1) +
          '){left:' +
          l.x +
          'px!important;top:' +
          l.y +
          'px!important;transform:scale(' +
          l.s +
          ')!important;z-index:' +
          Math.round(100 / l.s) +
          '!important}'
      );
    });
    canvasStyle.textContent = css.join('\n');
    drawLabels();
  }
  const labels = document.createElement('div');
  labels.id = 'mm-labels';
  deck.appendChild(labels);
  function drawLabels() {
    labels.innerHTML = '';
    slideList().forEach(function (sl, i) {
      if (!isBase(sl)) return;
      const l = layoutOf(sl, i);
      const t = document.createElement('div');
      t.className = 'mm-base-tag';
      t.setAttribute('data-for', String(i));
      t.style.left = l.x + 'px';
      t.style.top = l.y + 'px';
      const b = document.createElement('b');
      b.textContent = 'Slide Base';
      t.appendChild(b);
      t.appendChild(
        document.createTextNode(' \u00b7 ' + (sl.getAttribute('data-base-name') || 'Base'))
      );
      labels.appendChild(t);
    });
    scaleLabels();
  }
  function scaleLabels() {
    /* cresce ao afastar (para dar para ler), mas com limite e sem passar da largura do slide */
    const k = Math.min(10, 1 / Math.max(scale, 0.01));
    Array.prototype.forEach.call(labels.children, function (t) {
      t.style.maxWidth = SLIDE_W / k + 'px';
      t.style.overflow = 'hidden';
      t.style.textOverflow = 'ellipsis';
      t.style.transform = 'translateY(-14px) scale(' + k + ')';
    });
  }
  buildCanvasCss();

  function fit() {
    /* a câmera é controlada pelo editor (mensagem 'view') */
  }
  fit();
  window.addEventListener('resize', function () {
    fit();
    drawSelection(selected);
  });

  function post(msg: Record<string, unknown>) {
    msg.__mm = 'deck';
    try {
      window.parent.postMessage(msg, '*');
    } catch {
      /* sem pai */
    }
  }

  /* ---------- navegação no DOM ---------- */
  function slideList(): El[] {
    return Array.prototype.filter.call(deck.children, function (c: Element) {
      return c.classList.contains('slide');
    }) as El[];
  }
  function activeSlide(): El | null {
    return deck.querySelector<HTMLElement>('.slide.active');
  }
  function slideOf(el: Node | null): El | null {
    let n = el;
    while (n && n.parentNode !== deck) n = n.parentNode;
    return n instanceof Element && n.classList.contains('slide') ? (n as El) : null;
  }
  /* filhos "reais": a camada de base (.mm-bgl) é só visual e não existe no HTML guardado */
  function kidsOf(node: Element): El[] {
    return Array.prototype.filter.call(node.children, function (c: Element) {
      return !c.classList.contains('mm-bgl');
    }) as El[];
  }
  function pathOf(el: El): number[] | null {
    const path = [];
    let node: El = el;
    while (node !== deck) {
      const parent = node.parentElement;
      if (!parent) return null;
      path.unshift(kidsOf(parent).indexOf(node));
      node = parent;
    }
    return path;
  }
  function elAt(path: number[] | null | undefined): El | null {
    if (!path || !path.length) return null;
    let node: El | undefined = deck;
    for (let i = 0; i < path.length; i++) {
      const kids: ArrayLike<Element> = i === 0 ? node.children : kidsOf(node);
      node = kids[path[i] ?? -1] as El | undefined;
      if (!node) return null;
    }
    return node;
  }
  /* Regras de redimensionar do pacote (lidas do registro embutido): `null` = sem regras. */
  function registryDef(id: string | null): PkgRegistryEntry['def'] {
    const node = document.getElementById('pkg-registry');
    const reg = (node ? JSON.parse(node.textContent || '{}') : {}) as Record<
      string,
      PkgRegistryEntry | undefined
    >;
    return id ? reg[id]?.def : undefined;
  }
  function pkgResize(id: string | null): { aspect: boolean } | null {
    try {
      const def = registryDef(id);
      return def && def.resize ? { aspect: !!def.resize.keepAspect } : null;
    } catch {
      return null;
    }
  }
  function registryName(id: string | null): string {
    try {
      return registryDef(id)?.name || 'Pacote';
    } catch {
      return 'Pacote';
    }
  }
  function labelOf(el: El): string {
    const custom = el.getAttribute && el.getAttribute('data-name');
    if (custom && custom.trim()) return custom.trim();
    if (el.hasAttribute && el.hasAttribute('data-pkg'))
      return registryName(el.getAttribute('data-pkg'));
    if (el.classList.contains('cover-glow')) return 'Efeito de luz';
    if (el.classList.contains('ed-shape')) return 'Forma';
    if (el.classList.contains('ed-text')) return 'Texto';
    const names: Record<string, string> = {
      h1: 'Título',
      h2: 'Título',
      h3: 'Subtítulo',
      p: 'Parágrafo',
      li: 'Item',
      img: 'Imagem',
      video: 'Vídeo',
      svg: 'Gráfico/ícone',
      div: 'Caixa',
      span: 'Texto',
      b: 'Negrito',
      ul: 'Lista',
      code: 'Código',
      pre: 'Código',
      table: 'Tabela',
      td: 'Célula',
      th: 'Cabeçalho',
      section: 'Slide',
    };
    const t = el.tagName.toLowerCase();
    return names[t] || t;
  }
  function isMedia(el: El): boolean {
    return /^(img|svg|video)$/i.test(el.tagName);
  }
  function pkgRoot(el: El, slide: El): El {
    for (let a: El | null = el; a && a !== slide; a = a.parentElement) {
      if (a.hasAttribute('data-pkg')) return a;
    }
    return el;
  }
  /* Resolve o alvo do clique para o elemento "selecionável". */
  function pick(t: Element | null): El | null {
    if (!t || t.nodeType !== 1) return null;
    const s = activeSlide();
    if (!s || !s.contains(t) || t === s) return null;
    let el: Element | null = t;
    let outer: Element | null = el.closest('svg');
    if (outer) {
      let up: Element | null = outer.parentElement?.closest('svg') ?? null;
      while (up) {
        outer = up;
        up = up.parentElement?.closest('svg') ?? null;
      }
      el = outer;
    } else {
      while (el && el !== s) {
        const d = window.getComputedStyle(el).display;
        if (d === 'inline' || d === 'contents') el = el.parentElement;
        else break;
      }
    }
    if (!el || el === s) return null;
    if (el.classList.contains('content')) return null;
    return pkgRoot(el as El, s);
  }

  /* ---------- serialização ---------- */
  function serialize(slide: El): string {
    const c = slide.cloneNode(true) as El;
    /* o elemento em "pose" de keyframe volta aos estilos naturais no HTML guardado */
    if (poseState && poseState.el.isConnected && slide.contains(poseState.el)) {
      const rel: number[] = [];
      for (let pn: El | null = poseState.el; pn && pn !== slide; pn = pn.parentElement) {
        if (pn.parentElement) rel.unshift(kidsOf(pn.parentElement).indexOf(pn));
      }
      let tgt: El | undefined = c;
      rel.forEach(function (i) {
        tgt = tgt && kidsOf(tgt)[i];
      });
      if (tgt) restoreBase(tgt, poseState.base);
    }
    c.classList.remove('active', 'mm-static', 'mm-hl');
    Array.prototype.forEach.call(c.querySelectorAll(':scope > .mm-bgl'), function (n) {
      n.remove();
    });
    Array.prototype.forEach.call(
      c.querySelectorAll('[contenteditable],[data-mm-editing],[spellcheck]'),
      function (n) {
        n.removeAttribute('contenteditable');
        n.removeAttribute('data-mm-editing');
        n.removeAttribute('spellcheck');
      }
    );
    c.removeAttribute('contenteditable');
    c.removeAttribute('data-mm-editing');
    return c.outerHTML;
  }
  function commit(key: string, from?: El | null) {
    const s = slideOf(from || selected) || activeSlide();
    if (!s) return;
    const idx = slideList().indexOf(s);
    if (idx < 0) return;
    post({ type: 'slide-html', index: idx, html: serialize(s), key: key || '' });
    scheduleGhosts();
  }

  /* ---------- seleção ---------- */
  function rectOf(el: Element): Box {
    const dr = deck.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      left: (r.left - dr.left) / scale,
      top: (r.top - dr.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
    };
  }
  function isLocked(el: El | null): boolean {
    return !!el && !!el.style && el.style.pointerEvents === 'none';
  }
  function drawSelection(el: El | null) {
    if (!el || !el.isConnected || previewing) {
      sel.style.display = 'none';
      return;
    }
    sel.classList.toggle('mm-locked-sel', isLocked(el));
    const r = rectOf(el);
    const px = function (n: number) {
      return Math.max(1, n / scale).toFixed(2) + 'px';
    };
    const hs = 14 / scale;
    sel.style.display = 'block';
    sel.style.left = r.left + 'px';
    sel.style.top = r.top + 'px';
    sel.style.width = r.width + 'px';
    sel.style.height = r.height + 'px';
    sel.style.borderWidth = px(2);
    handles.se.style.cssText =
      'right:' +
      -(hs * 0.65).toFixed(2) +
      'px;bottom:' +
      -(hs * 0.65).toFixed(2) +
      'px;width:' +
      hs +
      'px;height:' +
      hs +
      'px;border-width:' +
      px(2) +
      ';border-radius:' +
      px(4);
    handles.e.style.cssText =
      'right:' +
      -(hs * 0.65).toFixed(2) +
      'px;top:calc(50% - ' +
      (hs / 2).toFixed(2) +
      'px);width:' +
      hs +
      'px;height:' +
      hs +
      'px;border-width:' +
      px(2) +
      ';border-radius:' +
      px(4);
    handles.s.style.cssText =
      'bottom:' +
      -(hs * 0.65).toFixed(2) +
      'px;left:calc(50% - ' +
      (hs / 2).toFixed(2) +
      'px);width:' +
      hs +
      'px;height:' +
      hs +
      'px;border-width:' +
      px(2) +
      ';border-radius:' +
      px(4);
    if (isBase(el)) {
      tag.textContent = 'Slide Base · ' + (el.getAttribute('data-base-name') || 'Base');
    } else if (el.classList.contains('slide')) {
      tag.textContent =
        'Slide ' +
        (slideIndexOf(el) + 1) +
        ' · ' +
        Math.round(layoutOf(el, slideIndexOf(el)).s * 100) +
        '%';
    } else {
      const esz = esOf(el);
      tag.textContent =
        (isLocked(el) ? '🔒 ' : '') +
        labelOf(el) +
        ' · ' +
        Math.round(r.width / esz) +
        '×' +
        Math.round(r.height / esz);
    }
    const inside = r.top * scale < 34;
    tag.style.fontSize = (12 / scale).toFixed(2) + 'px';
    tag.style.padding = px(3) + ' ' + px(8);
    tag.style.borderRadius = inside
      ? '0 ' + px(6) + ' ' + px(6) + ' ' + px(6)
      : px(6) + ' ' + px(6) + ' ' + px(6) + ' 0';
    tag.style.left = '-' + px(2);
    tag.style.top = inside ? 'auto' : '-' + (26 / scale).toFixed(2) + 'px';
    tag.style.bottom = inside ? '-' + (26 / scale).toFixed(2) + 'px' : 'auto';
  }
  function select(el: El | null | undefined, silent?: boolean) {
    selected = el || null;
    drawSelection(selected);
    if (silent) return;
    if (selected) {
      post({
        type: 'select',
        path: pathOf(selected),
        tag: selected.tagName.toLowerCase(),
        label: labelOf(selected),
      });
    } else {
      post({ type: 'select', path: null, tag: '', label: '' });
    }
  }

  /* ---------- translate / dimensões ---------- */
  function getTrans(el: El): { x: number; y: number } {
    const v = (el.style.translate || '').trim().split(/\s+/);
    return { x: parseFloat(v[0] ?? '') || 0, y: parseFloat(v[1] ?? '') || 0 };
  }
  function setTrans(el: El, x: number, y: number) {
    el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
  }

  /* ---------- edição de texto ---------- */
  function isTextElement(el: El | null): boolean {
    if (!el || el === deck) return false;
    const t = el.tagName.toLowerCase();
    if (t === 'section' || t === 'img' || t === 'svg' || t === 'br') return false;
    if (el.hasAttribute('data-pkg') || el.closest('[data-pkg]')) return false;
    return true;
  }
  function beginEdit(el: El, all: boolean) {
    if (!isTextElement(el) || isLocked(el)) return;
    if (editing) endEdit(true);
    editing = el;
    editingOriginal = el.innerHTML;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-mm-editing', '1');
    el.setAttribute('spellcheck', 'false');
    el.focus({ preventScroll: true });
    resetScroll();
    const range = document.createRange();
    range.selectNodeContents(el);
    if (!all) range.collapse(false);
    const s = window.getSelection();
    if (s) {
      s.removeAllRanges();
      s.addRange(range);
    }
    drawSelection(el);
  }
  function syncCounter(el: El) {
    const list = Array.prototype.slice.call(el.querySelectorAll('[data-count]'));
    if (el.hasAttribute('data-count')) list.unshift(el);
    list.forEach(function (c) {
      let n = null;
      for (let k = c.firstChild; k; k = k.nextSibling) {
        if (k.nodeType === 3 && k.nodeValue.trim() !== '') {
          n = k;
          break;
        }
      }
      const raw = n ? n.nodeValue.replace(/\s/g, '') : '';
      let v = null;
      let d = 0;
      let m;
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
        m = raw.replace(/\./g, '').split(',');
        v = parseFloat(m[0] + (m[1] ? '.' + m[1] : ''));
        d = m[1] ? m[1].length : 0;
      } else if (/^\d+,\d+$/.test(raw)) {
        v = parseFloat(raw.replace(',', '.'));
        d = raw.split(',')[1].length;
      } else if (/^\d+\.\d+$/.test(raw)) {
        v = parseFloat(raw);
        d = raw.split('.')[1].length;
      } else if (/^\d+$/.test(raw)) {
        v = parseFloat(raw);
      }
      if (v === null) {
        c.removeAttribute('data-count');
        c.removeAttribute('data-decimals');
      } else {
        c.setAttribute('data-count', String(v));
        if (d) c.setAttribute('data-decimals', String(d));
        else c.removeAttribute('data-decimals');
      }
    });
  }
  function endEdit(commitChanges: boolean) {
    if (!editing) return;
    const el = editing;
    editing = null;
    savedRange = null;
    reportFormat();
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-mm-editing');
    el.removeAttribute('spellcheck');
    if (!commitChanges) {
      el.innerHTML = editingOriginal;
      drawSelection(selected);
      return;
    }
    const changed = el.innerHTML !== editingOriginal;
    if (changed) {
      syncCounter(el);
      if (el.classList.contains('ed-text') && !el.textContent.trim()) {
        if (selected === el) selected = null;
        const s = slideOf(el);
        el.remove();
        if (s)
          post({ type: 'slide-html', index: slideList().indexOf(s), html: serialize(s), key: '' });
        select(null);
        return;
      }
      commit('text:' + (pathOf(el) || []).join('.'), el);
    }
    drawSelection(selected || el);
  }

  /* ---------- ações sobre o elemento ---------- */
  function isSlideChild(el: El | null): boolean {
    return !!el && !!el.parentElement && el.parentElement !== deck;
  }
  function delEl() {
    if (!selected || !isSlideChild(selected)) return;
    const el = selected;
    const s = slideOf(el);
    select(null);
    el.remove();
    if (s) post({ type: 'slide-html', index: slideList().indexOf(s), html: serialize(s), key: '' });
  }
  function dupEl() {
    if (!selected || !isSlideChild(selected)) return;
    const c = selected.cloneNode(true) as El;
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(function (x) {
      x.removeAttribute('id');
    });
    const t = getTrans(selected);
    setTrans(c, t.x + 30, t.y + 30);
    selected.after(c);
    select(c);
    commit('');
  }
  function ensurePos(el: El) {
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
  }
  function resetPos() {
    if (!selected) return;
    selected.style.removeProperty('translate');
    selected.style.removeProperty('width');
    selected.style.removeProperty('height');
    drawSelection(selected);
    commit('');
  }
  function selectParent() {
    if (!selected) return;
    const p = selected.parentElement;
    if (p && p !== deck && !p.classList.contains('slide')) select(p);
  }
  /* ---------- pose de keyframe: mostra (e deixa editar) o elemento num keyframe ---------- */
  let poseState: { el: El; base: PoseBase; pose: Pose } | null = null;
  function numOf(v: string | undefined): number {
    const n = parseFloat(v ?? '');
    return isNaN(n) ? 0 : n;
  }
  /* formatação do texto que um keyframe pode mudar (estilo inline original guardado) */
  const POSE_TEXT: [string, string][] = [
    ['c', 'color'],
    ['fs', 'font-size'],
    ['w', 'font-weight'],
    ['ls', 'letter-spacing'],
    ['g', 'text-shadow'],
    ['bl', 'filter'],
  ];
  function baseOf(el: El): PoseBase {
    const t = (el.style.translate || '').split(' ').filter(Boolean);
    const text: Record<string, string> = {};
    POSE_TEXT.forEach(function (p) {
      text[p[1]] = el.style.getPropertyValue(p[1]);
    });
    const ccs = window.getComputedStyle(el);
    return {
      keepTs: ccs.textShadow && ccs.textShadow !== 'none' ? ', ' + ccs.textShadow : '',
      keepFl: ccs.filter && ccs.filter !== 'none' ? ' ' + ccs.filter : '',
      text: text,
      translate: el.style.translate || '',
      scale: el.style.scale || '',
      rotate: el.style.rotate || '',
      opacity: el.style.opacity || '',
      x: numOf(t[0]),
      y: numOf(t[1]),
      s: numOf(el.style.scale) || 1,
      r: numOf(el.style.rotate),
      o: el.style.opacity === '' ? 1 : numOf(el.style.opacity),
    };
  }
  function restoreBase(el: El, b: PoseBase) {
    (['translate', 'scale', 'rotate', 'opacity'] as const).forEach(function (p) {
      if (b[p]) el.style.setProperty(p, b[p]);
      else el.style.removeProperty(p);
    });
    Object.keys(b.text || {}).forEach(function (p) {
      if (b.text[p]) el.style.setProperty(p, b.text[p]);
      else el.style.removeProperty(p);
    });
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }
  function unpose() {
    if (!poseState) return;
    if (poseState.el.isConnected) restoreBase(poseState.el, poseState.base);
    poseState = null;
    sel.classList.remove('mm-pose');
    document.body.classList.remove('mm-posing');
  }
  function setPose(path: number[] | null | undefined, pose: Pose | null | undefined) {
    if (poseState && !poseState.el.isConnected) poseState = null;
    const target = pose && path ? elAt(path) : null;
    if (poseState && poseState.el !== target) unpose();
    if (!target || !pose) {
      drawSelection(selected);
      return;
    }
    if (!poseState) {
      poseState = { el: target, base: baseOf(target), pose: pose };
      sel.classList.add('mm-pose');
      document.body.classList.add('mm-posing');
    }
    poseState.pose = pose;
    const b: PoseBase = poseState.base;
    const tgt: El = target;
    const ps: Pose = pose;
    tgt.style.translate = b.x + ps.x + 'px ' + (b.y + ps.y) + 'px';
    tgt.style.scale = String(b.s * ps.s);
    tgt.style.rotate = b.r + ps.r + 'deg';
    tgt.style.opacity = String(b.o * ps.o);
    POSE_TEXT.forEach(function (p) {
      const v = ps[p[0]] as string | number | null | undefined;
      let css = null;
      if (v !== undefined && v !== null) {
        if (p[0] === 'fs') css = v + 'px';
        else if (p[0] === 'ls') css = v + 'em';
        else if (p[0] === 'w') css = String(v);
        else if (p[0] === 'g') {
          const gc = ps.gc || '#F7D98B';
          css = '0 0 ' + Number(v) * 0.35 + 'px ' + gc + ', 0 0 ' + v + 'px ' + gc + b.keepTs;
        } else if (p[0] === 'bl') css = 'blur(' + v + 'px)' + b.keepFl;
        else css = String(v);
      }
      /* sem valor no keyframe: o natural (o inline original, se havia) */
      if (css === null) css = b.text[p[1]] || '';
      if (css) tgt.style.setProperty(p[1], css);
      else tgt.style.removeProperty(p[1]);
    });
    if (selected === target) drawSelection(target);
  }
  /* depois de arrastar/empurrar o elemento posado: avisa o editor da nova posição do keyframe */
  function poseMoved() {
    if (!poseState) return;
    const t = getTrans(poseState.el);
    const p = poseState.pose;
    const np: Pose = {
      x: Math.round(t.x - poseState.base.x),
      y: Math.round(t.y - poseState.base.y),
      s: p.s,
      r: p.r,
      o: p.o,
    };
    poseState.pose = np;
    post({ type: 'pose-edit', pose: np });
  }

  function nudge(dx: number, dy: number) {
    if (!selected || isLocked(selected) || mode === 'arrange') return;
    const t = getTrans(selected);
    setTrans(selected, t.x + dx, t.y + dy);
    drawSelection(selected);
    if (poseState && selected === poseState.el) {
      poseMoved();
      return;
    }
    commit('nudge:' + (pathOf(selected) || []).join('.'));
  }

  /* ---------- copiar / colar elemento ---------- */
  let lastPt: { x: number; y: number } | null = null;
  document.addEventListener(
    'pointermove',
    function (e) {
      lastPt = { x: e.clientX, y: e.clientY };
    },
    true
  );
  function getClip() {
    try {
      return (window.parent as BridgeWindow).__mmClip || null;
    } catch {
      return null;
    }
  }
  function copyEl() {
    const s = slideOf(selected);
    if (!s || !selected) return;
    const c = selected.cloneNode(true) as El;
    c.removeAttribute('contenteditable');
    c.removeAttribute('data-mm-editing');
    const sr = rectOf(s);
    const r = rectOf(selected);
    const ss = layoutOf(s, slideIndexOf(s)).s;
    try {
      (window.parent as BridgeWindow).__mmClip = {
        kind: 'element',
        html: c.outerHTML,
        slide: slideIndexOf(s),
        left: (r.left - sr.left) / ss,
        top: (r.top - sr.top) / ss,
      };
    } catch {
      /* sem acesso ao pai */
    }
  }
  /* Mesmo slide: o item aparece sob o mouse. Outro slide: na posição exata de onde foi copiado. */
  function pasteEl(clip: Clip) {
    const s = activeSlide();
    if (!s) return;
    if (editing) endEdit(true);
    const tpl = document.createElement('template');
    tpl.innerHTML = clip.html;
    const el = tpl.content.firstElementChild as El | null;
    if (!el) return;
    s.appendChild(el);
    setTrans(el, 0, 0);
    const sr = rectOf(s);
    const ss = layoutOf(s, slideIndexOf(s)).s;
    const r0 = rectOf(el);
    let wantLeft = clip.left;
    let wantTop = clip.top;
    if (clip.slide === slideIndexOf(s) && lastPt) {
      const dr = deck.getBoundingClientRect();
      wantLeft = ((lastPt.x - dr.left) / scale - sr.left) / ss - r0.width / ss / 2;
      wantTop = ((lastPt.y - dr.top) / scale - sr.top) / ss - r0.height / ss / 2;
    }
    setTrans(el, wantLeft - (r0.left - sr.left) / ss, wantTop - (r0.top - sr.top) / ss);
    commit('paste', el);
    select(el);
  }

  /* ---------- ponteiro: selecionar / mover / redimensionar ---------- */
  document.addEventListener(
    'mousedown',
    function (e) {
      /* impede seleção nativa e foco; o texto em edição mantém o comportamento normal */
      if (editing && editing.contains(e.target as Node)) return;
      e.preventDefault();
    },
    true
  );
  /* botão do meio: movimenta a visualização; scroll: zoom (o editor aplica) */
  let panning: { x: number; y: number; id: number } | null = null;
  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.button !== 1) return;
      e.preventDefault();
      panning = { x: e.screenX, y: e.screenY, id: e.pointerId };
      try {
        document.documentElement.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    true
  );
  document.addEventListener(
    'pointermove',
    function (e) {
      if (!panning) return;
      /* screenX/Y não mudam quando o iframe se move junto com o pan */
      post({ type: 'pan', dx: e.screenX - panning.x, dy: e.screenY - panning.y });
      panning.x = e.screenX;
      panning.y = e.screenY;
    },
    true
  );
  function endPan() {
    if (!panning) return;
    try {
      document.documentElement.releasePointerCapture(panning.id);
    } catch {
      /* ignore */
    }
    panning = null;
  }
  document.addEventListener('pointerup', endPan, true);
  document.addEventListener('pointercancel', endPan, true);
  document.addEventListener(
    'auxclick',
    function (e) {
      if (e.button === 1) e.preventDefault();
    },
    true
  );
  document.addEventListener(
    'wheel',
    function (e) {
      e.preventDefault();
      post({ type: 'wheel', dy: e.deltaY, x: e.clientX, y: e.clientY });
    },
    { capture: true, passive: false }
  );

  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.button !== 0 || previewing) return;
      if (mode === 'arrange') {
        arrangeDown(e);
        return;
      }
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (editing && editing.contains(t)) return;
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      const h = t.closest ? t.closest('.mm-h') : null;
      if (h && selected) {
        const r = rectOf(selected);
        const rs: Drag = {
          mode: 'rs',
          h: h.getAttribute('data-h') || 'se',
          el: selected,
          sx: e.clientX,
          sy: e.clientY,
          w0: r.width / esOf(selected),
          h0: r.height / esOf(selected),
          on: false,
          id: e.pointerId,
          base: { x: 0, y: 0 },
          alt: false,
        };
        drag = rs;
        /* pacote com regras: a caixa pede ao editor um spec novo (e aqui só mostra a prévia) */
        const rules = selected.hasAttribute('data-pkg')
          ? pkgResize(selected.getAttribute('data-pkg'))
          : null;
        const inner = selected.firstElementChild as El | null;
        if (rules && inner) {
          rs.pkg = {
            aspect: rules.aspect,
            inner: inner,
            style: inner.getAttribute('style'),
            wrap: selected.getAttribute('style'),
          };
        }
        capture(e);
        return;
      }
      if (pickingParent) {
        e.preventDefault();
        const cand = deck.contains(t) ? pick(t) : null;
        finishPickParent(cand);
        return;
      }
      const gh = t.closest('.mm-ghost-off');
      const ghostOf = gh ? ghostTarget.get(gh) : undefined;
      if (ghostOf) {
        if (editing) endEdit(true);
        select(ghostOf);
        if (isLocked(ghostOf)) return;
        startMove(ghostOf, e);
        return;
      }
      if (!deck.contains(t)) return;
      if (editing) endEdit(true);
      const clicked = slideOf(t);
      if (clicked && clicked !== activeSlide()) {
        /* clicar noutro slide só o torna o atual (a câmera não se move) */
        select(null);
        post({ type: 'slide-click', index: slideIndexOf(clicked) });
        return;
      }
      const el = pick(t);
      select(el);
      if (!el || isLocked(el)) return;
      startMove(el, e);
    },
    true
  );
  function startMove(el: El, e: PointerEvent) {
    drag = {
      mode: 'move',
      el: el,
      sx: e.clientX,
      sy: e.clientY,
      base: getTrans(el),
      on: false,
      id: e.pointerId,
      alt: e.altKey,
      h: '',
      w0: 0,
      h0: 0,
    };
    capture(e);
  }
  /* dados para o alinhamento, calculados uma vez no começo do arrasto */
  function prepareSnap(d: Drag) {
    const s = slideOf(d.el);
    if (!s) return;
    d.slide = s;
    d.ls = layoutOf(s, slideIndexOf(s)).s;
    d.r0 = localRect(d.el, s, d.ls);
    d.snap = snapTargets(d.el, s, d.ls);
  }
  function capture(e: PointerEvent) {
    try {
      document.documentElement.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  document.addEventListener(
    'pointermove',
    function (e) {
      if (!drag) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.on) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.on = true;
        document.body.classList.add('mm-dragging');
        ghosts.innerHTML = '';
        if (drag.mode === 'move') {
          document.body.classList.add('mm-lift');
          /* Alt + arrastar: deixa uma cópia no lugar e leva o original */
          if (drag.alt && isSlideChild(drag.el)) {
            const copy = drag.el.cloneNode(true) as El;
            copy.removeAttribute('id');
            drag.el.before(copy);
          }
        }
        prepareSnap(drag);
      }
      const es = scale * esOf(drag.el);
      let ax = dx / es;
      let ay = dy / es;
      if (drag.mode === 'move') {
        if (e.shiftKey) {
          if (Math.abs(ax) > Math.abs(ay)) {
            ay = 0;
            drag.lock = 'x';
          } else {
            ax = 0;
            drag.lock = 'y';
          }
        }
        if (drag.r0) {
          const sn = snapMove(drag, ax, ay, e);
          ax = sn.ax;
          ay = sn.ay;
        }
        setTrans(drag.el, drag.base.x + ax, drag.base.y + ay);
      } else if (drag.pkg) {
        resizePackagePreview(drag, drag.w0 + ax, drag.h0 + ay);
      } else {
        const el = drag.el;
        let w = drag.w0 + ax;
        let h = drag.h0 + ay;
        const keep = isMedia(el) && !e.shiftKey && drag.h === 'se';
        if (drag.r0 && !keep) {
          const sr2 = snapResize(drag, w, h, e);
          w = sr2.w;
          h = sr2.h;
        }
        if (drag.h !== 's') {
          w = Math.max(16, w);
          el.style.width = Math.round(w) + 'px';
        }
        if (drag.h !== 'e') {
          h = Math.max(10, h);
          if (keep) h = (w * drag.h0) / drag.w0;
          el.style.height = Math.round(h) + 'px';
        }
      }
      drawSelection(drag.el);
    },
    true
  );
  /* Prévia de um pacote sendo redimensionado: pela lateral o conteúdo se reorganiza na largura
     nova; pelo canto, por baixo ou num pacote de proporção fixa, ele cresce/encolhe inteiro. */
  function resizeRatio(d: Drag, w: number, h: number): number {
    return Math.max(0.1, d.h === 's' ? h / d.h0 : w / d.w0);
  }
  function resizePackagePreview(d: Drag, w: number, h: number) {
    const pkg = d.pkg;
    if (!pkg) return;
    const el = d.el;
    const inner = pkg.inner;
    if (d.h === 'e' && !pkg.aspect) {
      el.style.width = Math.round(Math.max(40, w)) + 'px';
      el.style.height = '';
      inner.style.transform = '';
      inner.style.width = '100%';
      inner.style.maxWidth = '100%';
      pkg.to = { w: Math.max(40, w), h: inner.getBoundingClientRect().height / scale / esOf(el) };
      return;
    }
    const r = resizeRatio(d, w, h);
    el.style.width = Math.round(d.w0 * r) + 'px';
    el.style.height = Math.round(d.h0 * r) + 'px';
    inner.style.width = d.w0 + 'px';
    inner.style.maxWidth = 'none';
    inner.style.transformOrigin = '0 0';
    inner.style.transform = 'scale(' + r.toFixed(4) + ')';
    pkg.to = { w: d.w0 * r, h: d.h0 * r };
  }
  /* Ao soltar: o editor recalcula o pacote no tamanho novo e devolve o slide redesenhado. */
  function finishPackageResize(d: Drag) {
    const pkg = d.pkg;
    if (!pkg) return;
    const to = pkg.to || { w: d.w0, h: d.h0 };
    const s = slideOf(d.el);
    post({
      type: 'package-resize',
      index: s ? slideList().indexOf(s) : -1,
      path: pathOf(d.el),
      edge: d.h,
      from: { w: d.w0, h: d.h0 },
      to: { w: to.w, h: to.h },
    });
    /* se o editor não devolver o slide (nada mudou), a prévia é desfeita */
    const el = d.el;
    const inner = pkg.inner;
    const saved: [El, string | null][] = [
      [inner, pkg.style],
      [el, pkg.wrap],
    ];
    setTimeout(function () {
      if (!el.isConnected || !inner.isConnected) return;
      saved.forEach(function ([node, style]) {
        if (style === null) node.removeAttribute('style');
        else node.setAttribute('style', style);
      });
      drawSelection(selected);
    }, 600);
  }

  /* ---------- arranjo dos slides (aba Slide) ---------- */
  let arr: Arrange | null = null;
  function setLayout(slide: El, l: Layout) {
    slide.setAttribute('data-x', String(Math.round(l.x)));
    slide.setAttribute('data-y', String(Math.round(l.y)));
    if (Math.abs(l.s - 1) < 0.0005) slide.removeAttribute('data-s');
    else slide.setAttribute('data-s', l.s.toFixed(3));
    buildCanvasCss();
  }
  function arrangeDown(e: PointerEvent) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest ? t.closest('.mm-h') : null;
    if (handle && selected && handle.getAttribute('data-h') === 'se') {
      arr = {
        mode: 'scale',
        el: selected,
        sx: e.clientX,
        sy: e.clientY,
        l: layoutOf(selected, slideIndexOf(selected)),
        on: false,
        id: e.pointerId,
      };
      capture(e);
      return;
    }
    const sl = slideOf(t);
    if (!sl) return;
    post({ type: 'slide-click', index: slideIndexOf(sl) });
    select(sl, true);
    if (isBase(sl)) return;
    arr = {
      mode: 'move',
      el: sl,
      sx: e.clientX,
      sy: e.clientY,
      l: layoutOf(sl, slideIndexOf(sl)),
      on: false,
      id: e.pointerId,
    };
    capture(e);
  }
  function arrangeMove(e: PointerEvent) {
    if (!arr) return;
    if (!arr.on) {
      if (Math.hypot(e.clientX - arr.sx, e.clientY - arr.sy) < 4) return;
      arr.on = true;
      document.body.classList.add('mm-dragging');
    }
    let dx = (e.clientX - arr.sx) / scale;
    let dy = (e.clientY - arr.sy) / scale;
    if (arr.mode === 'move') {
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      setLayout(arr.el, { x: arr.l.x + dx, y: arr.l.y + dy, s: arr.l.s });
    } else {
      const ns = Math.max(0.05, Math.min(4, arr.l.s + Math.max(dx / SLIDE_W, dy / SLIDE_H)));
      setLayout(arr.el, { x: arr.l.x, y: arr.l.y, s: ns });
    }
    drawSelection(arr.el);
  }
  function arrangeEnd() {
    if (!arr) return false;
    const a = arr;
    arr = null;
    document.body.classList.remove('mm-dragging');
    try {
      document.documentElement.releasePointerCapture(a.id);
    } catch {
      /* ignore */
    }
    if (a.on) commit('', a.el);
    return true;
  }
  document.addEventListener('pointermove', arrangeMove, true);

  /* Slide mais "por cima" sob o ponteiro (menor escala = mais por cima; empate: o último). */
  function slideAtPoint(e: PointerEvent): El | null {
    const dr = deck.getBoundingClientRect();
    const px = (e.clientX - dr.left) / scale;
    const py = (e.clientY - dr.top) / scale;
    let best = null;
    let bestScale = Infinity;
    slideList().forEach(function (sl, i) {
      const l = layoutOf(sl, i);
      if (px < l.x || py < l.y || px > l.x + SLIDE_W * l.s || py > l.y + SLIDE_H * l.s) return;
      if (l.s <= bestScale) {
        best = sl;
        bestScale = l.s;
      }
    });
    return best;
  }
  /* Soltar o elemento sobre outro slide passa o elemento para ele, na mesma posição visual. */
  function dropIntoOtherSlide(el: El, e: PointerEvent): boolean {
    const from = slideOf(el);
    const target = slideAtPoint(e);
    if (!from || !target || target === from) return false;
    const before = rectOf(el);
    target.appendChild(el);
    setTrans(el, 0, 0);
    const now = rectOf(el);
    const ts = layoutOf(target, slideIndexOf(target)).s;
    setTrans(el, (before.left - now.left) / ts, (before.top - now.top) / ts);
    el.style.zIndex = '';
    post({ type: 'slide-html', index: slideIndexOf(from), html: serialize(from), key: '' });
    post({ type: 'slide-html', index: slideIndexOf(target), html: serialize(target), key: '' });
    post({ type: 'element-moved', index: slideIndexOf(target), path: pathOf(el) });
    return true;
  }

  function endDrag(e?: PointerEvent) {
    if (arrangeEnd()) return;
    if (!drag) return;
    const d = drag;
    drag = null;
    document.body.classList.remove('mm-dragging');
    try {
      document.documentElement.releasePointerCapture(d.id);
    } catch {
      /* ignore */
    }
    document.body.classList.remove('mm-lift');
    clearGuides();
    scheduleGhosts();
    if (d.on && d.mode === 'move' && e && e.type === 'pointerup' && dropIntoOtherSlide(d.el, e)) {
      return;
    }
    if (d.on && poseState && d.el === poseState.el) {
      poseMoved();
      return;
    }
    if (d.on && d.mode === 'rs' && d.pkg) {
      finishPackageResize(d);
      return;
    }
    if (d.on) {
      commit('');
      post({
        type: 'select',
        path: pathOf(d.el),
        tag: d.el.tagName.toLowerCase(),
        label: labelOf(d.el),
      });
    }
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  /* impede cliques (links, lightbox) enquanto edita */
  document.addEventListener(
    'click',
    function (e) {
      if (editing && editing.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  document.addEventListener(
    'dblclick',
    function (e) {
      if (previewing) return;
      /* com pointer capture o alvo do evento é o <html>; resolve pelo ponto real */
      const t = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      if (!t || !(t instanceof Element) || !deck.contains(t)) return;
      /* já editando: o duplo clique é do navegador (seleciona a palavra) */
      if (editing && editing.contains(t)) return;
      const dslide = slideOf(t);
      if (mode === 'arrange' || (dslide && dslide !== activeSlide())) {
        e.preventDefault();
        e.stopPropagation();
        if (dslide) post({ type: 'slide-open', index: slideIndexOf(dslide) });
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const el = pick(t);
      if (!el) return;
      select(el);
      if (el.hasAttribute('data-pkg')) {
        post({ type: 'key', key: 'open-package' });
        return;
      }
      beginEdit(el, false);
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(e.clientX, e.clientY);
        const s = window.getSelection();
        if (r && s && el.contains(r.startContainer)) {
          s.removeAllRanges();
          s.addRange(r);
          /* começa já com a palavra sob o cursor selecionada */
          try {
            s.modify('move', 'backward', 'word');
            s.modify('extend', 'forward', 'word');
            const picked = s.toString();
            if (/\s$/.test(picked)) s.modify('extend', 'backward', 'character');
          } catch {
            /* navegador sem Selection.modify: fica só o cursor */
          }
        }
      }
    },
    true
  );

  document.addEventListener(
    'paste',
    function (e) {
      if (!editing) return;
      e.preventDefault();
      const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      document.execCommand('insertText', false, text);
    },
    true
  );

  /* arquivos soltos sobre o palco: o editor decide (imagem, .html, pacote) */
  document.addEventListener(
    'dragover',
    function (e) {
      e.preventDefault();
    },
    true
  );
  document.addEventListener(
    'drop',
    function (e) {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) post({ type: 'drop', file: f });
    },
    true
  );

  document.addEventListener('input', function () {
    if (editing) drawSelection(editing);
  });

  /* ---------- teclado ---------- */
  document.addEventListener(
    'keydown',
    function (e) {
      const k = e.key;
      const c = e.ctrlKey || e.metaKey;
      const low = k.length === 1 ? k.toLowerCase() : k;
      if (c && low === 's') {
        e.preventDefault();
        post({ type: 'key', key: 'save' });
        return;
      }
      if (editing) {
        if (k === 'Escape') {
          e.preventDefault();
          /* Esc sai da edição guardando o que foi feito (como no Figma); desfazer é Ctrl+Z */
          endEdit(true);
        } else if (k === 'Enter' && !e.shiftKey) {
          const t = editing.tagName.toLowerCase();
          if (t !== 'p' && t !== 'li' && t !== 'div') {
            e.preventDefault();
            endEdit(true);
          }
        }
        e.stopPropagation();
        return;
      }
      if (previewing) {
        if (k === 'Escape') stopPreview();
        return;
      }
      if (c && low === 'z') {
        e.preventDefault();
        post({ type: 'key', key: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (c && low === 'y') {
        e.preventDefault();
        post({ type: 'key', key: 'redo' });
        return;
      }
      if (c && low === 'd') {
        e.preventDefault();
        dupEl();
        return;
      }
      if (c && (e.code === 'BracketRight' || e.code === 'BracketLeft') && selected) {
        e.preventDefault();
        const up = e.code === 'BracketRight';
        zOrder(e.shiftKey ? (up ? 'top' : 'bottom') : up ? 'forward' : 'backward');
        return;
      }
      if (c && low === 'c') {
        e.preventDefault();
        if (selected && mode !== 'arrange') copyEl();
        else post({ type: 'key', key: 'copy-slide' });
        return;
      }
      if (c && low === 'v') {
        e.preventDefault();
        const clip = getClip();
        if (clip && clip.kind === 'element') pasteEl(clip);
        else post({ type: 'key', key: 'paste-slide' });
        return;
      }
      if (k === 'Escape') {
        if (pickingParent) {
          stopPickParent();
          return;
        }
        select(null);
        return;
      }
      if (k === 'Delete' || k === 'Backspace') {
        if (mode === 'arrange') {
          e.preventDefault();
          post({ type: 'key', key: 'delete-slide' });
          return;
        }
        if (selected) {
          e.preventDefault();
          delEl();
        }
        return;
      }
      if (k === 'Enter' && selected) {
        e.preventDefault();
        if (selected.hasAttribute('data-pkg')) post({ type: 'key', key: 'open-package' });
        else beginEdit(selected, false);
        return;
      }
      if (k === 'PageDown') {
        e.preventDefault();
        post({ type: 'key', key: 'next' });
        return;
      }
      if (k === 'PageUp') {
        e.preventDefault();
        post({ type: 'key', key: 'prev' });
        return;
      }
      if (k.indexOf('Arrow') === 0) {
        e.preventDefault();
        if (selected && mode !== 'arrange') {
          const st = e.shiftKey ? 10 : 1;
          if (k === 'ArrowLeft') nudge(-st, 0);
          if (k === 'ArrowRight') nudge(st, 0);
          if (k === 'ArrowUp') nudge(0, -st);
          if (k === 'ArrowDown') nudge(0, st);
        } else {
          post({ type: 'key', key: k === 'ArrowLeft' || k === 'ArrowUp' ? 'prev' : 'next' });
        }
      }
    },
    true
  );

  /* ---------- pré-visualização de animações ---------- */
  function playPreview() {
    const s = activeSlide();
    if (!s) return;
    if (editing) endEdit(true);
    clearTimeout(previewTimer);
    previewing = true;
    document.body.classList.add('mm-preview');
    s.classList.remove('mm-static');
    s.classList.remove('active');
    void s.offsetWidth;
    s.classList.add('active');
    drawSelection(null);
    try {
      if (typeof window.__anim === 'function') window.__anim(s);
    } catch {
      /* pacote com erro não derruba o editor */
    }
    const scene = (s.getAttribute('data-transition') || '').indexOf('pkg:') === 0;
    const long = s.querySelector('[data-sim]')
      ? 22000
      : s.querySelector('[data-pkg]') || scene
        ? 9000
        : 5000;
    previewTimer = setTimeout(stopPreview, long);
  }
  function stopPreview() {
    clearTimeout(previewTimer);
    if (!previewing) return;
    try {
      window.dispatchEvent(new Event('beforeprint'));
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new Event('mm-kf-reset'));
    } catch {
      /* ignore */
    }
    previewing = false;
    document.body.classList.remove('mm-preview');
    const s = activeSlide();
    if (s) s.classList.add('mm-static');
    drawSelection(selected);
    post({ type: 'key', key: 'preview-ended' });
  }

  /* ---------- mensagens do editor ---------- */
  function setActive(index: number): El | undefined {
    const list = slideList();
    list.forEach(function (s, i) {
      s.classList.toggle('active', i === index);
      s.classList.toggle('mm-static', i === index && !previewing);
    });
    return list[index];
  }

  window.addEventListener('message', function (e) {
    const data = e.data as EditorMessage | null;
    if (!data || data.__mm !== 'editor') return;
    let list: El[];
    if (data.type === 'goto') {
      if (editing) endEdit(true);
      if (previewing) stopPreview();
      const active = setActive(data.index ?? 0);
      select(mode === 'arrange' ? active : null, true);
      if (active) {
        window.scrollTo(0, 0);
        post({ type: 'slide', index: data.index });
      }
      stopPickParent();
      scheduleGhosts();
    } else if (data.type === 'select') {
      /* não silencioso: o inspetor, a linha do tempo e o dock precisam saber da seleção */
      select(elAt(data.path));
      if (selected && data.edit) beginEdit(selected, true);
    } else if (data.type === 'set-slide') {
      list = slideList();
      const old = list[data.index ?? -1];
      if (!old) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = String(data.html || '').trim();
      const next = tpl.content.firstElementChild;
      if (!next) return;
      const wasActive = old.classList.contains('active');
      const keep = selected && old.contains(selected) ? pathOf(selected) : null;
      const wasEditing = editing && old.contains(editing);
      if (wasEditing) editing = null;
      old.replaceWith(next);
      buildCanvasCss();
      Array.prototype.forEach.call(next.querySelectorAll('video'), function (v) {
        if (!previewing) v.pause();
      });
      scheduleGhosts();
      if (wasActive) {
        next.classList.add('active');
        if (!previewing) next.classList.add('mm-static');
      }
      if (selected && (selected === old || keep)) {
        const again = keep ? elAt(keep) : null;
        if (again) {
          selected = again;
          drawSelection(again);
        } else {
          select(null);
        }
      }
    } else if (data.type === 'patch-element') {
      const target = elAt(data.path);
      if (!target) return;
      const attrs = data.attrs || {};
      Object.keys(attrs).forEach(function (name: string) {
        if (attrs[name] === null) target.removeAttribute(name);
        else target.setAttribute(name, String(attrs[name]));
      });
      const classes = data.classes || {};
      (classes.remove || []).forEach(function (name: string) {
        target.classList.remove(name);
      });
      (classes.add || []).forEach(function (name: string) {
        target.classList.add(name);
      });
      const styles = data.style || {};
      Object.keys(styles).forEach(function (name) {
        if (styles[name] === null) target.style.removeProperty(name);
        else target.style.setProperty(name, String(styles[name]));
      });
      select(target);
    } else if (data.type === 'pose') {
      setPose(data.path, data.pose);
    } else if (data.type === 'preview-anim') {
      unpose();
      playPreview();
    } else if (data.type === 'stop-preview') {
      stopPreview();
    } else if (data.type === 'mode') {
      if (editing) endEdit(true);
      if (previewing) stopPreview();
      mode = data.mode === 'arrange' ? 'arrange' : 'edit';
      document.body.classList.toggle('mm-arrange', mode === 'arrange');
      sel.classList.toggle('mm-arr', mode === 'arrange');
      select(null, true);
      if (mode === 'arrange') select(activeSlide(), true);
      scheduleGhosts();
    } else if (data.type === 'view') {
      scale = data.zoom || 1;
      deck.style.transition = data.animate ? 'transform .55s cubic-bezier(.4,0,.2,1)' : 'none';
      deck.style.transform =
        'translate(' + (data.x || 0) + 'px,' + (data.y || 0) + 'px) scale(' + scale + ')';
      updateGrid();
      scaleLabels();
      drawSelection(selected);
      scheduleGhosts();
      if (editing) {
        if (data.animate) followFormat(650);
        else scheduleFormat();
      }
      /* durante a animação da câmera o retângulo medido ainda não é o final */
      clearTimeout(viewTimer);
      if (data.animate)
        viewTimer = setTimeout(function () {
          drawSelection(selected);
        }, 620);
    } else if (data.type === 'palette') {
      const pa = activeSlide();
      post({ type: 'palette', colors: pa ? paletteOf(pa) : [] });
    } else if (data.type === 'highlight') {
      const hl = data.indices || [];
      slideList().forEach(function (sl, i) {
        sl.classList.toggle('mm-hl', hl.indexOf(i) >= 0);
      });
    } else if (data.type === 'fit') {
      fit();
      drawSelection(selected);
    } else if (data.type === 'cmd') {
      runCommand(data.name, data.arg);
    }
  });

  /* ---------- paleta de cores do slide ---------- */
  function toLab(r: number, g: number, b: number): number[] {
    function lin(c: number): number {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    const R = lin(r),
      G = lin(g),
      B = lin(b);
    const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    function f(t: number): number {
      return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    }
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function hex2(n: number): string {
    const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return s.length < 2 ? '0' + s : s;
  }
  /* Colhe cores (fundos, degradês, textos, bordas, SVG) com peso por tamanho e as agrupa
     por semelhança perceptual. A quantidade (4 a 9) segue a variedade real do slide. */
  function paletteOf(slide: El): string[] {
    const items: { r: number; g: number; b: number; lab: number[]; w: number }[] = [];
    function add(str: string, w: number) {
      const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(
        str || ''
      );
      if (!m) return;
      const a =
        m[4] === undefined ? 1 : m[4].indexOf('%') > 0 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (!(a > 0.04) || !(w > 0)) return;
      const r = Number(m[1]),
        g = Number(m[2]),
        b = Number(m[3]);
      items.push({ r: r, g: g, b: b, lab: toLab(r, g, b), w: w * a });
    }
    function addAll(str: string, w: number) {
      const found = String(str || '').match(/rgba?\([^)]+\)/g) || [];
      found.forEach(function (c) {
        add(c, w / found.length);
      });
    }
    const nodes = [slide].concat(Array.prototype.slice.call(slide.querySelectorAll('*'), 0, 900));
    nodes.forEach(function (el) {
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05)
        return;
      const r = el.getBoundingClientRect();
      const area = Math.min((r.width / scale) * (r.height / scale), SLIDE_W * SLIDE_H);
      if (!(area > 40)) return;
      const side = Math.sqrt(area);
      add(cs.backgroundColor, side);
      if (
        cs.backgroundImage &&
        cs.backgroundImage !== 'none' &&
        cs.backgroundImage.indexOf('gradient') >= 0
      ) {
        addAll(cs.backgroundImage, side * 0.8);
      }
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0 && cs.borderTopStyle !== 'none')
        add(cs.borderTopColor, Math.sqrt(bw * side * 4) * 3);
      let text = 0;
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) text += (n.nodeValue ?? '').replace(/\s+/g, '').length;
      }
      if (text > 0) {
        const fs = parseFloat(cs.fontSize) || 16;
        add(cs.color, Math.sqrt(text * fs * fs * 0.6));
      }
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) {
        if (cs.fill && cs.fill !== 'none') add(cs.fill, side);
        if (cs.stroke && cs.stroke !== 'none') add(cs.stroke, side * 0.5);
      }
    });
    if (!items.length) return [];
    const total = items.reduce(function (s, i) {
      return s + i.w;
    }, 0);
    function cluster(thr: number): Cluster[] {
      const list = items.slice().sort(function (a, b) {
        return b.w - a.w;
      });
      const cl: Cluster[] = [];
      list.forEach(function (it) {
        let hit: Cluster | null = null;
        for (const c of cl) {
          const d = Math.hypot(
            (c.lab[0] ?? 0) - (it.lab[0] ?? 0),
            (c.lab[1] ?? 0) - (it.lab[1] ?? 0),
            (c.lab[2] ?? 0) - (it.lab[2] ?? 0)
          );
          if (d < thr) {
            hit = c;
            break;
          }
        }
        if (!hit) {
          cl.push({ lab: it.lab, w: it.w, r: it.r * it.w, g: it.g * it.w, b: it.b * it.w });
        } else {
          hit.w += it.w;
          hit.r += it.r * it.w;
          hit.g += it.g * it.w;
          hit.b += it.b * it.w;
        }
      });
      return cl.sort(function (a, b) {
        return b.w - a.w;
      });
    }
    let picked: Cluster[] = [];
    const plan: [number, number][] = [
      [16, 0.012],
      [10, 0.008],
      [6, 0.004],
    ];
    for (const [thr, min] of plan) {
      picked = cluster(thr).filter(function (c) {
        return c.w / total >= min;
      });
      if (picked.length >= 4) break;
    }
    return picked.slice(0, 9).map(function (c) {
      return ('#' + hex2(c.r / c.w) + hex2(c.g / c.w) + hex2(c.b / c.w)).toUpperCase();
    });
  }

  /* ======================================================================
     Contornos-fantasma: o que sai do slide é cortado (como na apresentação);
     um contorno tracejado mostra onde está o elemento.
     ====================================================================== */
  /** Contorno-fantasma → elemento que ele representa. */
  const ghostTarget = new WeakMap<Element, El>();
  const ghosts = document.createElement('div');
  ghosts.id = 'mm-ghosts';
  deck.appendChild(ghosts);
  let ghostQueued = false;
  function scheduleGhosts() {
    if (ghostQueued) return;
    ghostQueued = true;
    requestAnimationFrame(function () {
      ghostQueued = false;
      drawGhosts();
    });
  }
  function isOverlay(el: Element): boolean {
    return (
      el.classList &&
      (el.classList.contains('mm-bgl') ||
        el.id === 'mm-sel' ||
        el.id === 'mm-ghosts' ||
        el.id === 'mm-guides')
    );
  }
  function drawGhosts() {
    ghosts.innerHTML = '';
    if (mode !== 'edit' || previewing || document.body.classList.contains('mm-dragging')) return;
    const s = activeSlide();
    if (!s) return;
    const sr = rectOf(s);
    const pad = 0.5;
    function visit(node: El, depth: number) {
      kidsOf(node).forEach(function (el) {
        if (isOverlay(el)) return;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const r = rectOf(el);
        if (r.width < 1 || r.height < 1) return;
        const inside =
          r.left >= sr.left - pad &&
          r.top >= sr.top - pad &&
          r.left + r.width <= sr.left + sr.width + pad &&
          r.top + r.height <= sr.top + sr.height + pad;
        if (inside) {
          if (depth < 3) visit(el, depth + 1);
          return;
        }
        const outside =
          r.left >= sr.left + sr.width ||
          r.top >= sr.top + sr.height ||
          r.left + r.width <= sr.left ||
          r.top + r.height <= sr.top;
        const g = document.createElement('div');
        g.className = 'mm-ghost' + (outside ? ' mm-ghost-off' : '');
        g.title = outside
          ? 'Fora do slide (não aparece na apresentação) — clique para selecionar'
          : 'Parte fora do slide (cortada na apresentação)';
        g.style.left = r.left + 'px';
        g.style.top = r.top + 'px';
        g.style.width = r.width + 'px';
        g.style.height = r.height + 'px';
        g.style.borderWidth = Math.max(1, 1.5 / scale).toFixed(2) + 'px';
        ghostTarget.set(g, el);
        ghosts.appendChild(g);
      });
    }
    visit(s, 0);
  }

  /* ======================================================================
     Alinhamento inteligente: guias para as bordas/centro do slide e dos outros
     elementos. Ctrl desliga; Shift trava o eixo; Alt + arrastar duplica.
     ====================================================================== */
  const guides = document.createElement('div');
  guides.id = 'mm-guides';
  deck.appendChild(guides);
  function clearGuides() {
    guides.innerHTML = '';
  }
  function localRect(el: Element, slide: El, ls: number): Box {
    const sr = rectOf(slide);
    const r = rectOf(el);
    return {
      left: (r.left - sr.left) / ls,
      top: (r.top - sr.top) / ls,
      width: r.width / ls,
      height: r.height / ls,
    };
  }
  /* Alvos de alinhamento (em px do slide): bordas e centro do slide e dos outros elementos. */
  function snapTargets(el: El, slide: El, ls: number): Snap {
    const xs = [0, SLIDE_W / 2, SLIDE_W];
    const ys = [0, SLIDE_H / 2, SLIDE_H];
    Array.prototype.forEach.call(slide.querySelectorAll('*'), function (o) {
      if (o === el || el.contains(o) || o.contains(el) || isOverlay(o)) return;
      if (o.closest('.mm-bgl')) return;
      const cs = window.getComputedStyle(o);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') return;
      const r = localRect(o, slide, ls);
      if (r.width < 4 || r.height < 4) return;
      if (r.width > SLIDE_W * 0.98 && r.height > SLIDE_H * 0.9) return;
      xs.push(r.left, r.left + r.width / 2, r.left + r.width);
      ys.push(r.top, r.top + r.height / 2, r.top + r.height);
    });
    return { xs: xs, ys: ys };
  }
  /* Menor ajuste para encostar alguma das posições `edges` num alvo (ou null). */
  function bestSnap(
    edges: number[],
    targets: number[],
    thr: number
  ): { d: number; at: number } | null {
    let best: { d: number; at: number } | null = null;
    edges.forEach(function (e) {
      targets.forEach(function (t) {
        const d = t - e;
        if (Math.abs(d) <= thr && (best === null || Math.abs(d) < Math.abs(best.d))) {
          best = { d: d, at: t };
        }
      });
    });
    return best;
  }
  function drawGuide(slide: El, ls: number, axis: 'x' | 'y', at: number) {
    const sr = rectOf(slide);
    const g = document.createElement('div');
    g.className = 'mm-guide';
    const w = Math.max(1, 1 / scale);
    if (axis === 'x') {
      g.style.left = sr.left + at * ls - w / 2 + 'px';
      g.style.top = sr.top + 'px';
      g.style.width = w + 'px';
      g.style.height = sr.height + 'px';
    } else {
      g.style.left = sr.left + 'px';
      g.style.top = sr.top + at * ls - w / 2 + 'px';
      g.style.width = sr.width + 'px';
      g.style.height = w + 'px';
    }
    guides.appendChild(g);
  }
  /* Aplica o alinhamento no arrasto (move) e devolve o deslocamento ajustado (px do slide). */
  function snapMove(d: Drag, ax: number, ay: number, e: PointerEvent) {
    clearGuides();
    const { snap, slide, ls, r0 } = d;
    if (e.ctrlKey || e.metaKey || !snap || !slide || !ls || !r0) return { ax: ax, ay: ay };
    const thr = 7 / (scale * ls);
    const L = r0.left + ax;
    const T = r0.top + ay;
    const W = r0.width;
    const H = r0.height;
    const sx = ax !== 0 || !e.shiftKey ? bestSnap([L, L + W / 2, L + W], snap.xs, thr) : null;
    const sy = ay !== 0 || !e.shiftKey ? bestSnap([T, T + H / 2, T + H], snap.ys, thr) : null;
    if (sx && !(e.shiftKey && d.lock === 'y')) {
      ax += sx.d;
      drawGuide(slide, ls, 'x', sx.at);
    }
    if (sy && !(e.shiftKey && d.lock === 'x')) {
      ay += sy.d;
      drawGuide(slide, ls, 'y', sy.at);
    }
    return { ax: ax, ay: ay };
  }
  /* Alinhamento no redimensionar: a borda direita/inferior encosta nos alvos. */
  function snapResize(d: Drag, w: number, h: number, e: PointerEvent) {
    clearGuides();
    const { snap, slide, ls, r0 } = d;
    if (e.ctrlKey || e.metaKey || !snap || !slide || !ls || !r0) return { w: w, h: h };
    const thr = 7 / (scale * ls);
    if (d.h !== 's') {
      const sx = bestSnap([r0.left + w], snap.xs, thr);
      if (sx) {
        w += sx.d;
        drawGuide(slide, ls, 'x', sx.at);
      }
    }
    if (d.h !== 'e') {
      const sy = bestSnap([r0.top + h], snap.ys, thr);
      if (sy) {
        h += sy.d;
        drawGuide(slide, ls, 'y', sy.at);
      }
    }
    return { w: w, h: h };
  }

  /* Alinha o elemento ao slide (h: left|center|right; v: top|middle|bottom). */
  function alignToSlide(h: string | null, v: string | null) {
    if (!selected || !isSlideChild(selected) || isLocked(selected)) return;
    const s = slideOf(selected);
    if (!s) return;
    const ls = layoutOf(s, slideIndexOf(s)).s;
    const r = localRect(selected, s, ls);
    const t = getTrans(selected);
    let dx = 0;
    let dy = 0;
    if (h === 'left') dx = -r.left;
    else if (h === 'center') dx = (SLIDE_W - r.width) / 2 - r.left;
    else if (h === 'right') dx = SLIDE_W - r.width - r.left;
    if (v === 'top') dy = -r.top;
    else if (v === 'middle') dy = (SLIDE_H - r.height) / 2 - r.top;
    else if (v === 'bottom') dy = SLIDE_H - r.height - r.top;
    setTrans(selected, t.x + dx, t.y + dy);
    drawSelection(selected);
    commit('');
  }

  /* ======================================================================
     Camadas: a ordem entre irmãos vira z-index explícito (1, 2, 3…), então
     "frente/trás" anda exatamente uma posição entre os que se sobrepõem.
     ====================================================================== */
  function zOf(el: El): number {
    const z = parseInt(window.getComputedStyle(el).zIndex, 10);
    return isNaN(z) ? 0 : z;
  }
  function overlaps(a: El, b: El): boolean {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom;
  }
  function zOrder(dir: 'top' | 'bottom' | 'forward' | 'backward') {
    if (!selected || !isSlideChild(selected)) return;
    const el = selected;
    const parent = el.parentElement;
    if (!parent) return;
    const sibs = kidsOf(parent).filter(function (x) {
      return !isOverlay(x) && x.nodeType === 1;
    });
    const order = sibs
      .map(function (x, i) {
        return { el: x, z: zOf(x), i: i };
      })
      .sort(function (a, b) {
        return a.z - b.z || a.i - b.i;
      })
      .map(function (o) {
        return o.el;
      });
    const at = order.indexOf(el);
    if (at < 0) return;
    order.splice(at, 1);
    let to = at;
    if (dir === 'top') to = order.length;
    else if (dir === 'bottom') to = 0;
    else if (dir === 'forward') {
      to = order.length;
      for (let i = at; i < order.length; i++) {
        const o = order[i];
        if (o && overlaps(o, el)) {
          to = i + 1;
          break;
        }
      }
    } else if (dir === 'backward') {
      to = 0;
      for (let j = at - 1; j >= 0; j--) {
        const o = order[j];
        if (o && overlaps(o, el)) {
          to = j;
          break;
        }
      }
    }
    order.splice(to, 0, el);
    order.forEach(function (x, k) {
      ensurePos(x);
      x.style.zIndex = String(k + 1);
    });
    drawSelection(el);
    commit('');
    post({ type: 'layer', index: order.indexOf(el) + 1, total: order.length });
  }

  /* ======================================================================
     Pai e filho: o filho passa a morar dentro do pai (move, anima e some junto).
     ====================================================================== */
  let pickingParent: El | null = null;
  function canBeParent(p: El | null, child: El): p is El {
    if (!p || p === child || child.contains(p)) return false;
    if (/^(img|video|svg|input|br|hr|iframe|textarea)$/i.test(p.tagName)) return false;
    if (p.closest && p.closest('svg') && p.tagName.toLowerCase() !== 'svg') return false;
    return slideOf(p) === slideOf(child);
  }
  /* Coloca `child` dentro de `parent` (ou da raiz do slide) sem mudar onde ele aparece. */
  function moveInto(child: El, parent: El) {
    const s = slideOf(child);
    if (!s) return;
    const es = layoutOf(s, slideIndexOf(s)).s;
    const before = rectOf(child);
    if (parent !== s) ensurePos(parent);
    parent.appendChild(child);
    child.style.position = 'absolute';
    child.style.removeProperty('translate');
    child.style.removeProperty('inset');
    child.style.removeProperty('right');
    child.style.removeProperty('bottom');
    if (!child.style.width) child.style.width = Math.round(before.width / es) + 'px';
    child.style.left = '0px';
    child.style.top = '0px';
    const now = rectOf(child);
    child.style.left = Math.round((before.left - now.left) / es) + 'px';
    child.style.top = Math.round((before.top - now.top) / es) + 'px';
  }
  function startPickParent() {
    if (!selected || !isSlideChild(selected)) return;
    pickingParent = selected;
    document.body.classList.add('mm-picking');
    post({ type: 'picking', on: true });
  }
  function stopPickParent() {
    if (!pickingParent) return;
    pickingParent = null;
    document.body.classList.remove('mm-picking');
    post({ type: 'picking', on: false });
  }
  function finishPickParent(target: El | null) {
    const child = pickingParent;
    stopPickParent();
    if (!child) return;
    if (!canBeParent(target, child)) {
      post({
        type: 'notice',
        text: 'Esse elemento não pode ser o pai (escolha uma caixa, forma ou bloco do mesmo slide).',
      });
      return;
    }
    moveInto(child, target);
    select(child);
    commit('', child);
  }
  function unparent() {
    if (!selected || !isSlideChild(selected)) return;
    const s = slideOf(selected);
    if (!s || selected.parentElement === s) return;
    moveInto(selected, s);
    select(selected);
    commit('', selected);
  }

  /* ======================================================================
     Formatação de trecho do texto em edição. A barra fica no app (fora do iframe);
     aqui ficam o trecho guardado, os comandos e o aviso de onde ele está na tela.
     ====================================================================== */
  let savedRange: Range | null = null;

  /* O slide corta o que vaza (overflow:hidden), mas ainda pode ser rolado pelo navegador
     (foco, cursor no fim do texto…): isso "puxava" o slide inteiro. Mantém tudo no lugar. */
  function resetScroll() {
    [deck].concat(slideList()).forEach(function (n) {
      if (n.scrollLeft || n.scrollTop) {
        n.scrollLeft = 0;
        n.scrollTop = 0;
      }
    });
    if (document.scrollingElement) {
      document.scrollingElement.scrollLeft = 0;
      document.scrollingElement.scrollTop = 0;
    }
  }
  document.addEventListener(
    'scroll',
    function (e) {
      const t = e.target;
      if (t === document || t === deck || (t instanceof Element && t.classList.contains('slide')))
        resetScroll();
      else if (t instanceof Element && deck.contains(t) && (t.scrollLeft || t.scrollTop)) {
        t.scrollLeft = 0;
        t.scrollTop = 0;
      }
    },
    true
  );

  function selectionInEditing() {
    const s = window.getSelection();
    if (!editing || !s || s.rangeCount === 0 || s.isCollapsed) return null;
    const r = s.getRangeAt(0);
    return editing.contains(r.commonAncestorContainer) ? r : null;
  }
  /* Sem `focus`: a barra fica no app e seus campos (cor, tamanho) não podem perder o foco. */
  function restoreRange(focus?: boolean): boolean {
    if (!savedRange || !editing) return false;
    if (focus && document.activeElement !== editing) editing.focus({ preventScroll: true });
    const s = window.getSelection();
    if (!s) return false;
    s.removeAllRanges();
    s.addRange(savedRange);
    return true;
  }
  /* Primeiro pedaço de texto dentro do trecho (o início pode cair entre elementos). */
  function firstTextIn(range: Range): Text | null {
    const root = range.commonAncestorContainer;
    if (root instanceof Text) return root;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (!(n instanceof Text) || !n.nodeValue || !range.intersectsNode(n)) continue;
      if (n === range.startContainer && range.startOffset >= n.nodeValue.length) continue;
      return n;
    }
    return null;
  }
  function styleAt(range: Range): CSSStyleDeclaration {
    const t = firstTextIn(range);
    let node: Node | null = t ? t.parentElement : range.startContainer;
    if (node && !(node instanceof Element)) node = node.parentElement;
    const el = (node as Element | null) || editing || deck;
    return window.getComputedStyle(el);
  }
  function hexOf(c: string): string {
    const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(c || '');
    if (!m) return '';
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(function (n) {
          return ('0' + Number(n).toString(16)).slice(-2);
        })
        .join('')
        .toUpperCase()
    );
  }
  let fmtTimer: number | null = null;
  function reportFormat() {
    const r = editing ? selectionInEditing() : null;
    if (r) savedRange = r.cloneRange();
    if (!r) {
      post({ type: 'text-format', open: false });
      return;
    }
    const box = editing;
    if (!box) return;
    const b = r.getBoundingClientRect();
    const cs = styleAt(r);
    const q = function (c: string) {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    post({
      type: 'text-format',
      open: true,
      rect: { left: b.left, top: b.top, width: b.width, height: b.height },
      state: {
        size: Math.round(parseFloat(cs.fontSize) || 24),
        font: cs.fontFamily || '',
        color: hexOf(cs.color),
        bold: q('bold'),
        italic: q('italic'),
        underline: q('underline'),
        strike: q('strikeThrough'),
        sup: q('superscript'),
        sub: q('subscript'),
        fx: fxOf(styleOwner(r)),
        reflect:
          box.getAttribute('data-reflect') ||
          (box.style.getPropertyValue('-webkit-box-reflect') ? '{}' : null),
      },
    });
  }
  /* Configuração de efeitos que vale no trecho: o data-fx mais próximo (até a caixa). */
  function fxOf(el: Element | null): string | null {
    if (!editing) return null;
    while (el && el !== editing.parentElement) {
      if (el.nodeType === 1 && el.hasAttribute('data-fx')) return el.getAttribute('data-fx');
      if (el === editing) break;
      el = el.parentElement;
    }
    return null;
  }
  function styleOwner(range: Range): El | null {
    const t = firstTextIn(range);
    return t ? t.parentElement : null;
  }
  function scheduleFormat() {
    if (fmtTimer) return;
    fmtTimer = requestAnimationFrame(function () {
      fmtTimer = null;
      reportFormat();
    });
  }
  /* Durante a animação da câmera: informa a posição do trecho a cada quadro. */
  let followUntil = 0;
  function followFormat(ms: number) {
    const running = followUntil > Date.now();
    followUntil = Date.now() + ms;
    if (running) return;
    (function tick() {
      if (!editing) return;
      reportFormat();
      if (Date.now() < followUntil) requestAnimationFrame(tick);
    })();
  }

  /* Aplica estilos (e classes) só ao trecho: cada pedaço de texto ganha (ou reaproveita)
     um <span>. Previsível em qualquer navegador, ao contrário do execCommand("fontSize"). */
  function styleRange(
    styles: StyleMap,
    addClass?: string[] | null,
    removeClass?: string[] | null,
    attrs?: StyleMap,
    nestedStyles?: StyleMap | null
  ) {
    if (!restoreRange()) return;
    const r = savedRange;
    const box = editing;
    if (!r || !box || r.collapsed) return;
    let sc: Node = r.startContainer;
    let so = r.startOffset;
    let ec: Node = r.endContainer;
    let eo = r.endOffset;
    if (ec instanceof Text && eo < ec.length && eo > 0) ec.splitText(eo);
    if (sc instanceof Text && so > 0 && so < sc.length) {
      const rest = sc.splitText(so);
      if (ec === sc) {
        ec = rest;
        eo = eo - so;
      }
      sc = rest;
      so = 0;
    }
    const range = document.createRange();
    range.setStart(sc, so);
    if (ec instanceof Text) range.setEnd(ec, Math.min(eo, ec.length));
    else range.setEnd(ec, eo);
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
    const texts: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (!(n instanceof Text) || !n.nodeValue || !range.intersectsNode(n)) continue;
      if (n === range.startContainer && range.startOffset >= n.nodeValue.length) continue;
      if (n === range.endContainer && range.endOffset === 0) continue;
      texts.push(n);
    }
    const targets: El[] = [];
    texts.forEach(function (t) {
      const parent = t.parentElement;
      let target: El;
      if (parent && parent !== box && parent.tagName === 'SPAN' && parent.childNodes.length === 1) {
        target = parent;
      } else {
        target = document.createElement('span');
        t.parentNode?.insertBefore(target, t);
        target.appendChild(t);
      }
      /* dentro de outro trecho (ou caixa) com efeito: valores neutros explícitos */
      const up = target.parentElement;
      const fxUp = nestedStyles && up ? up.closest('[data-fx]') : null;
      const nested = !!fxUp && box.contains(fxUp);
      const use: StyleMap = (nested ? nestedStyles : styles) || {};
      Object.keys(use).forEach(function (k) {
        const v = use[k];
        if (v === null || v === undefined || v === '') target.style.removeProperty(k);
        else target.style.setProperty(k, v);
      });
      const at: StyleMap = attrs || {};
      Object.keys(at).forEach(function (k) {
        const v = at[k];
        if (v === null || v === undefined) target.removeAttribute(k);
        else target.setAttribute(k, v);
      });
      (removeClass || []).forEach(function (c) {
        target.classList.remove(c);
      });
      (addClass || []).forEach(function (c) {
        target.classList.add(c);
      });
      if (!target.getAttribute('style')) target.removeAttribute('style');
      if (!target.getAttribute('class')) target.removeAttribute('class');
      targets.push(target);
    });
    if (!targets.length) return;
    /* junta vizinhos idênticos e desfaz <span> vazios de estilo */
    let first = targets[0] as El;
    const last = targets[targets.length - 1] as El;
    targets.forEach(function (t) {
      const next = t.nextSibling;
      if (
        next instanceof HTMLElement &&
        next.tagName === 'SPAN' &&
        targets.indexOf(next) >= 0 &&
        next.getAttribute('style') === t.getAttribute('style') &&
        next.getAttribute('class') === t.getAttribute('class') &&
        next.getAttribute('data-fx') === t.getAttribute('data-fx')
      ) {
        /* tudo antes do primeiro filho original (inserir sempre no começo invertia a ordem) */
        const anchor = next.firstChild;
        while (t.firstChild) next.insertBefore(t.firstChild, anchor);
        if (first === t) first = next;
        t.remove();
      }
    });
    const sel = document.createRange();
    sel.setStartBefore(first.isConnected ? first : last);
    sel.setEndAfter(last);
    const ws = window.getSelection();
    ws?.removeAllRanges();
    ws?.addRange(sel);
    savedRange = sel.cloneRange();
    drawSelection(box);
    resetScroll();
    reportFormat();
  }

  /* Remove spans vazios de estilo que sobraram (sem style, classe nem atributos). */
  function unwrapBare(root: El) {
    Array.prototype.slice.call(root.querySelectorAll('span')).forEach(function (sp) {
      if (sp.attributes.length === 0) {
        while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
        sp.remove();
      }
    });
  }

  function runFormat(arg: CommandArg | undefined) {
    if (!editing || !arg) return;
    const cmd = arg.cmd || arg.command || (arg.color ? 'color' : '');
    const v = arg.cmd ? arg.value : arg.color;
    if (cmd === 'reflect') {
      /* reflexo: vale para a caixa de texto toda */
      const rv = (v || {}) as { css?: string; data?: string };
      if (rv.css) editing.style.setProperty('-webkit-box-reflect', String(rv.css));
      else editing.style.removeProperty('-webkit-box-reflect');
      if (rv.data) editing.setAttribute('data-reflect', rv.data);
      else editing.removeAttribute('data-reflect');
      drawSelection(editing);
      restoreRange();
      reportFormat();
      return;
    }
    if (!restoreRange() || !savedRange) return;
    if (cmd === 'size' || cmd === 'size-step') {
      const cur = Math.round(parseFloat(styleAt(savedRange).fontSize) || 24);
      const px = cmd === 'size' ? Number(v) : cur + Number(v);
      if (!isFinite(px)) return;
      styleRange({ 'font-size': Math.max(4, Math.min(600, Math.round(px))) + 'px' });
    } else if (cmd === 'font') {
      styleRange({ 'font-family': typeof v === 'string' && v ? v : null });
    } else if (cmd === 'fx') {
      /* efeitos (preenchimento, contorno, sombras…): CSS pronto + configuração no data-fx */
      const fv = (v || {}) as {
        css?: StyleMap;
        shine?: boolean;
        data?: string;
        nested?: StyleMap;
      };
      styleRange(
        fv.css || {},
        fv.shine ? ['mm-shine'] : null,
        fv.shine ? null : ['mm-shine'],
        { 'data-fx': fv.data || null },
        fv.nested || null
      );
    } else if (cmd === 'style') {
      styleRange((v || {}) as StyleMap);
    } else {
      restoreRange(true);
      document.execCommand('styleWithCSS', false, 'false');
      if (cmd === 'removeFormat') {
        document.execCommand('removeFormat');
        const clear: StyleMap = { 'font-size': null, 'font-family': null };
        (arg.props || []).forEach(function (k) {
          clear[k] = null;
        });
        /* trechos inteiros dentro da seleção (inclusive os que têm outros trechos dentro) */
        const selNow = window.getSelection();
        Array.prototype.slice.call(editing.querySelectorAll('span')).forEach(function (sp) {
          if (!selNow || !selNow.containsNode(sp, false)) return;
          Object.keys(clear).forEach(function (k) {
            sp.style.removeProperty(k);
          });
          sp.classList.remove('mm-shine');
          sp.removeAttribute('data-fx');
          if (!sp.getAttribute('style')) sp.removeAttribute('style');
          if (!sp.getAttribute('class')) sp.removeAttribute('class');
        });
        styleRange(clear, null, ['mm-shine'], { 'data-fx': null });
        unwrapBare(editing);
        return;
      }
      document.execCommand(cmd);
      const s2 = window.getSelection();
      if (s2 && s2.rangeCount) savedRange = s2.getRangeAt(0).cloneRange();
      drawSelection(editing);
      resetScroll();
      reportFormat();
    }
  }

  document.addEventListener('selectionchange', scheduleFormat);

  /* ======================================================================
     Vídeos: no editor ficam parados (só tocam na pré-visualização/apresentação).
     ====================================================================== */
  document.addEventListener(
    'play',
    function (e) {
      if (!previewing && e.target instanceof HTMLVideoElement) e.target.pause();
    },
    true
  );
  Array.prototype.forEach.call(document.querySelectorAll('video'), function (v) {
    v.pause();
  });

  /* ======================================================================
     Menu de contexto: o editor desenha o menu; aqui só dizemos onde e sobre o quê.
     ====================================================================== */
  document.addEventListener(
    'contextmenu',
    function (e) {
      if (editing && editing.contains(e.target as Node)) return;
      e.preventDefault();
      if (previewing) return;
      const t = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      let kind = 'canvas';
      let index = null;
      if (t && t instanceof Element && deck.contains(t)) {
        const g = t.closest('.mm-ghost');
        const ghostOf = g ? ghostTarget.get(g) : undefined;
        const sl = ghostOf ? slideOf(ghostOf) : slideOf(t);
        if (sl) {
          index = slideIndexOf(sl);
          kind = 'slide';
          if (mode === 'edit' && sl === activeSlide()) {
            const el = ghostOf ?? pick(t);
            if (el) {
              select(el);
              kind = 'element';
            }
          } else if (sl !== activeSlide()) {
            post({ type: 'slide-click', index: index });
          }
        }
      }
      post({
        type: 'context',
        x: e.clientX,
        y: e.clientY,
        kind: kind,
        index: index,
        text:
          kind === 'element' && selected
            ? isTextElement(selected) &&
              (selected.classList.contains('ed-text') || selected.textContent.trim() !== '')
            : false,
        nested:
          kind === 'element' && selected ? selected.parentElement !== slideOf(selected) : false,
        locked: kind === 'element' && selected ? isLocked(selected) : false,
      });
    },
    true
  );

  function runCommand(name: string | undefined, arg: CommandArg | undefined) {
    if (name === 'delete') delEl();
    else if (name === 'duplicate') dupEl();
    else if (name === 'front') zOrder('top');
    else if (name === 'back') zOrder('bottom');
    else if (name === 'forward') zOrder('forward');
    else if (name === 'backward') zOrder('backward');
    else if (name === 'align' && arg) alignToSlide(arg.h || null, arg.v || null);
    else if (name === 'set-parent') startPickParent();
    else if (name === 'unparent') unparent();
    else if (name === 'cancel-pick') stopPickParent();
    else if (name === 'format') runFormat(arg);
    else if (name === 'reset') resetPos();
    else if (name === 'copy') {
      if (selected) copyEl();
    } else if (name === 'paste') {
      const cp = getClip();
      if (cp && cp.kind === 'element') pasteEl(cp);
    } else if (name === 'parent') selectParent();
    else if (name === 'edit') {
      if (selected) beginEdit(selected, false);
    } else if (name === 'nudge' && arg) nudge(Number(arg.dx) || 0, Number(arg.dy) || 0);
  }

  /* estado inicial: sem animações ao editar */
  const first = activeSlide();
  if (first) first.classList.add('mm-static');

  post({ type: 'ready', count: slideList().length });
})();

export {};
