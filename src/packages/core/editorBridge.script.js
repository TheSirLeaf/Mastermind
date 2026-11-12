/* Motor de edição que roda DENTRO do iframe do palco.
 *
 * Protocolo (postMessage):
 *   iframe → editor : ready · select · slide · slide-html · key · edit
 *   editor → iframe : goto · select · set-slide · patch-element · preview-anim ·
 *                     stop-preview · fit · cmd
 *
 * Este arquivo é embutido como string (import ?raw); mantenha-o autônomo e sem
 * a sequência de fechamento de script.
 */
(function () {
  if (window.__MM_EDITOR__) return;
  window.__MM_EDITOR__ = true;

  var deck = document.getElementById('deck');
  var stage = document.getElementById('stage');
  if (!deck || !stage) return;

  var GOLD = '#F7D98B';
  var INK = '#2A0E1A';

  /* ---------- overlay de seleção ---------- */
  var sel = document.createElement('div');
  sel.id = 'mm-sel';
  sel.style.cssText =
    'position:absolute;z-index:3000000;pointer-events:none;box-sizing:border-box;display:none;' +
    'border:2px solid ' +
    GOLD +
    ';box-shadow:0 0 0 1px rgba(16,6,11,.55),0 0 24px rgba(247,217,139,.3)';
  var tag = document.createElement('div');
  tag.id = 'mm-tag';
  sel.appendChild(tag);
  var handles = {};
  ['se', 'e', 's'].forEach(function (name) {
    var h = document.createElement('div');
    h.className = 'mm-h';
    h.setAttribute('data-h', name);
    sel.appendChild(h);
    handles[name] = h;
  });
  deck.appendChild(sel);
  var grid = document.createElement('div');
  grid.id = 'mm-grid';
  deck.appendChild(grid);
  /* pontos do grid: espaçamento cresce ao afastar para manter a densidade na tela */
  function updateGrid() {
    var step = 80;
    while (step * scale < 28) step *= 2;
    var r = Math.max(1.2, 1.7 / scale);
    var off = 200000 % step;
    grid.style.backgroundImage =
      'radial-gradient(circle, #34343d ' +
      r.toFixed(2) +
      'px, transparent ' +
      (r + 0.6 / scale).toFixed(2) +
      'px)';
    grid.style.backgroundSize = step + 'px ' + step + 'px';
    grid.style.backgroundPosition = step / 2 - off + 'px ' + (step / 2 - off) + 'px';
  }

  var style = document.createElement('style');
  style.textContent = [
    'html,body{overflow:hidden}',
    'html,body,#stage{background:#17171b!important}',
    '#mm-grid{position:absolute;left:-200000px;top:-200000px;width:400000px;height:400000px;z-index:0;pointer-events:none}',
    /* elementos podem ser arrastados para fora do slide (grid); a apresentação continua cortando */
    'body.mm-canvas:not(.mm-preview) .slide{overflow:visible!important}',
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
  ].join('\n');
  document.head.appendChild(style);

  var scale = 1;
  var viewTimer = null;
  deck.addEventListener('transitionend', function (e) {
    if (e.target === deck) drawSelection(selected);
  });
  var selected = null;
  var editing = null;
  var editingOriginal = '';
  var drag = null;
  var previewing = false;
  var previewTimer = null;

  /* Mundo: cada slide tem posição (data-x/data-y) e escala (data-s) no espaço; o editor
     controla a câmera (zoom/pan) e o modo ('edit' ou 'arrange' = mover/redimensionar slides). */
  var mode = 'edit';
  var SLIDE_W = 1920;
  var SLIDE_H = 1080;
  var GAP = 160;
  document.body.classList.add('mm-canvas');
  var canvasStyle = document.createElement('style');
  canvasStyle.id = 'mm-canvas-style';
  document.head.appendChild(canvasStyle);

  function isBase(slide) {
    return !!slide && slide.hasAttribute && slide.hasAttribute('data-base-id');
  }
  function layoutOf(slide, index) {
    if (isBase(slide)) {
      var k = slideList().filter(isBase).indexOf(slide);
      return { x: k * (SLIDE_W + GAP), y: -(SLIDE_H + 380), s: 1 };
    }
    var sc = parseFloat(slide.getAttribute('data-s'));
    var x = parseFloat(slide.getAttribute('data-x'));
    var y = parseFloat(slide.getAttribute('data-y'));
    return {
      x: isNaN(x) ? index * (SLIDE_W + GAP) : x,
      y: isNaN(y) ? 0 : y,
      s: sc > 0 ? sc : 1,
    };
  }
  function slideIndexOf(slide) {
    return Array.prototype.indexOf.call(slideList(), slide);
  }
  /* escala do slide que contém o elemento (a câmera já está em `scale`) */
  function esOf(el) {
    var sl = slideOf(el);
    return sl ? layoutOf(sl, slideIndexOf(sl)).s : 1;
  }

  function buildCanvasCss() {
    var list = slideList();
    var css = [
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
      var l = layoutOf(sl, i);
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
  var labels = document.createElement('div');
  labels.id = 'mm-labels';
  deck.appendChild(labels);
  function drawLabels() {
    labels.innerHTML = '';
    slideList().forEach(function (sl, i) {
      if (!isBase(sl)) return;
      var l = layoutOf(sl, i);
      var t = document.createElement('div');
      t.className = 'mm-base-tag';
      t.setAttribute('data-for', String(i));
      t.style.left = l.x + 'px';
      t.style.top = l.y + 'px';
      var b = document.createElement('b');
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
    var k = Math.min(10, 1 / Math.max(scale, 0.01));
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

  function post(msg) {
    msg.__mm = 'deck';
    try {
      window.parent.postMessage(msg, '*');
    } catch (e) {
      /* sem pai */
    }
  }

  /* ---------- navegação no DOM ---------- */
  function slideList() {
    return Array.prototype.filter.call(deck.children, function (c) {
      return c.classList && c.classList.contains('slide');
    });
  }
  function activeSlide() {
    return deck.querySelector('.slide.active');
  }
  function slideOf(el) {
    var n = el;
    while (n && n.parentNode !== deck) n = n.parentNode;
    return n && n.classList && n.classList.contains('slide') ? n : null;
  }
  /* filhos "reais": a camada de base (.mm-bgl) é só visual e não existe no HTML guardado */
  function kidsOf(node) {
    return Array.prototype.filter.call(node.children, function (c) {
      return !(c.classList && c.classList.contains('mm-bgl'));
    });
  }
  function pathOf(el) {
    var path = [];
    var node = el;
    while (node && node !== deck) {
      if (!node.parentNode) return null;
      path.unshift(kidsOf(node.parentNode).indexOf(node));
      node = node.parentNode;
    }
    return node === deck ? path : null;
  }
  function elAt(path) {
    if (!path || !path.length) return null;
    var node = deck;
    for (var i = 0; i < path.length; i++) {
      node = node && node.children ? (i === 0 ? node.children : kidsOf(node))[path[i]] : null;
      if (!node) return null;
    }
    return node;
  }
  function registryName(id) {
    try {
      var node = document.getElementById('pkg-registry');
      var reg = node ? JSON.parse(node.textContent || '{}') : {};
      return reg[id] && reg[id].def && reg[id].def.name ? reg[id].def.name : 'Pacote';
    } catch (e) {
      return 'Pacote';
    }
  }
  function labelOf(el) {
    if (el.hasAttribute && el.hasAttribute('data-pkg'))
      return registryName(el.getAttribute('data-pkg'));
    if (el.classList.contains('cover-glow')) return 'Efeito de luz';
    if (el.classList.contains('ed-shape')) return 'Forma';
    if (el.classList.contains('ed-text')) return 'Texto';
    var names = {
      h1: 'Título',
      h2: 'Título',
      h3: 'Subtítulo',
      p: 'Parágrafo',
      li: 'Item',
      img: 'Imagem',
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
    var t = el.tagName.toLowerCase();
    return names[t] || t;
  }
  function isMedia(el) {
    return /^(img|svg)$/i.test(el.tagName);
  }
  function pkgRoot(el, slide) {
    for (var a = el; a && a !== slide; a = a.parentElement) {
      if (a.hasAttribute && a.hasAttribute('data-pkg')) return a;
    }
    return el;
  }
  /* Resolve o alvo do clique para o elemento "selecionável". */
  function pick(t) {
    if (!t || t.nodeType !== 1) return null;
    var s = activeSlide();
    if (!s || !s.contains(t) || t === s) return null;
    var el = t;
    var outer = el.closest('svg');
    if (outer) {
      while (outer.parentElement && outer.parentElement.closest('svg')) {
        outer = outer.parentElement.closest('svg');
      }
      el = outer;
    } else {
      while (el && el !== s) {
        var d = window.getComputedStyle(el).display;
        if (d === 'inline' || d === 'contents') el = el.parentElement;
        else break;
      }
    }
    if (!el || el === s) return null;
    if (el.classList.contains('content')) return null;
    return pkgRoot(el, s);
  }

  /* ---------- serialização ---------- */
  function serialize(slide) {
    var c = slide.cloneNode(true);
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
  function commit(key, from) {
    var s = slideOf(from || selected) || activeSlide();
    if (!s) return;
    var idx = slideList().indexOf(s);
    if (idx < 0) return;
    post({ type: 'slide-html', index: idx, html: serialize(s), key: key || '' });
  }

  /* ---------- seleção ---------- */
  function rectOf(el) {
    var dr = deck.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return {
      left: (r.left - dr.left) / scale,
      top: (r.top - dr.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
    };
  }
  function isLocked(el) {
    return !!el && !!el.style && el.style.pointerEvents === 'none';
  }
  function drawSelection(el) {
    if (!el || !el.isConnected || previewing) {
      sel.style.display = 'none';
      return;
    }
    sel.classList.toggle('mm-locked-sel', isLocked(el));
    var r = rectOf(el);
    var px = function (n) {
      return Math.max(1, n / scale).toFixed(2) + 'px';
    };
    var hs = 14 / scale;
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
      var esz = esOf(el);
      tag.textContent =
        (isLocked(el) ? '🔒 ' : '') +
        labelOf(el) +
        ' · ' +
        Math.round(r.width / esz) +
        '×' +
        Math.round(r.height / esz);
    }
    var inside = r.top * scale < 34;
    tag.style.fontSize = (12 / scale).toFixed(2) + 'px';
    tag.style.padding = px(3) + ' ' + px(8);
    tag.style.borderRadius = inside
      ? '0 ' + px(6) + ' ' + px(6) + ' ' + px(6)
      : px(6) + ' ' + px(6) + ' ' + px(6) + ' 0';
    tag.style.left = '-' + px(2);
    tag.style.top = inside ? 'auto' : '-' + (26 / scale).toFixed(2) + 'px';
    tag.style.bottom = inside ? '-' + (26 / scale).toFixed(2) + 'px' : 'auto';
  }
  function select(el, silent) {
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
  function getTrans(el) {
    var v = (el.style.translate || '').trim().split(/\s+/);
    return { x: parseFloat(v[0]) || 0, y: parseFloat(v[1]) || 0 };
  }
  function setTrans(el, x, y) {
    el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
  }

  /* ---------- edição de texto ---------- */
  function isTextElement(el) {
    if (!el || el === deck) return false;
    var t = el.tagName.toLowerCase();
    if (t === 'section' || t === 'img' || t === 'svg' || t === 'br') return false;
    if (el.hasAttribute('data-pkg') || el.closest('[data-pkg]')) return false;
    return true;
  }
  function beginEdit(el, all) {
    if (!isTextElement(el) || isLocked(el)) return;
    if (editing) endEdit(true);
    editing = el;
    editingOriginal = el.innerHTML;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-mm-editing', '1');
    el.setAttribute('spellcheck', 'false');
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    if (!all) range.collapse(false);
    var s = window.getSelection();
    if (s) {
      s.removeAllRanges();
      s.addRange(range);
    }
    drawSelection(el);
  }
  function syncCounter(el) {
    var list = Array.prototype.slice.call(el.querySelectorAll('[data-count]'));
    if (el.hasAttribute('data-count')) list.unshift(el);
    list.forEach(function (c) {
      var n = null;
      for (var k = c.firstChild; k; k = k.nextSibling) {
        if (k.nodeType === 3 && k.nodeValue.trim() !== '') {
          n = k;
          break;
        }
      }
      var raw = n ? n.nodeValue.replace(/\s/g, '') : '';
      var v = null;
      var d = 0;
      var m;
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
  function endEdit(commitChanges) {
    if (!editing) return;
    var el = editing;
    editing = null;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-mm-editing');
    el.removeAttribute('spellcheck');
    if (!commitChanges) {
      el.innerHTML = editingOriginal;
      drawSelection(selected);
      return;
    }
    var changed = el.innerHTML !== editingOriginal;
    if (changed) {
      syncCounter(el);
      if (el.classList.contains('ed-text') && !el.textContent.trim()) {
        if (selected === el) selected = null;
        var s = slideOf(el);
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
  function isSlideChild(el) {
    return el && el.parentElement && el.parentElement !== deck;
  }
  function delEl() {
    if (!selected || !isSlideChild(selected)) return;
    var el = selected;
    var s = slideOf(el);
    select(null);
    el.remove();
    if (s) post({ type: 'slide-html', index: slideList().indexOf(s), html: serialize(s), key: '' });
  }
  function dupEl() {
    if (!selected || !isSlideChild(selected)) return;
    var c = selected.cloneNode(true);
    c.removeAttribute('id');
    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (x) {
      x.removeAttribute('id');
    });
    var t = getTrans(selected);
    setTrans(c, t.x + 30, t.y + 30);
    selected.after(c);
    select(c);
    commit('');
  }
  function ensurePos(el) {
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
  }
  function zFront() {
    if (!selected) return;
    var s = slideOf(selected);
    var m = 3;
    Array.prototype.forEach.call(s.querySelectorAll('*'), function (x) {
      var z = parseInt(x.style && x.style.zIndex, 10);
      if (!isNaN(z) && z > m) m = z;
    });
    ensurePos(selected);
    selected.style.zIndex = String(m + 1);
    commit('');
  }
  function zBack() {
    if (!selected) return;
    ensurePos(selected);
    selected.style.zIndex = '-1';
    commit('');
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
    var p = selected.parentElement;
    if (p && p !== deck && !p.classList.contains('slide')) select(p);
  }
  function nudge(dx, dy) {
    if (!selected || isLocked(selected) || mode === 'arrange') return;
    var t = getTrans(selected);
    setTrans(selected, t.x + dx, t.y + dy);
    drawSelection(selected);
    commit('nudge:' + (pathOf(selected) || []).join('.'));
  }

  /* ---------- copiar / colar elemento ---------- */
  var lastPt = null;
  document.addEventListener(
    'pointermove',
    function (e) {
      lastPt = { x: e.clientX, y: e.clientY };
    },
    true
  );
  function getClip() {
    try {
      return window.parent.__mmClip || null;
    } catch (err) {
      return null;
    }
  }
  function copyEl() {
    var s = slideOf(selected);
    if (!s) return;
    var c = selected.cloneNode(true);
    c.removeAttribute('contenteditable');
    c.removeAttribute('data-mm-editing');
    var sr = rectOf(s);
    var r = rectOf(selected);
    var ss = layoutOf(s, slideIndexOf(s)).s;
    try {
      window.parent.__mmClip = {
        kind: 'element',
        html: c.outerHTML,
        slide: slideIndexOf(s),
        left: (r.left - sr.left) / ss,
        top: (r.top - sr.top) / ss,
      };
    } catch (err) {
      /* sem acesso ao pai */
    }
  }
  /* Mesmo slide: o item aparece sob o mouse. Outro slide: na posição exata de onde foi copiado. */
  function pasteEl(clip) {
    var s = activeSlide();
    if (!s) return;
    if (editing) endEdit(true);
    var tpl = document.createElement('template');
    tpl.innerHTML = clip.html;
    var el = tpl.content.firstElementChild;
    if (!el) return;
    s.appendChild(el);
    setTrans(el, 0, 0);
    var sr = rectOf(s);
    var ss = layoutOf(s, slideIndexOf(s)).s;
    var r0 = rectOf(el);
    var wantLeft = clip.left;
    var wantTop = clip.top;
    if (clip.slide === slideIndexOf(s) && lastPt) {
      var dr = deck.getBoundingClientRect();
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
      if (editing && editing.contains(e.target)) return;
      e.preventDefault();
    },
    true
  );
  /* botão do meio: movimenta a visualização; scroll: zoom (o editor aplica) */
  var panning = null;
  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.button !== 1) return;
      e.preventDefault();
      panning = { x: e.screenX, y: e.screenY, id: e.pointerId };
      try {
        document.documentElement.setPointerCapture(e.pointerId);
      } catch (err) {
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
    } catch (err) {
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
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (editing && editing.contains(t)) return;
      try {
        window.focus();
      } catch (err) {
        /* ignore */
      }
      var h = t.closest ? t.closest('.mm-h') : null;
      if (h && selected) {
        var r = rectOf(selected);
        drag = {
          mode: 'rs',
          h: h.getAttribute('data-h'),
          el: selected,
          sx: e.clientX,
          sy: e.clientY,
          w0: r.width / esOf(selected),
          h0: r.height / esOf(selected),
          on: false,
          id: e.pointerId,
        };
        capture(e);
        return;
      }
      if (!deck.contains(t)) return;
      if (editing) endEdit(true);
      var clicked = slideOf(t);
      if (clicked && clicked !== activeSlide()) {
        /* clicar noutro slide só o torna o atual (a câmera não se move) */
        select(null);
        post({ type: 'slide-click', index: slideIndexOf(clicked) });
        return;
      }
      var el = pick(t);
      select(el);
      if (!el || isLocked(el)) return;
      drag = {
        mode: 'move',
        el: el,
        sx: e.clientX,
        sy: e.clientY,
        base: getTrans(el),
        on: false,
        id: e.pointerId,
      };
      capture(e);
    },
    true
  );
  function capture(e) {
    try {
      document.documentElement.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
  }
  document.addEventListener(
    'pointermove',
    function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx;
      var dy = e.clientY - drag.sy;
      if (!drag.on) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.on = true;
        document.body.classList.add('mm-dragging');
        if (drag.mode === 'move') document.body.classList.add('mm-lift');
      }
      var es = scale * esOf(drag.el);
      var ax = dx / es;
      var ay = dy / es;
      if (drag.mode === 'move') {
        if (e.shiftKey) {
          if (Math.abs(ax) > Math.abs(ay)) ay = 0;
          else ax = 0;
        }
        setTrans(drag.el, drag.base.x + ax, drag.base.y + ay);
      } else {
        var el = drag.el;
        var w = drag.w0 + ax;
        var h = drag.h0 + ay;
        var keep = isMedia(el) && !e.shiftKey && drag.h === 'se';
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
  /* ---------- arranjo dos slides (aba Slide) ---------- */
  var arr = null;
  function setLayout(slide, l) {
    slide.setAttribute('data-x', String(Math.round(l.x)));
    slide.setAttribute('data-y', String(Math.round(l.y)));
    if (Math.abs(l.s - 1) < 0.0005) slide.removeAttribute('data-s');
    else slide.setAttribute('data-s', l.s.toFixed(3));
    buildCanvasCss();
  }
  function arrangeDown(e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var handle = t.closest ? t.closest('.mm-h') : null;
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
    var sl = slideOf(t);
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
  function arrangeMove(e) {
    if (!arr) return;
    if (!arr.on) {
      if (Math.hypot(e.clientX - arr.sx, e.clientY - arr.sy) < 4) return;
      arr.on = true;
      document.body.classList.add('mm-dragging');
    }
    var dx = (e.clientX - arr.sx) / scale;
    var dy = (e.clientY - arr.sy) / scale;
    if (arr.mode === 'move') {
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      setLayout(arr.el, { x: arr.l.x + dx, y: arr.l.y + dy, s: arr.l.s });
    } else {
      var ns = Math.max(0.05, Math.min(4, arr.l.s + Math.max(dx / SLIDE_W, dy / SLIDE_H)));
      setLayout(arr.el, { x: arr.l.x, y: arr.l.y, s: ns });
    }
    drawSelection(arr.el);
  }
  function arrangeEnd() {
    if (!arr) return false;
    var a = arr;
    arr = null;
    document.body.classList.remove('mm-dragging');
    try {
      document.documentElement.releasePointerCapture(a.id);
    } catch (err) {
      /* ignore */
    }
    if (a.on) commit('', a.el);
    return true;
  }
  document.addEventListener('pointermove', arrangeMove, true);

  /* Slide mais "por cima" sob o ponteiro (menor escala = mais por cima; empate: o último). */
  function slideAtPoint(e) {
    var dr = deck.getBoundingClientRect();
    var px = (e.clientX - dr.left) / scale;
    var py = (e.clientY - dr.top) / scale;
    var best = null;
    var bestScale = Infinity;
    slideList().forEach(function (sl, i) {
      var l = layoutOf(sl, i);
      if (px < l.x || py < l.y || px > l.x + SLIDE_W * l.s || py > l.y + SLIDE_H * l.s) return;
      if (l.s <= bestScale) {
        best = sl;
        bestScale = l.s;
      }
    });
    return best;
  }
  /* Soltar o elemento sobre outro slide passa o elemento para ele, na mesma posição visual. */
  function dropIntoOtherSlide(el, e) {
    var from = slideOf(el);
    var target = slideAtPoint(e);
    if (!from || !target || target === from) return false;
    var before = rectOf(el);
    target.appendChild(el);
    setTrans(el, 0, 0);
    var now = rectOf(el);
    var ts = layoutOf(target, slideIndexOf(target)).s;
    setTrans(el, (before.left - now.left) / ts, (before.top - now.top) / ts);
    el.style.zIndex = '';
    post({ type: 'slide-html', index: slideIndexOf(from), html: serialize(from), key: '' });
    post({ type: 'slide-html', index: slideIndexOf(target), html: serialize(target), key: '' });
    post({ type: 'element-moved', index: slideIndexOf(target), path: pathOf(el) });
    return true;
  }

  function endDrag(e) {
    if (arrangeEnd()) return;
    if (!drag) return;
    var d = drag;
    drag = null;
    document.body.classList.remove('mm-dragging');
    try {
      document.documentElement.releasePointerCapture(d.id);
    } catch (err) {
      /* ignore */
    }
    document.body.classList.remove('mm-lift');
    if (d.on && d.mode === 'move' && e && e.type === 'pointerup' && dropIntoOtherSlide(d.el, e)) {
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
      if (editing && editing.contains(e.target)) return;
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
      var t = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      if (!t || !(t instanceof Element) || !deck.contains(t)) return;
      var dslide = slideOf(t);
      if (mode === 'arrange' || (dslide && dslide !== activeSlide())) {
        e.preventDefault();
        e.stopPropagation();
        if (dslide) post({ type: 'slide-open', index: slideIndexOf(dslide) });
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      var el = pick(t);
      if (!el) return;
      select(el);
      if (el.hasAttribute('data-pkg')) {
        post({ type: 'key', key: 'open-package' });
        return;
      }
      beginEdit(el, false);
      if (document.caretRangeFromPoint) {
        var r = document.caretRangeFromPoint(e.clientX, e.clientY);
        var s = window.getSelection();
        if (r && s && el.contains(r.startContainer)) {
          s.removeAllRanges();
          s.addRange(r);
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
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
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
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
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
      var k = e.key;
      var c = e.ctrlKey || e.metaKey;
      var low = k.length === 1 ? k.toLowerCase() : k;
      if (c && low === 's') {
        e.preventDefault();
        post({ type: 'key', key: 'save' });
        return;
      }
      if (editing) {
        if (k === 'Escape') {
          e.preventDefault();
          endEdit(false);
        } else if (k === 'Enter' && !e.shiftKey) {
          var t = editing.tagName.toLowerCase();
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
      if (c && low === 'c') {
        e.preventDefault();
        if (selected && mode !== 'arrange') copyEl();
        else post({ type: 'key', key: 'copy-slide' });
        return;
      }
      if (c && low === 'v') {
        e.preventDefault();
        var clip = getClip();
        if (clip && clip.kind === 'element') pasteEl(clip);
        else post({ type: 'key', key: 'paste-slide' });
        return;
      }
      if (k === 'Escape') {
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
          var st = e.shiftKey ? 10 : 1;
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
    var s = activeSlide();
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
    } catch (err) {
      /* pacote com erro não derruba o editor */
    }
    var long = s.querySelector('[data-sim]') ? 22000 : s.querySelector('[data-pkg]') ? 9000 : 5000;
    previewTimer = setTimeout(stopPreview, long);
  }
  function stopPreview() {
    clearTimeout(previewTimer);
    if (!previewing) return;
    try {
      window.dispatchEvent(new Event('beforeprint'));
    } catch (err) {
      /* ignore */
    }
    previewing = false;
    document.body.classList.remove('mm-preview');
    var s = activeSlide();
    if (s) s.classList.add('mm-static');
    drawSelection(selected);
    post({ type: 'key', key: 'preview-ended' });
  }

  /* ---------- mensagens do editor ---------- */
  function setActive(index) {
    var list = slideList();
    list.forEach(function (s, i) {
      s.classList.toggle('active', i === index);
      s.classList.toggle('mm-static', i === index && !previewing);
    });
    return list[index];
  }

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.__mm !== 'editor') return;
    var list;
    if (data.type === 'goto') {
      if (editing) endEdit(true);
      if (previewing) stopPreview();
      var active = setActive(data.index);
      select(mode === 'arrange' ? active : null, true);
      if (active) {
        window.scrollTo(0, 0);
        post({ type: 'slide', index: data.index });
      }
    } else if (data.type === 'select') {
      /* não silencioso: o inspetor, a linha do tempo e o dock precisam saber da seleção */
      select(elAt(data.path));
      if (selected && data.edit) beginEdit(selected, true);
    } else if (data.type === 'set-slide') {
      list = slideList();
      var old = list[data.index];
      if (!old) return;
      var tpl = document.createElement('template');
      tpl.innerHTML = String(data.html || '').trim();
      var next = tpl.content.firstElementChild;
      if (!next) return;
      var wasActive = old.classList.contains('active');
      var keep = selected && old.contains(selected) ? pathOf(selected) : null;
      var wasEditing = editing && old.contains(editing);
      if (wasEditing) editing = null;
      old.replaceWith(next);
      buildCanvasCss();
      if (wasActive) {
        next.classList.add('active');
        if (!previewing) next.classList.add('mm-static');
      }
      if (selected && (selected === old || keep)) {
        var again = keep ? elAt(keep) : null;
        if (again) {
          selected = again;
          drawSelection(again);
        } else {
          select(null);
        }
      }
    } else if (data.type === 'patch-element') {
      var target = elAt(data.path);
      if (!target) return;
      var attrs = data.attrs || {};
      Object.keys(attrs).forEach(function (name) {
        if (attrs[name] === null) target.removeAttribute(name);
        else target.setAttribute(name, String(attrs[name]));
      });
      var classes = data.classes || {};
      (classes.remove || []).forEach(function (name) {
        target.classList.remove(name);
      });
      (classes.add || []).forEach(function (name) {
        target.classList.add(name);
      });
      var styles = data.style || {};
      Object.keys(styles).forEach(function (name) {
        if (styles[name] === null) target.style.removeProperty(name);
        else target.style.setProperty(name, String(styles[name]));
      });
      select(target);
    } else if (data.type === 'preview-anim') {
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
    } else if (data.type === 'view') {
      scale = data.zoom || 1;
      deck.style.transition = data.animate ? 'transform .55s cubic-bezier(.4,0,.2,1)' : 'none';
      deck.style.transform =
        'translate(' + (data.x || 0) + 'px,' + (data.y || 0) + 'px) scale(' + scale + ')';
      updateGrid();
      scaleLabels();
      drawSelection(selected);
      /* durante a animação da câmera o retângulo medido ainda não é o final */
      clearTimeout(viewTimer);
      if (data.animate)
        viewTimer = setTimeout(function () {
          drawSelection(selected);
        }, 620);
    } else if (data.type === 'highlight') {
      var hl = data.indices || [];
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

  function runCommand(name, arg) {
    if (name === 'delete') delEl();
    else if (name === 'duplicate') dupEl();
    else if (name === 'front') zFront();
    else if (name === 'back') zBack();
    else if (name === 'reset') resetPos();
    else if (name === 'copy') {
      if (selected) copyEl();
    } else if (name === 'paste') {
      var cp = getClip();
      if (cp && cp.kind === 'element') pasteEl(cp);
    } else if (name === 'parent') selectParent();
    else if (name === 'edit') {
      if (selected) beginEdit(selected, false);
    } else if (name === 'nudge' && arg) nudge(Number(arg.dx) || 0, Number(arg.dy) || 0);
    else if (name === 'format') {
      if (!editing) return;
      document.execCommand('styleWithCSS', false, true);
      if (arg && arg.color) document.execCommand('foreColor', false, arg.color);
      else if (arg && arg.command) document.execCommand(arg.command);
    }
  }

  /* estado inicial: sem animações ao editar */
  var first = activeSlide();
  if (first) first.classList.add('mm-static');

  post({ type: 'ready', count: slideList().length });
})();
