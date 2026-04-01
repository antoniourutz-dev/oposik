import React from 'react';

/** Resalta `**términos**` como chips (fondo lavanda); si no hay marcadores, el texto se muestra tal cual. */
export function StatementBody({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const inner = /^\*\*([^*]+)\*\*$/.exec(part);
        if (inner) {
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
