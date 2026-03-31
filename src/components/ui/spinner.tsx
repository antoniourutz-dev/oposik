import * as React from 'react';
import { cn } from '../../lib/utils';

/** Spinner de marca (gradiente) para pantallas de carga y paneles. */
export function BrandSpinner({
  className,
  decorative = true,
  'aria-label': ariaLabel,
}: {
  className?: string;
  /** Si true, oculta del árbol de accesibilidad (cuando el texto visible describe la carga). */
  decorative?: boolean;
  'aria-label'?: string;
}) {
  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (ariaLabel ?? 'Cargando')}
      role={decorative ? undefined : 'status'}
      className={cn(
        'inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-[#d7e4fb] border-t-[#7cb6e8] border-r-[#8d93f2] shadow-[0_18px_30px_-22px_rgba(141,147,242,0.24)]',
        className,
      )}
    />
  );
}
