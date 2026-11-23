import editorBridgeSource from './editorBridge.script.ts?inline-script';

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
      var bo = el.style.opacity === '' ? 1 : num(el.style.opacity);
      var lastT = num(kfs[kfs.length - 1].t);
      var total = Math.max(0.05, lastT);
      /* Só mexe no que os keyframes usam: a entrada (fade/subir) do elemento continua valendo. */
      function used(key, neutral) {
        return kfs.some(function (k) { return k[key] !== undefined && num(k[key]) !== neutral; });
      }
      var useMove = used('x', 0) || used('y', 0), useScale = used('s', 1);
      var useRot = used('r', 0), useOpa = used('o', 1);
      /* Formatação do texto (absoluta; ausente = o valor natural lido agora). */
      function has(key) {
        return kfs.some(function (k) { return k[key] !== undefined && k[key] !== null; });
      }
      /* O "natural" é lido sem as outras animações em curso (entrada, transição Interpolar):
         elas são levadas ao fim por um instante e voltam ao ponto em que estavam. */
      var others = el.getAnimations().filter(function (a) { return a.id !== 'mm-kf'; });
      var saved = others.map(function (a) { return { a: a, t: a.currentTime, paused: a.playState === 'paused' }; });
      /* chegando por transição Interpolar: os keyframes só começam quando ela termina
         (senão o tamanho/cor do keyframe passariam por cima da transição) */
      var wait = 0;
      saved.forEach(function (o) {
        try {
          var end = o.a.effect && o.a.effect.getComputedTiming ? o.a.effect.getComputedTiming().endTime : null;
          if (end !== null && isFinite(end)) {
            if (o.a.id === 'mm-morph') wait = Math.max(wait, end - num(o.t));
            o.a.currentTime = end;
          }
        } catch (e) {}
      });
      var cs = window.getComputedStyle(el);
      var nat = {
        c: cs.color, fs: cs.fontSize, w: cs.fontWeight,
        ls: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
        ts: cs.textShadow, fl: cs.filter
      };
      saved.forEach(function (o) { try { o.a.currentTime = o.t; if (!o.paused && o.a.playState !== 'running') o.a.play(); } catch (e) {} });
      /* brilho e desfoque do keyframe somam-se à sombra/filtro que o texto já tem */
      var keepTs = nat.ts && nat.ts !== 'none' ? ', ' + nat.ts : '';
      var keepFl = nat.fl && nat.fl !== 'none' ? ' ' + nat.fl : '';
      var uC = has('c'), uFs = has('fs'), uW = has('w'), uLs = has('ls'), uG = has('g'), uBl = has('bl');
      /* keyframes sem brilho usam brilho 0 na cor do vizinho (a cor não "pisca" no caminho) */
      var gcDefault = '#F7D98B';
      kfs.forEach(function (k) { if (k.g !== undefined && k.gc) gcDefault = k.gc; });
      function glow(g, c) {
        c = c || '#F7D98B';
        return '0 0 ' + (num(g) * 0.35) + 'px ' + c + ', 0 0 ' + num(g) + 'px ' + c;
      }
      function frame(k, offset, easing) {
        var f = { offset: offset, easing: easing };
        if (uC) f.color = k.c !== undefined ? k.c : nat.c;
        if (uFs) f.fontSize = k.fs !== undefined ? num(k.fs) + 'px' : nat.fs;
        if (uW) f.fontWeight = k.w !== undefined ? String(num(k.w)) : nat.w;
        if (uLs) f.letterSpacing = k.ls !== undefined ? num(k.ls) + 'em' : nat.ls;
        if (uG) f.textShadow = glow(k.g !== undefined ? k.g : 0, k.gc || gcDefault) + keepTs;
        if (uBl) f.filter = 'blur(' + (k.bl !== undefined ? num(k.bl) : 0) + 'px)' + keepFl;
        if (useMove) f.translate = (bx + num(k.x)) + 'px ' + (by + num(k.y)) + 'px';
        if (useScale) f.scale = bs * (k.s === undefined ? 1 : num(k.s));
        if (useRot) f.rotate = (br + num(k.r)) + 'deg';
        if (useOpa) f.opacity = bo * (k.o === undefined ? 1 : num(k.o));
        return f;
      }
      var frames = [];
      if (num(kfs[0].t) > 0) frames.push(frame({}, 0, 'linear'));
      kfs.forEach(function (k) {
        /* tudo em t=0: o último keyframe é o estado final (offset 1), não um instante que some */
        var off = lastT > 0 ? Math.min(1, num(k.t) / lastT) : 1;
        frames.push(frame(k, off, k.ease || 'ease-in-out'));
      });
      var anim = el.animate(frames, {
        duration: total * 1000, delay: Math.max(0, wait), fill: wait > 0 ? 'forwards' : 'both', easing: 'linear'
      });
      anim.id = 'mm-kf';
      anim.pause();
      anim.currentTime = 0;
      controllers.push({
        play: function () { if (reduced) anim.finish(); else anim.play(); },
        final: function () { try { anim.finish(); } catch (e) {} }
      });
    });
  }

  /* Brilho que passa pelo texto (.mm-shine): a faixa de luz atravessa o texto e espera fora dele
     até a próxima passada. Roda aqui (e não em CSS) para conviver com a animação de entrada. */
  function mountShine(slide, controllers) {
    [].slice.call(slide.querySelectorAll('.mm-shine')).forEach(function (el) {
      if (!el.animate) return;
      el.getAnimations().forEach(function (a) { if (a.id === 'mm-shine') a.cancel(); });
      var cs = window.getComputedStyle(el);
      var p0 = (cs.getPropertyValue('--mm-shine-p0') || '').trim() || '100% 100%';
      var p1 = (cs.getPropertyValue('--mm-shine-p1') || '').trim() || '0% 0%';
      var secs = num(cs.getPropertyValue('--mm-shine-t')) || 3.2;
      var delay = num(cs.getPropertyValue('--mm-shine-d'));
      var anim = el.animate(
        [{ backgroundPosition: p0, offset: 0 }, { backgroundPosition: p1, offset: 0.6 }, { backgroundPosition: p1, offset: 1 }],
        { duration: Math.max(0.2, secs) * 1000, delay: delay * 1000, iterations: Infinity, easing: 'linear', fill: 'both' }
      );
      anim.id = 'mm-shine';
      anim.pause();
      controllers.push({
        play: function () { if (reduced) anim.cancel(); else anim.play(); },
        final: function () { try { anim.cancel(); } catch (e) {} }
      });
    });
  }

  /* Transição de pacote com cena (data-transition="pkg:<pacote>:<transição>"): a cena roda
     quando o slide entra, com os campos do slide (data-transition-spec) sobre os padrões. */
  function mountScene(slide, controllers, api) {
    var m = /^pkg:([a-z0-9-]+):([a-z0-9-]+)$/i.exec(slide.getAttribute('data-transition') || '');
    if (!m) return;
    var entry = registry[m[1]];
    var list = entry && entry.def && entry.def.transitions;
    if (!list || !list.length) return;
    var t = null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === m[2]) t = list[i];
    if (!t || !t.scene) return;
    if (typeof t.scene === 'string') t.scene = revive(t.scene);
    else if (typeof t.scene === 'object' && typeof t.scene.$fn === 'string') t.scene = revive(t.scene.$fn);
    if (typeof t.scene !== 'function') return;
    var spec = {}, k;
    var base = t.defaults || {};
    for (k in base) spec[k] = base[k];
    try {
      var own = JSON.parse(slide.getAttribute('data-transition-spec') || '{}');
      for (k in own) spec[k] = own[k];
    } catch (e) {}
    var ctrl = t.scene(slide, spec, api);
    if (ctrl && typeof ctrl.play === 'function') controllers.push(ctrl);
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

    try { mountScene(slide, controllers, api); } catch (e) { /* idem */ }
    try { mountKeyframes(slide, controllers); } catch (e) { /* não deve quebrar a apresentação */ }
    try { mountShine(slide, controllers); } catch (e) { /* idem */ }

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

  /* Vídeos: só os do slide atual tocam (do começo, se forem automáticos); os outros param. */
  function syncVideos(slide) {
    [].slice.call(document.querySelectorAll('video')).forEach(function (v) {
      if (slide && slide.contains(v)) {
        if (v.hasAttribute('autoplay')) {
          try { v.currentTime = 0; } catch (e) {}
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  function animate(slide) {
    if (!slide) return;
    if (current) current.final();
    current = mountSlide(slide);
    current.play();
    syncVideos(slide);
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
 * postMessage (ver `editorBridge.script.ts`).
 */
export const EDITOR_BRIDGE_SRC: string = editorBridgeSource;
