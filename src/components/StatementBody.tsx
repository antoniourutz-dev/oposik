import React from 'react';
import type { HighlightOverrideRecord } from '../domain/highlighting/highlightTypes';
import { HighlightedText } from './HighlightedText';

/** Resalta `**términos**` manualmente; si no hay marcadores, aplica resaltado inteligente (dominio legal ES). */
export function StatementBody({
  text,
  highlightEnabled = false,
  manualOverride = null,
}: {
  text: string;
  /** Si es false, desactiva el resaltado inteligente (texto plano). */
  highlightEnabled?: boolean;
  manualOverride?: HighlightOverrideRecord | null;
}) {
  if (!manualOverride && /\*\*[^*]+\*\*/.test(text)) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, i) => {
          const inner = /^\*\*([^*]+)\*\*$/.exec(part);
          if (inner) {
            if (!highlightEnabled) {
              return (
                <span key={i} className="font-semibold text-slate-900">
                  {inner[1]}
                </span>
              );
            }
            return (
              <span
                key={i}
                className="mx-0.5 inline rounded-md bg-violet-100/95 px-1.5 py-0.5 font-semibold text-violet-800 [box-decoration-break:clone] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
              >
                {inner[1]}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  return (
    <HighlightedText
      text={text}
      contentRole="question"
      manualOverride={manualOverride}
      disabled={!highlightEnabled}
    />
  );
}
