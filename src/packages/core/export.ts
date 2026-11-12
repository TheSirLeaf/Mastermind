import { ANIMATION_CSS } from './animation';
import { resolveDeckSlides } from './bases';
import type { PackageRegistry } from './PackageRegistry';
import { PKG_HOST_SRC, EDITOR_BRIDGE_SRC } from './pkgHost';
import type { Deck, Slide } from './types';

/** Template padrão servido em `public/presentation-template.html`. */
export const TEMPLATE_URL = '/presentation-template.html';

let cachedTemplate: string | null = null;

/** Carrega (e memoiza) o template base da apresentação. */
export async function loadTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error(`Falha ao carregar o template (${response.status}).`);
  cachedTemplate = await response.text();
  return cachedTemplate;
}

/** Substitui um placeholder sem interpretar `$&` no conteúdo. */
function fill(template: string, token: string, value: string): string {
  return template.split(token).join(value);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function slidesToHTML(slides: Slide[]): string {
  return slides.map((slide) => slide.html).join('\n');
}

/** Slides com as bases aplicadas; no editor as bases entram depois, como slides extras. */
export function deckSlidesHTML(deck: Deck, withBases: boolean): string {
  const parts = resolveDeckSlides(deck);
  if (withBases) for (const base of deck.bases ?? []) parts.push(base.html);
  return parts.join('\n');
}

/** Bases embutidas no HTML exportado, para reabrir o arquivo no editor sem perder o modelo. */
function basesMeta(deck: Deck): string {
  if (!deck.bases?.length) return '';
  const json = JSON.stringify({ bases: deck.bases, modelId: deck.modelId }).replace(
    /</g,
    '\\u003c'
  );
  return `<script type="application/json" id="mm-bases">${json}</script>`;
}

/**
 * CSS de impressão/PDF: cada slide ocupa uma página 1920×1080 sem escala.
 * O host restaura o estado final dos runtimes antes de imprimir.
 */
export const PRINT_CSS = `@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { width: 1920px; height: auto !important; overflow: visible !important; background: #10060B !important; }
  #stage { position: static !important; display: block !important; }
  #deck { position: static !important; transform: none !important; width: 1920px !important; height: auto !important; }
  .slide { position: relative !important; inset: auto !important; width: 1920px !important; height: 1080px !important; opacity: 1 !important; visibility: visible !important; transform: none !important; display: flex !important; break-after: page; page-break-after: always; }
  .slide:last-child { break-after: auto; page-break-after: auto; }
  .progress, .notes-panel, .hint, .lightbox { display: none !important; }
}`;

/** Ids de pacotes referenciados nos slides (`data-pkg`). */
export function collectPackageIds(deck: Deck): string[] {
  const ids = new Set<string>();
  const re = /data-pkg=["']([^"']+)["']/g;
  for (const slide of deck.slides) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(slide.html)) !== null) {
      if (match[1]) ids.add(match[1]);
    }
    re.lastIndex = 0;
  }
  return [...ids];
}

export interface BuildPresentationOptions {
  template: string;
  deck: Deck;
  registry: PackageRegistry;
  /** Pacotes usados no deck (padrão: todos os registrados). */
  packageIds?: string[];
}

/** Registry no formato do host: `{ [id]: { def } }`. */
export function buildRegistryPayload(registry: PackageRegistry, ids?: string[]): string {
  const packages = registry.serialize(ids);
  const payload: Record<string, { def: unknown }> = {};
  for (const def of packages) payload[def.id] = { def };
  return JSON.stringify(payload);
}

/**
 * Gera o HTML autônomo da apresentação.
 * O resultado não depende do editor: abre e anima em qualquer navegador.
 */
export function buildPresentationHTML(options: BuildPresentationOptions): string {
  const { template, deck, registry } = options;
  const packageIds = options.packageIds ?? collectPackageIds(deck);
  let html = template;

  html = fill(html, '{{TITLE}}', escapeText(deck.title || 'Apresentação'));
  html = fill(html, '{{SLIDES}}', deckSlidesHTML(deck, false));
  html = fill(html, '{{PKG_CSS}}', registry.css());
  html = fill(html, '{{PKG_REGISTRY}}', buildRegistryPayload(registry, packageIds));
  html = fill(html, '{{PKG_HOST}}', PKG_HOST_SRC);
  html = fill(html, '{{NAV}}', NAV_SCRIPT);

  if (html.includes('</head>')) {
    html = html.replace(
      '</head>',
      `<style id="mm-anim">${ANIMATION_CSS}</style>\n<style id="mm-print">${PRINT_CSS}</style>\n${basesMeta(deck)}</head>`
    );
  }

  return html;
}

/** Documento usado pelo iframe do editor (sem apresentação/navegação). */
export function buildEditorHTML(
  deck: Deck,
  registry: PackageRegistry,
  template: string = cachedTemplate ?? ''
): string {
  if (!template) throw new Error('Template da apresentação não carregado.');
  let html = template;

  html = fill(html, '{{TITLE}}', escapeText(deck.title || 'Apresentação'));
  html = fill(html, '{{SLIDES}}', deckSlidesHTML(deck, true));
  html = fill(html, '{{PKG_CSS}}', registry.css());
  html = fill(html, '{{PKG_REGISTRY}}', buildRegistryPayload(registry));
  // O host expõe `window.__anim`, usado pelo preview para rodar os runtimes dos pacotes.
  html = fill(html, '{{PKG_HOST}}', PKG_HOST_SRC);
  html = fill(html, '{{NAV}}', EDITOR_BRIDGE_SRC);

  if (html.includes('</head>')) {
    html = html.replace('</head>', `<style id="mm-anim">${ANIMATION_CSS}</style>\n</head>`);
  }

  return html;
}

/** Atualiza o template memoizado (usado depois do primeiro fetch). */
export function setCachedTemplate(template: string): void {
  cachedTemplate = template;
}

/** Classe utilitária para inserir um pacote no slide como HTML. */
export function packageElementHTML(
  id: string,
  spec: Record<string, unknown>,
  innerHTML: string,
  box?: { w?: number }
): string {
  const width = box?.w ?? 900;
  const specJson = escapeAttr(JSON.stringify(spec));
  return `<div class="pk-wrap" data-pkg="${escapeAttr(id)}" data-spec="${specJson}" style="width:${width}px;max-width:100%">${innerHTML}</div>`;
}

/** Nome de arquivo seguro a partir do título. */
export function slugifyTitle(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'apresentacao';
}

/** Baixa um arquivo no navegador. */
export function downloadFile(
  filename: string,
  content: string,
  mime = 'application/octet-stream'
): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20_000);
}

export interface ExportPresentationFileOptions {
  deck: Deck;
  registry: PackageRegistry;
  template?: string;
  filename?: string;
  packageIds?: string[];
}

/** Gera e baixa o HTML autônomo da apresentação. Retorna o nome do arquivo. */
export async function exportPresentationFile(
  options: ExportPresentationFileOptions
): Promise<string> {
  const template = options.template ?? (await loadTemplate());
  const filename = options.filename ?? `${slugifyTitle(options.deck.title)}.html`;
  const html = buildPresentationHTML({
    template,
    deck: options.deck,
    registry: options.registry,
    ...(options.packageIds ? { packageIds: options.packageIds } : {}),
  });
  downloadFile(filename, html, 'text/html;charset=utf-8');
  return filename;
}

/** Gera e baixa um `.dialcron-pkg.json` com os pacotes indicados. */
export function exportPackagesFile(
  registry: PackageRegistry,
  ids?: string[],
  filename?: string
): string {
  const name =
    filename ??
    (ids?.length === 1 ? `${ids[0]}.dialcron-pkg.json` : 'pacotes-dialcron.dialcron-pkg.json');
  downloadFile(name, JSON.stringify(registry.exportFile(ids), null, 1), 'application/json');
  return name;
}

/** Script de navegação da apresentação (setas, notas, impressão, fullscreen). */
export const NAV_SCRIPT = `(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var deck = document.getElementById('deck');
  var bar = document.getElementById('bar');
  var notesEl = document.getElementById('notesText');
  var idx = 0;
  if (!slides.length) return;

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var started = false, moving = false, GAP = 160;

  /* Posição e escala de cada slide no "mundo" (data-x, data-y, data-s) — usadas na transição Mover. */
  function lay(i){
    var el = slides[i];
    var sc = parseFloat(el.getAttribute('data-s')); if(!(sc > 0)) sc = 1;
    var x = parseFloat(el.getAttribute('data-x')); if(isNaN(x)) x = i*(1920+GAP);
    var y = parseFloat(el.getAttribute('data-y')); if(isNaN(y)) y = 0;
    return {x:x, y:y, s:sc};
  }
  function camFor(i){
    var l = lay(i), W = window.innerWidth, H = window.innerHeight;
    var z = Math.min(W/(1920*l.s), H/(1080*l.s));
    return {z:z, tx:(W - 1920*l.s*z)/2 - l.x*z, ty:(H - 1080*l.s*z)/2 - l.y*z};
  }
  function place(c){ deck.style.transform = 'translate(' + c.tx + 'px,' + c.ty + 'px) scale(' + c.z + ')'; }

  var css = ['body.mm-world .slide{inset:auto!important;opacity:1;visibility:visible;transition:opacity .35s ease!important;transform-origin:0 0!important}',
    '#deck.mm-notrans .slide{transition:none!important}',
    '.slide.mm-nest{inset:auto!important;opacity:1!important;visibility:visible!important;transition:none!important;transform-origin:0 0!important;pointer-events:none}',
    '.slide.t-instant{transition:none!important}',
    '.slide.t-leave{visibility:visible!important;opacity:1!important;transition:none!important;z-index:1!important;pointer-events:none}',
    '.slide.t-in-slide{animation:mmTrIn .7s cubic-bezier(.65,0,.35,1) both}.slide.t-out-slide{animation:mmTrOut .7s cubic-bezier(.65,0,.35,1) both}',
    '.slide.t-in-slide-r{animation:mmTrInR .7s cubic-bezier(.65,0,.35,1) both}.slide.t-out-slide-r{animation:mmTrOutR .7s cubic-bezier(.65,0,.35,1) both}',
    '.slide.t-in-zoom{animation:mmZIn .7s cubic-bezier(.2,.8,.2,1) both}.slide.t-out-zoom{animation:mmZOut .7s cubic-bezier(.2,.8,.2,1) both}',
    '.slide.t-in-zoom-r{animation:mmZInR .7s cubic-bezier(.2,.8,.2,1) both}.slide.t-out-zoom-r{animation:mmZOutR .7s cubic-bezier(.2,.8,.2,1) both}',
    '@keyframes mmTrIn{from{transform:translateX(100%)}to{transform:none}}@keyframes mmTrOut{from{transform:none}to{transform:translateX(-100%)}}',
    '@keyframes mmTrInR{from{transform:translateX(-100%)}to{transform:none}}@keyframes mmTrOutR{from{transform:none}to{transform:translateX(100%)}}',
    '@keyframes mmZIn{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:none}}@keyframes mmZOut{from{opacity:1;transform:none}to{opacity:0;transform:scale(1.2)}}',
    '@keyframes mmZInR{from{opacity:0;transform:scale(1.2)}to{opacity:1;transform:none}}@keyframes mmZOutR{from{opacity:1;transform:none}to{opacity:0;transform:scale(.82)}}'];
  var kids = [];
  slides.forEach(function(el, i){
    el.setAttribute('data-mm-i', i);
    var l = lay(i);
    css.push('body.mm-world .slide[data-mm-i="' + i + '"]{left:' + l.x + 'px!important;top:' + l.y + 'px!important;transform:scale(' + l.s + ')!important;z-index:' + Math.round(100/l.s) + '!important}');
    kids[i] = [];
  });
  /* Slide dentro de outro: a caixa dele está inteira sobre a do outro (e é menor). */
  slides.forEach(function(el, j){
    var b = lay(j);
    slides.forEach(function(el2, i){
      if(i === j) return;
      var a = lay(i);
      if(b.s < a.s - 0.0001 && b.x >= a.x - 1 && b.y >= a.y - 1 &&
         b.x + 1920*b.s <= a.x + 1920*a.s + 1 && b.y + 1080*b.s <= a.y + 1080*a.s + 1) kids[i].push(j);
    });
  });
  var tstyle = document.createElement('style');
  tstyle.textContent = css.join(' ');
  document.head.appendChild(tstyle);

  /* Mostra, dentro do slide ativo, os slides que estão sobre ele (na posição e escala do layout). */
  function unnest(){
    slides.forEach(function(el){
      if(el.classList.contains('mm-nest')){
        el.classList.remove('mm-nest');
        ['left','top','transform','z-index'].forEach(function(p){ el.style.removeProperty(p); });
      }
    });
  }
  function nest(a){
    unnest();
    var la = lay(a);
    kids[a].forEach(function(j){
      var l = lay(j), el = slides[j], rel = l.s / la.s;
      el.classList.add('mm-nest');
      el.style.setProperty('left', ((l.x - la.x)/la.s) + 'px', 'important');
      el.style.setProperty('top', ((l.y - la.y)/la.s) + 'px', 'important');
      el.style.setProperty('transform', 'scale(' + rel + ')', 'important');
      el.style.setProperty('z-index', String(3 + Math.round(10/rel)), 'important');
    });
  }

  function fit(){
    if(moving) return;
    var s = Math.min(window.innerWidth/1920, window.innerHeight/1080);
    var dx = (window.innerWidth - 1920*s)/2, dy = (window.innerHeight - 1080*s)/2;
    deck.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
  }
  function quiet(){
    deck.classList.add('mm-notrans');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ deck.classList.remove('mm-notrans'); }); });
  }
  /* Mover: a câmera viaja pelo mundo (zoom em escala logarítmica) até o slide de destino. */
  function travel(from, n){
    moving = true;
    var W = window.innerWidth, H = window.innerHeight;
    var a = lay(from), b = lay(n);
    var za = camFor(from).z, zb = camFor(n).z;
    var ax = a.x + 960*a.s, ay = a.y + 540*a.s, bx = b.x + 960*b.s, by = b.y + 540*b.s;
    deck.style.transition = 'none';
    unnest();
    document.body.classList.add('mm-world');
    var t0 = null, DUR = 1300;
    function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
    function frame(ts){
      if(t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0)/DUR), u = ease(t);
      var z = za * Math.pow(zb/za, u);
      var cx = ax + (bx - ax)*u, cy = ay + (by - ay)*u;
      place({z:z, tx:W/2 - cx*z, ty:H/2 - cy*z});
      if(t < 1){ requestAnimationFrame(frame); return; }
      /* chegada: volta ao modo normal sem salto visível */
      deck.classList.add('mm-notrans');
      slides[from].classList.remove('active');
      slides[n].classList.add('active');
      nest(n);
      document.body.classList.remove('mm-world');
      moving = false;
      fit();
      quiet();
      if(window.__anim) window.__anim(slides[n]);
    }
    requestAnimationFrame(frame);
  }

  function clean(list){
    list.forEach(function(el){
      Array.prototype.slice.call(el.classList).forEach(function(c){
        if(c === 't-leave' || c === 't-instant' || c.indexOf('t-in-') === 0 || c.indexOf('t-out-') === 0) el.classList.remove(c);
      });
    });
  }
  function show(n, push){
    n = Math.max(0, Math.min(slides.length-1, n));
    if(moving) return;
    if(n === idx && slides[n].classList.contains('active')) return;
    var from = idx, prev = slides[from];
    var s = slides[n];
    var tr = (!started || reduced || !prev.classList.contains('active')) ? 'default' : (s.getAttribute('data-transition') || 'default');
    var rev = n < from ? '-r' : '';
    started = true;
    idx = n;
    if(tr === 'move' && n !== from){ travel(from, n); }
    else {
      var pk = tr.indexOf('pkg:') === 0 ? tr.slice(4).replace(':', '-') : '';
      prev.classList.remove('active');
      s.classList.add('active');
      nest(n);
      if(tr === 'instant'){
        prev.classList.add('t-instant'); s.classList.add('t-instant');
        setTimeout(function(){ clean([prev, s]); }, 80);
      } else if(tr === 'slide' || tr === 'zoom' || pk){
        var key = pk ? 'pk-' + pk : tr;
        prev.classList.add('t-leave', 't-out-' + key + rev);
        s.classList.add('t-in-' + key + rev);
        var d = 700;
        try{
          var v = window.getComputedStyle(s).animationDuration || '';
          var f = parseFloat(v);
          if(f > 0) d = v.indexOf('ms') > 0 ? f : f*1000;
        }catch(e){}
        setTimeout(function(){ clean([prev, s]); }, d + 60);
      }
      if(window.__anim) window.__anim(s);
    }
    if(bar) bar.style.width = ((idx+1)/slides.length*100).toFixed(2) + '%';
    if(notesEl) notesEl.textContent = s.getAttribute('data-notes') || '';
    if(push !== false){ try{ history.replaceState(null,'','#'+(idx+1)); }catch(e){} }
  }
  function next(){ show(idx+1); }
  function prev(){ show(idx-1); }
  document.addEventListener('keydown', function(e){
    var k = e.key;
    if(k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter'){ e.preventDefault(); next(); }
    else if(k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace'){ e.preventDefault(); prev(); }
    else if(k === 'Home'){ show(0); }
    else if(k === 'End'){ show(slides.length-1); }
    else if(k === 'f' || k === 'F'){ if(!document.fullscreenElement){ document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } else { document.exitFullscreen && document.exitFullscreen(); } }
    else if(k === 's' || k === 'S'){ document.body.classList.toggle('notes-on'); }
    else if(k === 'p' || k === 'P'){ window.print(); }
  });
  var lb = document.getElementById('lightbox');
  if(lb){
    var lbImg = lb.querySelector('img');
    document.querySelectorAll('img.zoomable').forEach(function(img){
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e){
        e.stopPropagation();
        if(lbImg){ lbImg.src = img.src; }
        lb.classList.add('on');
      });
    });
    lb.addEventListener('click', function(e){ e.stopPropagation(); lb.classList.remove('on'); if(lbImg) lbImg.src=''; });
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('a')) return;
    if(lb && lb.classList.contains('on')) return;
    if(document.body.classList.contains('notes-on')) return;
    if(e.clientX < window.innerWidth*0.15){ prev(); } else { next(); }
  });
  var sx = null;
  document.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    if(Math.abs(dx) > 50){ dx < 0 ? next() : prev(); }
    sx = null;
  }, {passive:true});
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function(){
    var h = parseInt((location.hash||'').replace('#',''),10);
    if(!isNaN(h) && h-1 !== idx) show(h-1, false);
  });
  fit();
  var start = parseInt((location.hash||'').replace('#',''),10);
  idx = 0;
  show(isNaN(start) ? 0 : start-1, false);
})();`;
