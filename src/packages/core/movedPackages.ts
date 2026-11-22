import type { PackageRegistry } from './PackageRegistry';
import type { Slide } from './types';

/**
 * Pacotes que deixaram de ser elemento e viraram transição (`movedToTransition`): o elemento
 * antigo sai do slide e o slide passa a usar a transição, com o mesmo spec. Slides sem esses
 * elementos voltam inalterados (o mesmo objeto).
 */
export function migrateMovedPackages(slides: Slide[], registry: PackageRegistry): Slide[] {
  const moved = registry.list().filter((def) => def.movedToTransition);
  if (!moved.length) return slides;
  let changed = false;
  const out = slides.map((slide) => {
    const hits = moved.filter((def) => slide.html.includes(`data-pkg="${def.id}"`));
    if (!hits.length) return slide;
    const section = new DOMParser().parseFromString(slide.html, 'text/html').body.firstElementChild;
    if (!section) return slide;
    let touched = false;
    for (const def of hits) {
      const elements = Array.from(section.querySelectorAll(`[data-pkg="${def.id}"]`));
      if (!elements.length) continue;
      const first = elements[0];
      let spec: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(first?.getAttribute('data-spec') ?? '{}');
        if (parsed && typeof parsed === 'object') spec = parsed as Record<string, unknown>;
      } catch {
        // spec ilegível: a transição usa os padrões
      }
      elements.forEach((el) => el.remove());
      section.setAttribute('data-transition', `pkg:${def.id}:${def.movedToTransition}`);
      if (Object.keys(spec).length)
        section.setAttribute('data-transition-spec', JSON.stringify(spec));
      else section.removeAttribute('data-transition-spec');
      touched = true;
    }
    if (!touched) return slide;
    changed = true;
    return { ...slide, html: section.outerHTML };
  });
  return changed ? out : slides;
}
