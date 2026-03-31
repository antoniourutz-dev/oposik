import * as React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './card';
import { Skeleton, SkeletonText } from './skeleton';

type LoadingCardProps = {
  className?: string;
  /** Número de filas de texto placeholder */
  lines?: number;
  /** Mostrar rejilla de “métricas” tipo dashboard */
  metricSlots?: number;
  /** Bloque alto tipo gráfico / visualización */
  chartSlot?: boolean;
};

/**
 * Bloque de carga alineado con Card/superficies: útil en dashboard y paneles diferidos.
 */
export function LoadingCard({ className, lines = 3, metricSlots = 0, chartSlot = false }: LoadingCardProps) {
  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <div role="status" aria-live="polite" aria-busy="true" className="space-y-5">
        <SkeletonText lines={lines} />
        {metricSlots > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: metricSlots }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] rounded-[1.1rem]" />
            ))}
          </div>
        ) : null}
        {chartSlot ? <Skeleton className="h-40 w-full rounded-[1.25rem]" /> : null}
      </div>
    </Card>
  );
}
