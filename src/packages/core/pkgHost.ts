/**
 * Runtime de pacotes executado DENTRO da apresentação exportada.
 *
 * - Lê o registry JSON (`#pkg-registry`).
 * - Ao entrar em um slide, instancia o runtime de cada `[data-pkg]`.
 * - Sempre chama `final()` na saída (restaura o HTML para print/PDF).
 *
 * Este arquivo é uma string porque precisa ser embutido no HTML autônomo.
 */
export const PKG_HOST_SRC = `(function(){
  if (window.__MM_HOST__) return;
  window.__MM_HOST__ = true;

  var registry = {};
  try {
    var node = document.getElementById('pkg-registry');
    if (node) registry = JSON.parse(node.textContent || '{}');
  } catch (e) { registry = {}; }

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var current = null;

  function revive(src) {
    try { return (new Function('return (' + src + ')'))(); } catch (e) { return null; }
  }

  function makeApi(isAlive) {
    var rafs = [];
    var timers = [];
    function stopAll() {
      rafs.forEach(function (id) { cancelAnimationFrame(id); });
      rafs = [];
      timers.forEach(function (id) { clearTimeout(id); });
      timers = [];
    }
    return {
      reduced: reduced,
      alive: isAlive,
      wait: function (ms) {
        return new Promise(function (resolve) {
          var id = setTimeout(function () { resolve(); }, ms);
          timers.push(id);
        });
      },
      frame: function (fn) {
        function step(ts) {
          if (!isAlive()) return;
          var again = fn(ts);
          if (again === false) return;
          rafs.push(requestAnimationFrame(step));
        }
        rafs.push(requestAnimationFrame(step));
      },
      _stop: stopAll
    };
  }

  function mountSlide(slide) {
    var alive = true;
    var controllers = [];
    var api = makeApi(function () { return alive; });
    var roots = [].slice.call(slide.querySelectorAll('[data-pkg]'));

    roots.forEach(function (root) {
      var id = root.getAttribute('data-pkg');
      var entry = id ? registry[id] : null;
      var def = entry && entry.def;
      if (!def || !def.runtime) return;
      if (typeof def.runtime === 'string') def.runtime = revive(def.runtime);
      else if (typeof def.runtime === 'object' && typeof def.runtime.$fn === 'string') {
        def.runtime = revive(def.runtime.$fn);
      }
      if (typeof def.runtime !== 'function') return;
      var spec = {};
      try { spec = JSON.parse(root.getAttribute('data-spec') || '{}'); } catch (e) {}
      try {
        var ctrl = def.runtime(root, spec, api);
        if (ctrl && typeof ctrl.play === 'function') controllers.push(ctrl);
      } catch (e) { /* pacote não deve quebrar a apresentação */ }
    });

    return {
      play: function () {
        controllers.forEach(function (ctrl) {
          try { ctrl.play(); } catch (e) {}
        });
      },
      final: function () {
        alive = false;
        api._stop();
        controllers.forEach(function (ctrl) {
          try { ctrl.final(); } catch (e) {}
        });
        controllers = [];
      }
    };
  }

  function animate(slide) {
    if (!slide) return;
    if (current) current.final();
    current = mountSlide(slide);
    current.play();
  }

  window.__anim = animate;
  window.addEventListener('beforeprint', function () { if (current) current.final(); });
  window.addEventListener('afterprint', function () {
    var active = document.querySelector('.slide.active');
    if (active) animate(active);
  });
})();`;

/**
 * Script injetado no iframe do editor. Responsável por seleção, edição de
 * texto e escala do palco. Conversa com a aplicação via postMessage.
 */
export const EDITOR_BRIDGE_SRC = `(function(){
  if (window.__MM_EDITOR__) return;
  window.__MM_EDITOR__ = true;

  var deck = document.getElementById('deck');
  var stage = document.getElementById('stage');
  if (!deck || !stage) return;

  var sel = document.createElement('div');
  sel.id = 'mm-sel';
  sel.style.cssText = 'position:absolute;z-index:9000;pointer-events:none;border:2px solid #F7D98B;box-shadow:0 0 0 1px rgba(16,6,11,.55),0 0 24px rgba(247,217,139,.35);border-radius:2px;display:none;box-sizing:border-box';
  deck.appendChild(sel);

  var hover = document.createElement('div');
  hover.style.cssText = 'position:absolute;z-index:8999;pointer-events:none;border:1px dashed rgba(247,217,139,.55);display:none;box-sizing:border-box';
  deck.appendChild(hover);

  var style = document.createElement('style');
  style.textContent = [
    'html,body{overflow:hidden}',
    '#stage{display:block}',
    '#deck{left:0;top:0;transform-origin:0 0}',
    '.slide{transition:none!important}',
    '.slide:not(.active){opacity:0;visibility:hidden;pointer-events:none}',
    '*[contenteditable="true"]{outline:2px solid #F7D98B;outline-offset:4px;cursor:text}',
    '[data-mm-editing]{cursor:text}'
  ].join('\\n');
  document.head.appendChild(style);

  var scale = 1;
  var selected = null;
  var editing = null;
  var editingOriginal = '';

  function fit() {
    scale = (stage.clientWidth || 1920) / 1920;
    deck.style.transform = 'scale(' + scale + ')';
  }
  fit();
  window.addEventListener('resize', fit);

  function post(msg) {
    msg.__mm = 'deck';
    try { window.parent.postMessage(msg, '*'); } catch (e) {}
  }

  function activeSlide() {
    return deck.querySelector('.slide.active');
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

  function labelOf(el) {
    if (el.hasAttribute && el.hasAttribute('data-pkg')) {
      var id = el.getAttribute('data-pkg');
      var entry = id && registryId(id);
      return entry || 'Pacote';
    }
    var names = {h1:'Título',h2:'Título',h3:'Subtítulo',p:'Parágrafo',li:'Item',img:'Imagem',svg:'Gráfico/ícone',div:'Caixa',span:'Texto',b:'Negrito',ul:'Lista',code:'Código',pre:'Código',table:'Tabela',section:'Slide'};
    return names[el.tagName.toLowerCase()] || el.tagName.toLowerCase();
  }

  function registryId(id) {
    try {
      var node = document.getElementById('pkg-registry');
      var reg = node ? JSON.parse(node.textContent || '{}') : {};
      return reg[id] && reg[id].def ? reg[id].def.name : 'Pacote';
    } catch (e) { return 'Pacote'; }
  }

  function rectOf(el) {
    var dr = deck.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return {
      left: (r.left - dr.left) / scale,
      top: (r.top - dr.top) / scale,
      width: r.width / scale,
      height: r.height / scale
    };
  }

  function drawSelection(el) {
    if (!el || !el.isConnected) {
      sel.style.display = 'none';
      return;
    }
    var r = rectOf(el);
    sel.style.display = 'block';
    sel.style.left = r.left + 'px';
    sel.style.top = r.top + 'px';
    sel.style.width = r.width + 'px';
    sel.style.height = r.height + 'px';
  }

  function select(el) {
    selected = el;
    if (el) {
      drawSelection(el);
      var path = pathOf(el);
      post({ type: 'select', path: path, tag: el.tagName.toLowerCase(), label: labelOf(el) });
    } else {
      sel.style.display = 'none';
      post({ type: 'select', path: null, tag: '', label: '' });
    }
  }

  function isTextElement(el) {
    if (!el || el === deck) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === 'section' || tag === 'img' || tag === 'svg' || tag === 'br') return false;
    if (el.hasAttribute('data-pkg') || el.closest('[data-pkg]')) return false;
    return true;
  }

  function beginEdit(el) {
    if (!isTextElement(el)) return;
    editing = el;
    editingOriginal = el.innerHTML;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-mm-editing', '1');
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var s = window.getSelection();
    if (s) { s.removeAllRanges(); s.addRange(range); }
  }

  function endEdit(commit) {
    if (!editing) return;
    var el = editing;
    editing = null;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-mm-editing');
    if (!commit) el.innerHTML = editingOriginal;
    var path = pathOf(el);
    post({ type: 'edit', path: path, html: el.innerHTML });
    drawSelection(el);
  }

  document.addEventListener('click', function (e) {
    if (editing) { endEdit(true); return; }
    var target = e.target;
    if (!target || !(target instanceof Element) || !deck.contains(target)) return;
    var slide = activeSlide();
    if (!slide || !slide.contains(target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (target.closest('#mm-sel')) return;
    select(target === slide ? slide : target);
  }, true);

  document.addEventListener('dblclick', function (e) {
    var target = e.target;
    if (!target || !(target instanceof Element) || !deck.contains(target)) return;
    e.preventDefault();
    e.stopPropagation();
    beginEdit(target);
  }, true);

  document.addEventListener('mousemove', function (e) {
    if (editing) { hover.style.display = 'none'; return; }
    var target = e.target;
    if (!target || !(target instanceof Element) || !deck.contains(target)) { hover.style.display = 'none'; return; }
    var slide = activeSlide();
    if (!slide || !slide.contains(target) || target === slide) { hover.style.display = 'none'; return; }
    var r = rectOf(target);
    hover.style.display = 'block';
    hover.style.left = r.left + 'px';
    hover.style.top = r.top + 'px';
    hover.style.width = r.width + 'px';
    hover.style.height = r.height + 'px';
  }, true);

  document.addEventListener('keydown', function (e) {
    if (editing) {
      if (e.key === 'Escape') { e.preventDefault(); endEdit(false); }
      else if (e.key === 'Enter' && !e.shiftKey) {
        var tag = editing.tagName.toLowerCase();
        if (tag !== 'p' && tag !== 'li' && tag !== 'div') { e.preventDefault(); endEdit(true); }
      }
      e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') select(null);
  }, true);

  document.addEventListener('focusout', function () {
    if (editing) endEdit(true);
  }, true);

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.__mm !== 'editor') return;
    if (data.type === 'goto') {
      var slides = [].slice.call(deck.querySelectorAll('.slide'));
      slides.forEach(function (s, i) { s.classList.toggle('active', i === data.index); });
      select(null);
      var active = slides[data.index];
      if (active) {
        window.scrollTo(0, 0);
        post({ type: 'slide', index: data.index });
      }
    } else if (data.type === 'select') {
      select(elAt(data.path));
    } else if (data.type === 'set-slide') {
      var slides = [].slice.call(deck.querySelectorAll('.slide'));
      var old = slides[data.index];
      if (!old) return;
      var tpl = document.createElement('template');
      tpl.innerHTML = String(data.html || '').trim();
      var next = tpl.content.firstElementChild;
      if (!next) return;
      var wasActive = old.classList.contains('active');
      old.replaceWith(next);
      if (wasActive) next.classList.add('active');
      if (selected && selected === old) select(null);
    } else if (data.type === 'fit') {
      fit();
      if (selected) drawSelection(selected);
    }
  });

  post({ type: 'ready', count: deck.querySelectorAll('.slide').length });
})();`;
