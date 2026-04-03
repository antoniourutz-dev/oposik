import React from 'react';
import {
  HIGHLIGHT_CATEGORIES,
  type HighlightCategory,
} from '../../domain/highlighting/highlightTypes';
import { cn } from '../../lib/utils';

const CATEGORY_LABELS: Record<HighlightCategory, string> = {
  legal_reference: 'Referencia legal',
  core_concept: 'Concepto clave',
  negation: 'Negacion',
  condition: 'Condicion',
  deadline: 'Plazo',
  subject: 'Sujeto',
  differentiator: 'Diferenciador',
};

const CATEGORY_BUTTON_CLASSES: Record<HighlightCategory, string> = {
  legal_reference: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
  core_concept: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
  negation: 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
  condition: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
  deadline: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  subject: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  differentiator: 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200',
};

type HighlightCategoryPickerProps = {
  value: HighlightCategory;
  onChange: (value: HighlightCategory) => void;
  disabled?: boolean;
  className?: string;
};

export function HighlightCategoryPicker({
  value,
  onChange,
  disabled = false,
  className,
}: HighlightCategoryPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {HIGHLIGHT_CATEGORIES.map((category) => {
        const isActive = category === value;

        return (
          <button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => onChange(category)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors',
              CATEGORY_BUTTON_CLASSES[category],
              isActive ? 'ring-2 ring-slate-900/10 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.3)]' : '',
              disabled ? 'cursor-not-allowed opacity-45' : '',
            )}
          >
            {CATEGORY_LABELS[category]}
          </button>
        );
      })}
    </div>
  );
}

