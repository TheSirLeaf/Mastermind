// Monta o HTML autônomo da apresentação para rodar dentro de um iframe do app.
import { buildPresentationHTML, loadTemplate } from '@packages/core/export';
import { registry } from '@packages/core/PackageRegistry';
import type { Deck } from '@packages/core/types';

/**
 * Roda dentro da apresentação: leva o foco para o documento (as setas funcionam
 * sem clicar antes) e avisa o editor quando o usuário aperta Esc.
 */
export const FRAME_SCRIPT = `<script>(function(){
  try{window.focus()}catch(e){}
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){try{parent.postMessage({__mm:'present-exit'},'*')}catch(x){}}
  },true);
})()</script>`;

/** HTML do deck começando no slide `startIndex` (0 = primeiro). */
export async function buildFrameHTML(
  deck: Deck,
  startIndex: number,
  options: { escapeExit?: boolean } = {}
): Promise<string> {
  const template = await loadTemplate();
  const start = Math.min(Math.max(0, startIndex), Math.max(0, deck.slides.length - 1)) + 1;
  const extra = options.escapeExit === false ? '' : FRAME_SCRIPT;
  return buildPresentationHTML({ template, deck, registry }).replace(
    '</body>',
    `<script>try{location.hash='#${start}'}catch(e){}</script>${extra}</body>`
  );
}
