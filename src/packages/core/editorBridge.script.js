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
    var custom = el.getAttribute && el.getAttribute('data-name');
    if (custom && custom.trim()) return custom.trim();
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
    var t = el.tagName.toLowerCase();
    return names[t] || t;
  }
  function isMedia(el) {
    return /^(img|svg|video)$/i.test(el.tagName);
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
    /* o elemento em "pose" de keyframe volta aos estilos naturais no HTML guardado */
    if (poseState && poseState.el.isConnected && slide.contains(poseState.el)) {
      var rel = [];
      for (var pn = poseState.el; pn !== slide; pn = pn.parentNode) {
        rel.unshift(kidsOf(pn.parentNode).indexOf(pn));
      }
      var tgt = c;
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
  function commit(key, from) {
    var s = slideOf(from || selected) || activeSlide();
    if (!s) return;
    var idx = slideList().indexOf(s);
    if (idx < 0) return;
    post({ type: 'slide-html', index: idx, html: serialize(s), key: key || '' });
    scheduleGhosts();
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
    el.focus({ preventScroll: true });
    resetScroll();
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
  /* ---------- pose de keyframe: mostra (e deixa editar) o elemento num keyframe ---------- */
  var poseState = null; /* { el, base, pose } */
  function numOf(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  /* formatação do texto que um keyframe pode mudar (estilo inline original guardado) */
  var POSE_TEXT = [
    ['c', 'color'],
    ['fs', 'font-size'],
    ['w', 'font-weight'],
    ['ls', 'letter-spacing'],
    ['g', 'text-shadow'],
    ['bl', 'filter'],
  ];
  function baseOf(el) {
    var t = (el.style.translate || '').split(' ').filter(Boolean);
    var text = {};
    POSE_TEXT.forEach(function (p) {
      text[p[1]] = el.style.getPropertyValue(p[1]);
    });
    var ccs = window.getComputedStyle(el);
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
  function restoreBase(el, b) {
    ['translate', 'scale', 'rotate', 'opacity'].forEach(function (p) {
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
  function setPose(path, pose) {
    if (poseState && !poseState.el.isConnected) poseState = null;
    var target = pose && path ? elAt(path) : null;
    if (poseState && poseState.el !== target) unpose();
    if (!target) {
      drawSelection(selected);
      return;
    }
    if (!poseState) {
      poseState = { el: target, base: baseOf(target), pose: pose };
      sel.classList.add('mm-pose');
      document.body.classList.add('mm-posing');
    }
    poseState.pose = pose;
    var b = poseState.base;
    target.style.translate = b.x + pose.x + 'px ' + (b.y + pose.y) + 'px';
    target.style.scale = String(b.s * pose.s);
    target.style.rotate = b.r + pose.r + 'deg';
    target.style.opacity = String(b.o * pose.o);
    POSE_TEXT.forEach(function (p) {
      var v = pose[p[0]];
      var css = null;
      if (v !== undefined && v !== null) {
        if (p[0] === 'fs') css = v + 'px';
        else if (p[0] === 'ls') css = v + 'em';
        else if (p[0] === 'w') css = String(v);
        else if (p[0] === 'g') {
          var gc = pose.gc || '#F7D98B';
          css = '0 0 ' + v * 0.35 + 'px ' + gc + ', 0 0 ' + v + 'px ' + gc + b.keepTs;
        } else if (p[0] === 'bl') css = 'blur(' + v + 'px)' + b.keepFl;
        else css = String(v);
      }
      /* sem valor no keyframe: o natural (o inline original, se havia) */
      if (css === null) css = b.text[p[1]] || '';
      if (css) target.style.setProperty(p[1], css);
      else target.style.removeProperty(p[1]);
    });
    if (selected === target) drawSelection(target);
  }
  /* depois de arrastar/empurrar o elemento posado: avisa o editor da nova posição do keyframe */
  function poseMoved() {
    var t = getTrans(poseState.el);
    var p = poseState.pose;
    var np = {
      x: Math.round(t.x - poseState.base.x),
      y: Math.round(t.y - poseState.base.y),
      s: p.s,
      r: p.r,
      o: p.o,
    };
    poseState.pose = np;
    post({ type: 'pose-edit', pose: np });
  }

  function nudge(dx, dy) {
    if (!selected || isLocked(selected) || mode === 'arrange') return;
    var t = getTrans(selected);
    setTrans(selected, t.x + dx, t.y + dy);
    drawSelection(selected);
    if (poseState && selected === poseState.el) {
      poseMoved();
      return;
    }
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
      if (pickingParent) {
        e.preventDefault();
        var cand = deck.contains(t) ? pick(t) : null;
        finishPickParent(cand);
        return;
      }
      var gh = t.closest ? t.closest('.mm-ghost-off') : null;
      if (gh && gh.__el) {
        if (editing) endEdit(true);
        select(gh.__el);
        if (isLocked(gh.__el)) return;
        startMove(gh.__el, e);
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
      startMove(el, e);
    },
    true
  );
  function startMove(el, e) {
    drag = {
      mode: 'move',
      el: el,
      sx: e.clientX,
      sy: e.clientY,
      base: getTrans(el),
      on: false,
      id: e.pointerId,
      alt: e.altKey,
    };
    capture(e);
  }
  /* dados para o alinhamento, calculados uma vez no começo do arrasto */
  function prepareSnap(d) {
    var s = slideOf(d.el);
    if (!s) return;
    d.slide = s;
    d.ls = layoutOf(s, slideIndexOf(s)).s;
    d.r0 = localRect(d.el, s, d.ls);
    d.snap = snapTargets(d.el, s, d.ls);
  }
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
        ghosts.innerHTML = '';
        if (drag.mode === 'move') {
          document.body.classList.add('mm-lift');
          /* Alt + arrastar: deixa uma cópia no lugar e leva o original */
          if (drag.alt && isSlideChild(drag.el)) {
            var copy = drag.el.cloneNode(true);
            copy.removeAttribute('id');
            drag.el.before(copy);
          }
        }
        prepareSnap(drag);
      }
      var es = scale * esOf(drag.el);
      var ax = dx / es;
      var ay = dy / es;
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
          var sn = snapMove(drag, ax, ay, e);
          ax = sn.ax;
          ay = sn.ay;
        }
        setTrans(drag.el, drag.base.x + ax, drag.base.y + ay);
      } else {
        var el = drag.el;
        var w = drag.w0 + ax;
        var h = drag.h0 + ay;
        var keep = isMedia(el) && !e.shiftKey && drag.h === 'se';
        if (drag.r0 && !keep) {
          var sr2 = snapResize(drag, w, h, e);
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
    clearGuides();
    scheduleGhosts();
    if (d.on && d.mode === 'move' && e && e.type === 'pointerup' && dropIntoOtherSlide(d.el, e)) {
      return;
    }
    if (d.on && poseState && d.el === poseState.el) {
      poseMoved();
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
      /* já editando: o duplo clique é do navegador (seleciona a palavra) */
      if (editing && editing.contains(t)) return;
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
          /* começa já com a palavra sob o cursor selecionada */
          try {
            s.modify('move', 'backward', 'word');
            s.modify('extend', 'forward', 'word');
            var picked = s.toString();
            if (/\s$/.test(picked)) s.modify('extend', 'backward', 'character');
          } catch (err) {
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
          /* Esc sai da edição guardando o que foi feito (como no Figma); desfazer é Ctrl+Z */
          endEdit(true);
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
      if (c && (e.code === 'BracketRight' || e.code === 'BracketLeft') && selected) {
        e.preventDefault();
        var up = e.code === 'BracketRight';
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
        var clip = getClip();
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
    try {
      window.dispatchEvent(new Event('mm-kf-reset'));
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
      stopPickParent();
      scheduleGhosts();
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
      Array.prototype.forEach.call(next.querySelectorAll('video'), function (v) {
        if (!previewing) v.pause();
      });
      scheduleGhosts();
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
      var pa = activeSlide();
      post({ type: 'palette', colors: pa ? paletteOf(pa) : [] });
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

  /* ---------- paleta de cores do slide ---------- */
  function toLab(r, g, b) {
    function lin(c) {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    var R = lin(r),
      G = lin(g),
      B = lin(b);
    var x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    var y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    var z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    function f(t) {
      return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    }
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function hex2(n) {
    var s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return s.length < 2 ? '0' + s : s;
  }
  /* Colhe cores (fundos, degradês, textos, bordas, SVG) com peso por tamanho e as agrupa
     por semelhança perceptual. A quantidade (4 a 9) segue a variedade real do slide. */
  function paletteOf(slide) {
    var items = [];
    function add(str, w) {
      var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(
        str || ''
      );
      if (!m) return;
      var a =
        m[4] === undefined ? 1 : m[4].indexOf('%') > 0 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (!(a > 0.04) || !(w > 0)) return;
      var r = +m[1],
        g = +m[2],
        b = +m[3];
      items.push({ r: r, g: g, b: b, lab: toLab(r, g, b), w: w * a });
    }
    function addAll(str, w) {
      var found = String(str || '').match(/rgba?\([^)]+\)/g) || [];
      found.forEach(function (c) {
        add(c, w / found.length);
      });
    }
    var nodes = [slide].concat(Array.prototype.slice.call(slide.querySelectorAll('*'), 0, 900));
    nodes.forEach(function (el) {
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05)
        return;
      var r = el.getBoundingClientRect();
      var area = Math.min((r.width / scale) * (r.height / scale), SLIDE_W * SLIDE_H);
      if (!(area > 40)) return;
      var side = Math.sqrt(area);
      add(cs.backgroundColor, side);
      if (
        cs.backgroundImage &&
        cs.backgroundImage !== 'none' &&
        cs.backgroundImage.indexOf('gradient') >= 0
      ) {
        addAll(cs.backgroundImage, side * 0.8);
      }
      var bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0 && cs.borderTopStyle !== 'none')
        add(cs.borderTopColor, Math.sqrt(bw * side * 4) * 3);
      var text = 0;
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) text += n.nodeValue.replace(/\s+/g, '').length;
      }
      if (text > 0) {
        var fs = parseFloat(cs.fontSize) || 16;
        add(cs.color, Math.sqrt(text * fs * fs * 0.6));
      }
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) {
        if (cs.fill && cs.fill !== 'none') add(cs.fill, side);
        if (cs.stroke && cs.stroke !== 'none') add(cs.stroke, side * 0.5);
      }
    });
    if (!items.length) return [];
    var total = items.reduce(function (s, i) {
      return s + i.w;
    }, 0);
    function cluster(thr) {
      var list = items.slice().sort(function (a, b) {
        return b.w - a.w;
      });
      var cl = [];
      list.forEach(function (it) {
        var hit = null;
        for (var i = 0; i < cl.length; i++) {
          var c = cl[i];
          var d = Math.hypot(c.lab[0] - it.lab[0], c.lab[1] - it.lab[1], c.lab[2] - it.lab[2]);
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
    var picked = [];
    var plan = [
      [16, 0.012],
      [10, 0.008],
      [6, 0.004],
    ];
    for (var p = 0; p < plan.length; p++) {
      picked = cluster(plan[p][0]).filter(function (c) {
        return c.w / total >= plan[p][1];
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
  var ghosts = document.createElement('div');
  ghosts.id = 'mm-ghosts';
  deck.appendChild(ghosts);
  var ghostQueued = false;
  function scheduleGhosts() {
    if (ghostQueued) return;
    ghostQueued = true;
    requestAnimationFrame(function () {
      ghostQueued = false;
      drawGhosts();
    });
  }
  function isOverlay(el) {
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
    var s = activeSlide();
    if (!s) return;
    var sr = rectOf(s);
    var pad = 0.5;
    function visit(node, depth) {
      kidsOf(node).forEach(function (el) {
        if (isOverlay(el)) return;
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        var r = rectOf(el);
        if (r.width < 1 || r.height < 1) return;
        var inside =
          r.left >= sr.left - pad &&
          r.top >= sr.top - pad &&
          r.left + r.width <= sr.left + sr.width + pad &&
          r.top + r.height <= sr.top + sr.height + pad;
        if (inside) {
          if (depth < 3) visit(el, depth + 1);
          return;
        }
        var outside =
          r.left >= sr.left + sr.width ||
          r.top >= sr.top + sr.height ||
          r.left + r.width <= sr.left ||
          r.top + r.height <= sr.top;
        var g = document.createElement('div');
        g.className = 'mm-ghost' + (outside ? ' mm-ghost-off' : '');
        g.title = outside
          ? 'Fora do slide (não aparece na apresentação) — clique para selecionar'
          : 'Parte fora do slide (cortada na apresentação)';
        g.style.left = r.left + 'px';
        g.style.top = r.top + 'px';
        g.style.width = r.width + 'px';
        g.style.height = r.height + 'px';
        g.style.borderWidth = Math.max(1, 1.5 / scale).toFixed(2) + 'px';
        g.__el = el;
        ghosts.appendChild(g);
      });
    }
    visit(s, 0);
  }

  /* ======================================================================
     Alinhamento inteligente: guias para as bordas/centro do slide e dos outros
     elementos. Ctrl desliga; Shift trava o eixo; Alt + arrastar duplica.
     ====================================================================== */
  var guides = document.createElement('div');
  guides.id = 'mm-guides';
  deck.appendChild(guides);
  function clearGuides() {
    guides.innerHTML = '';
  }
  function localRect(el, slide, ls) {
    var sr = rectOf(slide);
    var r = rectOf(el);
    return {
      left: (r.left - sr.left) / ls,
      top: (r.top - sr.top) / ls,
      width: r.width / ls,
      height: r.height / ls,
    };
  }
  /* Alvos de alinhamento (em px do slide): bordas e centro do slide e dos outros elementos. */
  function snapTargets(el, slide, ls) {
    var xs = [0, SLIDE_W / 2, SLIDE_W];
    var ys = [0, SLIDE_H / 2, SLIDE_H];
    Array.prototype.forEach.call(slide.querySelectorAll('*'), function (o) {
      if (o === el || el.contains(o) || o.contains(el) || isOverlay(o)) return;
      if (o.closest('.mm-bgl')) return;
      var cs = window.getComputedStyle(o);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') return;
      var r = localRect(o, slide, ls);
      if (r.width < 4 || r.height < 4) return;
      if (r.width > SLIDE_W * 0.98 && r.height > SLIDE_H * 0.9) return;
      xs.push(r.left, r.left + r.width / 2, r.left + r.width);
      ys.push(r.top, r.top + r.height / 2, r.top + r.height);
    });
    return { xs: xs, ys: ys };
  }
  /* Menor ajuste para encostar alguma das posições `edges` num alvo (ou null). */
  function bestSnap(edges, targets, thr) {
    var best = null;
    edges.forEach(function (e) {
      targets.forEach(function (t) {
        var d = t - e;
        if (Math.abs(d) <= thr && (best === null || Math.abs(d) < Math.abs(best.d))) {
          best = { d: d, at: t };
        }
      });
    });
    return best;
  }
  function drawGuide(slide, ls, axis, at) {
    var sr = rectOf(slide);
    var g = document.createElement('div');
    g.className = 'mm-guide';
    var w = Math.max(1, 1 / scale);
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
  function snapMove(d, ax, ay, e) {
    clearGuides();
    if (e.ctrlKey || e.metaKey || !d.snap) return { ax: ax, ay: ay };
    var thr = 7 / (scale * d.ls);
    var L = d.r0.left + ax;
    var T = d.r0.top + ay;
    var W = d.r0.width;
    var H = d.r0.height;
    var sx = ax !== 0 || !e.shiftKey ? bestSnap([L, L + W / 2, L + W], d.snap.xs, thr) : null;
    var sy = ay !== 0 || !e.shiftKey ? bestSnap([T, T + H / 2, T + H], d.snap.ys, thr) : null;
    if (sx && !(e.shiftKey && d.lock === 'y')) {
      ax += sx.d;
      drawGuide(d.slide, d.ls, 'x', sx.at);
    }
    if (sy && !(e.shiftKey && d.lock === 'x')) {
      ay += sy.d;
      drawGuide(d.slide, d.ls, 'y', sy.at);
    }
    return { ax: ax, ay: ay };
  }
  /* Alinhamento no redimensionar: a borda direita/inferior encosta nos alvos. */
  function snapResize(d, w, h, e) {
    clearGuides();
    if (e.ctrlKey || e.metaKey || !d.snap) return { w: w, h: h };
    var thr = 7 / (scale * d.ls);
    if (d.h !== 's') {
      var sx = bestSnap([d.r0.left + w], d.snap.xs, thr);
      if (sx) {
        w += sx.d;
        drawGuide(d.slide, d.ls, 'x', sx.at);
      }
    }
    if (d.h !== 'e') {
      var sy = bestSnap([d.r0.top + h], d.snap.ys, thr);
      if (sy) {
        h += sy.d;
        drawGuide(d.slide, d.ls, 'y', sy.at);
      }
    }
    return { w: w, h: h };
  }

  /* Alinha o elemento ao slide (h: left|center|right; v: top|middle|bottom). */
  function alignToSlide(h, v) {
    if (!selected || !isSlideChild(selected) || isLocked(selected)) return;
    var s = slideOf(selected);
    if (!s) return;
    var ls = layoutOf(s, slideIndexOf(s)).s;
    var r = localRect(selected, s, ls);
    var t = getTrans(selected);
    var dx = 0;
    var dy = 0;
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
  function zOf(el) {
    var z = parseInt(window.getComputedStyle(el).zIndex, 10);
    return isNaN(z) ? 0 : z;
  }
  function overlaps(a, b) {
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom;
  }
  function zOrder(dir) {
    if (!selected || !isSlideChild(selected)) return;
    var el = selected;
    var parent = el.parentElement;
    var sibs = kidsOf(parent).filter(function (x) {
      return !isOverlay(x) && x.nodeType === 1;
    });
    var order = sibs
      .map(function (x, i) {
        return { el: x, z: zOf(x), i: i };
      })
      .sort(function (a, b) {
        return a.z - b.z || a.i - b.i;
      })
      .map(function (o) {
        return o.el;
      });
    var at = order.indexOf(el);
    if (at < 0) return;
    order.splice(at, 1);
    var to = at;
    if (dir === 'top') to = order.length;
    else if (dir === 'bottom') to = 0;
    else if (dir === 'forward') {
      to = order.length;
      for (var i = at; i < order.length; i++) {
        if (overlaps(order[i], el)) {
          to = i + 1;
          break;
        }
      }
    } else if (dir === 'backward') {
      to = 0;
      for (var j = at - 1; j >= 0; j--) {
        if (overlaps(order[j], el)) {
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
  var pickingParent = null;
  function canBeParent(p, child) {
    if (!p || p === child || child.contains(p)) return false;
    if (/^(img|video|svg|input|br|hr|iframe|textarea)$/i.test(p.tagName)) return false;
    if (p.closest && p.closest('svg') && p.tagName.toLowerCase() !== 'svg') return false;
    return slideOf(p) === slideOf(child);
  }
  /* Coloca `child` dentro de `parent` (ou da raiz do slide) sem mudar onde ele aparece. */
  function moveInto(child, parent) {
    var s = slideOf(child);
    var es = layoutOf(s, slideIndexOf(s)).s;
    var before = rectOf(child);
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
    var now = rectOf(child);
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
  function finishPickParent(target) {
    var child = pickingParent;
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
    var s = slideOf(selected);
    if (!s || selected.parentElement === s) return;
    moveInto(selected, s);
    select(selected);
    commit('', selected);
  }

  /* ======================================================================
     Formatação de trecho do texto em edição. A barra fica no app (fora do iframe);
     aqui ficam o trecho guardado, os comandos e o aviso de onde ele está na tela.
     ====================================================================== */
  var savedRange = null;

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
      var t = e.target;
      if (t === document || t === deck || (t && t.classList && t.classList.contains('slide')))
        resetScroll();
      else if (t && t.nodeType === 1 && deck.contains(t) && (t.scrollLeft || t.scrollTop)) {
        t.scrollLeft = 0;
        t.scrollTop = 0;
      }
    },
    true
  );

  function selectionInEditing() {
    var s = window.getSelection();
    if (!editing || !s || s.rangeCount === 0 || s.isCollapsed) return null;
    var r = s.getRangeAt(0);
    return editing.contains(r.commonAncestorContainer) ? r : null;
  }
  /* Sem `focus`: a barra fica no app e seus campos (cor, tamanho) não podem perder o foco. */
  function restoreRange(focus) {
    if (!savedRange || !editing) return false;
    if (focus && document.activeElement !== editing) editing.focus({ preventScroll: true });
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(savedRange);
    return true;
  }
  /* Primeiro pedaço de texto dentro do trecho (o início pode cair entre elementos). */
  function firstTextIn(range) {
    var root = range.commonAncestorContainer;
    if (root.nodeType === 3) return root;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !range.intersectsNode(n)) continue;
      if (n === range.startContainer && range.startOffset >= n.nodeValue.length) continue;
      return n;
    }
    return null;
  }
  function styleAt(range) {
    var t = firstTextIn(range);
    var el = t ? t.parentElement : range.startContainer;
    if (el && el.nodeType !== 1) el = el.parentElement;
    return window.getComputedStyle(el || editing);
  }
  function hexOf(c) {
    var m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(c || '');
    if (!m) return '';
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(function (n) {
          return ('0' + (+n).toString(16)).slice(-2);
        })
        .join('')
        .toUpperCase()
    );
  }
  var fmtTimer = null;
  function reportFormat() {
    var r = editing ? selectionInEditing() : null;
    if (r) savedRange = r.cloneRange();
    if (!r) {
      post({ type: 'text-format', open: false });
      return;
    }
    var b = r.getBoundingClientRect();
    var cs = styleAt(r);
    var q = function (c) {
      try {
        return document.queryCommandState(c);
      } catch (e) {
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
          editing.getAttribute('data-reflect') ||
          (editing.style.getPropertyValue('-webkit-box-reflect') ? '{}' : null),
      },
    });
  }
  /* Configuração de efeitos que vale no trecho: o data-fx mais próximo (até a caixa). */
  function fxOf(el) {
    while (el && el !== editing.parentElement) {
      if (el.nodeType === 1 && el.hasAttribute('data-fx')) return el.getAttribute('data-fx');
      if (el === editing) break;
      el = el.parentElement;
    }
    return null;
  }
  function styleOwner(range) {
    var t = firstTextIn(range);
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
  var followUntil = 0;
  function followFormat(ms) {
    var running = followUntil > Date.now();
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
  function styleRange(styles, addClass, removeClass, attrs, nestedStyles) {
    if (!restoreRange()) return;
    var r = savedRange;
    if (r.collapsed) return;
    var sc = r.startContainer;
    var so = r.startOffset;
    var ec = r.endContainer;
    var eo = r.endOffset;
    if (ec.nodeType === 3 && eo < ec.nodeValue.length && eo > 0) ec.splitText(eo);
    if (sc.nodeType === 3 && so > 0 && so < sc.nodeValue.length) {
      var rest = sc.splitText(so);
      if (ec === sc) {
        ec = rest;
        eo = eo - so;
      }
      sc = rest;
      so = 0;
    }
    var range = document.createRange();
    range.setStart(sc, so);
    if (ec.nodeType === 3) range.setEnd(ec, Math.min(eo, ec.nodeValue.length));
    else range.setEnd(ec, eo);
    var walker = document.createTreeWalker(editing, NodeFilter.SHOW_TEXT, null);
    var texts = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !range.intersectsNode(n)) continue;
      if (n === range.startContainer && range.startOffset >= n.nodeValue.length) continue;
      if (n === range.endContainer && range.endOffset === 0) continue;
      texts.push(n);
    }
    var targets = [];
    texts.forEach(function (t) {
      var parent = t.parentElement;
      var target;
      if (
        parent &&
        parent !== editing &&
        parent.tagName === 'SPAN' &&
        parent.childNodes.length === 1
      ) {
        target = parent;
      } else {
        target = document.createElement('span');
        t.parentNode.insertBefore(target, t);
        target.appendChild(t);
      }
      /* dentro de outro trecho (ou caixa) com efeito: valores neutros explícitos */
      var up = target.parentElement;
      var fxUp = nestedStyles && up ? up.closest('[data-fx]') : null;
      var nested = !!fxUp && editing.contains(fxUp);
      var use = nested ? nestedStyles : styles;
      Object.keys(use || {}).forEach(function (k) {
        var v = use[k];
        if (v === null || v === '') target.style.removeProperty(k);
        else target.style.setProperty(k, v);
      });
      Object.keys(attrs || {}).forEach(function (k) {
        if (attrs[k] === null || attrs[k] === undefined) target.removeAttribute(k);
        else target.setAttribute(k, attrs[k]);
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
    var first = targets[0];
    var last = targets[targets.length - 1];
    targets.forEach(function (t) {
      var next = t.nextSibling;
      if (
        next &&
        next.nodeType === 1 &&
        next.tagName === 'SPAN' &&
        targets.indexOf(next) >= 0 &&
        next.getAttribute('style') === t.getAttribute('style') &&
        next.getAttribute('class') === t.getAttribute('class') &&
        next.getAttribute('data-fx') === t.getAttribute('data-fx')
      ) {
        while (t.firstChild) next.insertBefore(t.firstChild, next.firstChild);
        if (first === t) first = next;
        t.remove();
      }
    });
    var sel = document.createRange();
    sel.setStartBefore(first.isConnected ? first : last);
    sel.setEndAfter(last);
    var ws = window.getSelection();
    ws.removeAllRanges();
    ws.addRange(sel);
    savedRange = sel.cloneRange();
    drawSelection(editing);
    resetScroll();
    reportFormat();
  }

  /* Remove spans vazios de estilo que sobraram (sem style, classe nem atributos). */
  function unwrapBare(root) {
    Array.prototype.slice.call(root.querySelectorAll('span')).forEach(function (sp) {
      if (sp.attributes.length === 0) {
        while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
        sp.remove();
      }
    });
  }

  function runFormat(arg) {
    if (!editing || !arg) return;
    var cmd = arg.cmd || arg.command || (arg.color ? 'color' : '');
    var v = arg.cmd ? arg.value : arg.color;
    if (cmd === 'reflect') {
      /* reflexo: vale para a caixa de texto toda */
      var rv = v || {};
      if (rv.css) editing.style.setProperty('-webkit-box-reflect', String(rv.css));
      else editing.style.removeProperty('-webkit-box-reflect');
      if (rv.data) editing.setAttribute('data-reflect', rv.data);
      else editing.removeAttribute('data-reflect');
      drawSelection(editing);
      restoreRange();
      reportFormat();
      return;
    }
    if (!restoreRange()) return;
    if (cmd === 'size' || cmd === 'size-step') {
      var cur = Math.round(parseFloat(styleAt(savedRange).fontSize) || 24);
      var px = cmd === 'size' ? Number(v) : cur + Number(v);
      if (!isFinite(px)) return;
      styleRange({ 'font-size': Math.max(4, Math.min(600, Math.round(px))) + 'px' });
    } else if (cmd === 'font') {
      styleRange({ 'font-family': v || null });
    } else if (cmd === 'fx') {
      /* efeitos (preenchimento, contorno, sombras…): CSS pronto + configuração no data-fx */
      var fv = v || {};
      styleRange(
        fv.css || {},
        fv.shine ? ['mm-shine'] : null,
        fv.shine ? null : ['mm-shine'],
        { 'data-fx': fv.data || null },
        fv.nested || null
      );
    } else if (cmd === 'style') {
      styleRange(v || {});
    } else {
      restoreRange(true);
      document.execCommand('styleWithCSS', false, false);
      if (cmd === 'removeFormat') {
        document.execCommand('removeFormat');
        var clear = { 'font-size': null, 'font-family': null };
        (arg.props || []).forEach(function (k) {
          clear[k] = null;
        });
        /* trechos inteiros dentro da seleção (inclusive os que têm outros trechos dentro) */
        var selNow = window.getSelection();
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
      var s2 = window.getSelection();
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
      if (!previewing && e.target && e.target.tagName === 'VIDEO') e.target.pause();
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
      if (editing && editing.contains(e.target)) return;
      e.preventDefault();
      if (previewing) return;
      var t = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      var kind = 'canvas';
      var index = null;
      if (t && t instanceof Element && deck.contains(t)) {
        var g = t.closest ? t.closest('.mm-ghost') : null;
        var sl = g && g.__el ? slideOf(g.__el) : slideOf(t);
        if (sl) {
          index = slideIndexOf(sl);
          kind = 'slide';
          if (mode === 'edit' && sl === activeSlide()) {
            var el = g && g.__el ? g.__el : pick(t);
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

  function runCommand(name, arg) {
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
      var cp = getClip();
      if (cp && cp.kind === 'element') pasteEl(cp);
    } else if (name === 'parent') selectParent();
    else if (name === 'edit') {
      if (selected) beginEdit(selected, false);
    } else if (name === 'nudge' && arg) nudge(Number(arg.dx) || 0, Number(arg.dy) || 0);
  }

  /* estado inicial: sem animações ao editar */
  var first = activeSlide();
  if (first) first.classList.add('mm-static');

  post({ type: 'ready', count: slideList().length });
})();
