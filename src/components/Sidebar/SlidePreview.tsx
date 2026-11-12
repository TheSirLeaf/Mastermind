// Miniatura de um slide: um iframe com a apresentação real de um único slide.
import { buildPresentationHTML, loadTemplate } from '@packages/core/export';
import { registry } from '@packages/core/PackageRegistry';
import type { Deck } from '@packages/core/types';
import { useEffect, useState } from 'react';

const HIDE_CHROME =
  '<style>.hint,.progress,.notes-panel,.lightbox,#bar{display:none!important}</style></head>';

interface SlidePreviewProps {
  deck: Deck;
  title: string;
  className?: string;
}

export function SlidePreview({ deck, title, className }: SlidePreviewProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTemplate()
      .then((template) => {
        if (cancelled) return;
        setHtml(
          buildPresentationHTML({ template, deck, registry }).replace('</head>', HIDE_CHROME)
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [deck]);

  return (
    <div className={`relative aspect-video overflow-hidden bg-black ${className ?? ''}`}>
      {html ? (
        <iframe
          title={title}
          srcDoc={html}
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
        />
      ) : null}
    </div>
  );
}
