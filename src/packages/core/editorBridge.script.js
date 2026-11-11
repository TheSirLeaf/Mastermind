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
    'position:absolute;z-index:9000;pointer-events:none;box-sizing:border-box;display:none;' +
    'border:2px solid ' + GOLD + ';box-shadow:0 0 0 1px rgba(16,6,11,.55),0 0 24px rgba(247,217,139,.3)';
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

  var style = document.createElement('style');
  style.textContent = [
    'html,body{overflow:hidden}',
    '#stage{display:block}',
    '#deck{left:0;top:0;transform-origin:0 0;-webkit-user-select:none;user-select:none}',
    '.slide{transition:none!important}',
    '.slide:not(.active){opacity:0;visibility:hidden;pointer-events:none}',
    '.notes-panel,.hint,.progress,.lightbox{display:none!important}',
    'body:not(.mm-preview) .slide .pkg *,body:not(.mm-preview) .slide .pk-wrap *{animation:none!important}',
    'body:not(.mm-preview) .slide.active .chart .bar,body:not(.mm-preview) .slide.active .chart .cv,body:not(.mm-preview) .slide.active .sw-chip,body:not(.mm-preview) .slide.active .tbar-track i,body:not(.mm-preview) .slide.active .branch-svg .draw,body:not(.mm-preview) .slide.active .branch-svg .pop{animation:none!important}',
    'body:not(.mm-preview) .branch-svg .draw{stroke-dashoffset:0!important}',
    '*[contenteditable="true"],*[contenteditable="true"] *{outline:2px dashed ' + GOLD + ';outline-offset:6px;cursor:text;-webkit-user-select:text!important;user-select:text!important}',
    '.mm-h{position:absolute;pointer-events:auto;background:' + GOLD + ';border-style:solid;border-color:' + INK + ';z-index:1}',
    '.mm-h[data-h=se]{cursor:nwse-resize}',
    '.mm-h[data-h=e]{cursor:ew-resize}',
    '.mm-h[data-h=s]{cursor:ns-resize}',
    '#mm-tag{position:absolute;background:' + GOLD + ';color:' + INK + ';font:600 12px "Segoe UI",system-ui,sans-serif;white-space:nowrap;pointer-events:none}',
    'body.mm-dragging,body.mm-dragging *{cursor:grabbing!important}',
  ].join('\n');
  document.head.appendChild(style);

  var scale = 1;
  var selected = null;
  var editing = null;
  var editingOriginal = '';
  var drag = null;
  var previewing = false;
  var previewTimer = null;

  function fit() {
    scale = (stage.clientWidth || 1920) / 1920;
    deck.style.transform = 'scale(' + scale + ')';
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
  function pathOf(el) {
    var path = [];
    var node = el;
    while (node && node !== deck) {
      if (!node.parentNode) return null;
      path.unshift(Array.prototype.indexOf.call(node.parentNode.children, node));
      node = node.parentNode;
    }
    return node === deck ? path : null;
  }
  function elAt(path) {
    if (!path || !path.length) return null;
    var node = deck;
    for (var i = 0; i < path.length; i++) {
      node = node && node.children ? node.children[path[i]] : null;
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
    if (el.hasAttribute && el.hasAttribute('data-pkg')) return registryName(el.getAttribute('data-pkg'));
    if (el.classList.contains('ed-shape')) return 'Forma';
    if (el.classList.contains('ed-text')) return 'Texto';
    var names = { h1: 'Título', h2: 'Título', h3: 'Subtítulo', p: 'Parágrafo', li: 'Item', img: 'Imagem', svg: 'Gráfico/ícone', div: 'Caixa', span: 'Texto', b: 'Negrito', ul: 'Lista', code: 'Código', pre: 'Código', table: 'Tabela', td: 'Célula', th: 'Cabeçalho', section: 'Slide' };
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
    c.classList.remove('active', 'mm-static');
    Array.prototype.forEach.call(c.querySelectorAll('[contenteditable],[data-mm-editing],[spellcheck]'), function (n) {
      n.removeAttribute('contenteditable');
      n.removeAttribute('data-mm-editing');
      n.removeAttribute('spellcheck');
    });
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
  function drawSelection(el) {
    if (!el || !el.isConnected || previewing) {
      sel.style.display = 'none';
      return;
    }
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
    handles.se.style.cssText = 'right:' + -(hs * 0.65).toFixed(2) + 'px;bottom:' + -(hs * 0.65).toFixed(2) + 'px;width:' + hs + 'px;height:' + hs + 'px;border-width:' + px(2) + ';border-radius:' + px(4);
    handles.e.style.cssText = 'right:' + -(hs * 0.65).toFixed(2) + 'px;top:calc(50% - ' + (hs / 2).toFixed(2) + 'px);width:' + hs + 'px;height:' + hs + 'px;border-width:' + px(2) + ';border-radius:' + px(4);
    handles.s.style.cssText = 'bottom:' + -(hs * 0.65).toFixed(2) + 'px;left:calc(50% - ' + (hs / 2).toFixed(2) + 'px);width:' + hs + 'px;height:' + hs + 'px;border-width:' + px(2) + ';border-radius:' + px(4);
    tag.textContent = labelOf(el) + ' · ' + Math.round(r.width) + '×' + Math.round(r.height);
    var inside = r.top * scale < 34;
    tag.style.fontSize = (12 / scale).toFixed(2) + 'px';
    tag.style.padding = px(3) + ' ' + px(8);
    tag.style.borderRadius = inside ? '0 ' + px(6) + ' ' + px(6) + ' ' + px(6) : px(6) + ' ' + px(6) + ' ' + px(6) + ' 0';
    tag.style.left = '-' + px(2);
    tag.style.top = inside ? 'auto' : '-' + (26 / scale).toFixed(2) + 'px';
    tag.style.bottom = inside ? '-' + (26 / scale).toFixed(2) + 'px' : 'auto';
  }
  function select(el, silent) {
    selected = el || null;
    drawSelection(selected);
    if (silent) return;
    if (selected) {
      post({ type: 'select', path: pathOf(selected), tag: selected.tagName.toLowerCase(), label: labelOf(selected) });
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
    if (!isTextElement(el)) return;
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
        if (s) post({ type: 'slide-html', index: slideList().indexOf(s), html: serialize(s), key: '' });
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
    if (!selected) return;
    var t = getTrans(selected);
    setTrans(selected, t.x + dx, t.y + dy);
    drawSelection(selected);
    commit('nudge:' + (pathOf(selected) || []).join('.'));
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
  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.button !== 0 || previewing) return;
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
        drag = { mode: 'rs', h: h.getAttribute('data-h'), el: selected, sx: e.clientX, sy: e.clientY, w0: r.width, h0: r.height, on: false, id: e.pointerId };
        capture(e);
        return;
      }
      if (!deck.contains(t)) return;
      if (editing) endEdit(true);
      var el = pick(t);
      select(el);
      if (!el) return;
      drag = { mode: 'move', el: el, sx: e.clientX, sy: e.clientY, base: getTrans(el), on: false, id: e.pointerId };
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
      }
      var ax = dx / scale;
      var ay = dy / scale;
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
  function endDrag() {
    if (!drag) return;
    var d = drag;
    drag = null;
    document.body.classList.remove('mm-dragging');
    try {
      document.documentElement.releasePointerCapture(d.id);
    } catch (err) {
      /* ignore */
    }
    if (d.on) {
      commit('');
      post({ type: 'select', path: pathOf(d.el), tag: d.el.tagName.toLowerCase(), label: labelOf(d.el) });
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
      if (k === 'Escape') {
        select(null);
        return;
      }
      if (k === 'Delete' || k === 'Backspace') {
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
        if (selected) {
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
      select(null, true);
      if (active) {
        window.scrollTo(0, 0);
        post({ type: 'slide', index: data.index });
      }
    } else if (data.type === 'select') {
      select(elAt(data.path), true);
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
    else if (name === 'parent') selectParent();
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
