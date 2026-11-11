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
 * Script injetado no iframe do editor. Responsável por seleção, mover/redimensionar,
 * edição de texto, atalhos e escala do palco. Conversa com a aplicação via
 * postMessage (ver `editorBridge.script.js`).
 */
export const EDITOR_BRIDGE_SRC: string = editorBridgeSource;
