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
  const { template, deck, registry, packageIds } = options;
  let html = template;

  html = fill(html, '{{TITLE}}', escapeText(deck.title || 'Apresentação'));
  html = fill(html, '{{SLIDES}}', slidesToHTML(deck.slides));
  html = fill(html, '{{PKG_CSS}}', registry.css());
  html = fill(html, '{{PKG_REGISTRY}}', buildRegistryPayload(registry, packageIds));
  html = fill(html, '{{PKG_HOST}}', PKG_HOST_SRC);
  html = fill(html, '{{NAV}}', NAV_SCRIPT);

  return html;
}

/** Documento usado pelo iframe do editor (sem apresentação/navegação). */
export function buildEditorHTML(deck: Deck, registry: PackageRegistry): string {
  const template = cachedTemplate ?? '';
  let html = template;

  html = fill(html, '{{TITLE}}', escapeText(deck.title || 'Apresentação'));
  html = fill(html, '{{SLIDES}}', slidesToHTML(deck.slides));
  html = fill(html, '{{PKG_CSS}}', registry.css());
  html = fill(html, '{{PKG_REGISTRY}}', buildRegistryPayload(registry));
  html = fill(html, '{{PKG_HOST}}', '');
  html = fill(html, '{{NAV}}', EDITOR_BRIDGE_SRC);

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

/** Script de navegação da apresentação (setas, notas, impressão, fullscreen). */
export const NAV_SCRIPT = `(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var deck = document.getElementById('deck');
  var bar = document.getElementById('bar');
  var notesEl = document.getElementById('notesText');
  var idx = 0;
  if (!slides.length) return;

  function fit(){
    var s = Math.min(window.innerWidth/1920, window.innerHeight/1080);
    var dx = (window.innerWidth - 1920*s)/2, dy = (window.innerHeight - 1080*s)/2;
    deck.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
  }
  function show(n, push){
    n = Math.max(0, Math.min(slides.length-1, n));
    if(n === idx && slides[n].classList.contains('active')) return;
    slides[idx].classList.remove('active');
    idx = n;
    var s = slides[idx];
    s.classList.add('active');
    if(window.__anim) window.__anim(s);
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
