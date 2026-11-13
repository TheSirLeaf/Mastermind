import editorBridgeSource from './editorBridge.script.js?raw';

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

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /* Interpolação: cada elemento com data-kf percorre seus keyframes (translate/scale/rotate/opacity). */
  function mountKeyframes(slide, controllers) {
    [].slice.call(slide.querySelectorAll('[data-kf]')).forEach(function (el) {
      var kfs;
      try { kfs = JSON.parse(el.getAttribute('data-kf') || '[]'); } catch (e) { return; }
      if (!Array.isArray(kfs) || !kfs.length || !el.animate) return;
      el.getAnimations().forEach(function (a) { if (a.id === 'mm-kf') a.cancel(); });
      kfs = kfs.slice().sort(function (a, b) { return num(a.t) - num(b.t); });
      var tr = (el.style.translate || '').split(' ').filter(Boolean);
      var bx = num(tr[0]), by = num(tr[1]);
      var bs = num(el.style.scale) || 1, br = num(el.style.rotate);
      var total = Math.max(0.05, num(kfs[kfs.length - 1].t));
      function frame(k, offset, easing) {
        return {
          offset: offset,
          translate: (bx + num(k.x)) + 'px ' + (by + num(k.y)) + 'px',
          scale: bs * (k.s === undefined ? 1 : num(k.s)),
          rotate: (br + num(k.r)) + 'deg',
          opacity: k.o === undefined ? 1 : num(k.o),
          easing: easing
        };
      }
      var frames = [];
      if (num(kfs[0].t) > 0) frames.push(frame({}, 0, 'linear'));
      kfs.forEach(function (k) {
        frames.push(frame(k, Math.min(1, num(k.t) / total), k.ease || 'ease-in-out'));
      });
      var anim = el.animate(frames, { duration: total * 1000, fill: 'both', easing: 'linear' });
      anim.id = 'mm-kf';
      anim.pause();
      anim.currentTime = 0;
      controllers.push({
        play: function () { if (reduced) anim.finish(); else anim.play(); },
        final: function () { try { anim.finish(); } catch (e) {} }
      });
    });
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

    try { mountKeyframes(slide, controllers); } catch (e) { /* não deve quebrar a apresentação */ }

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
  /* O editor pede para soltar o estado final das interpolações ao sair da pré-visualização. */
  window.addEventListener('mm-kf-reset', function () {
    [].slice.call(document.querySelectorAll('[data-kf]')).forEach(function (el) {
      if (el.getAnimations) el.getAnimations().forEach(function (a) { if (a.id === 'mm-kf') a.cancel(); });
    });
  });
  window.addEventListener('beforeprint', function () { if (current) current.final(); });
  window.addEventListener('afterprint', function () {
    var active = document.querySelector('.slide.active');
    if (active) animate(active);
  });
})();`;

/**
 * Script injetado no iframe do editor. Responsável por seleção, mover/redimensionar,
 * edição de texto, atalhos e escala do palco. Conversa com a aplicação via
 * postMessage (ver `editorBridge.script.js`).
 */
export const EDITOR_BRIDGE_SRC: string = editorBridgeSource;
