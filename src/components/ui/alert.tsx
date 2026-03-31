import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const variantStyles: Record<AlertVariant, { wrap: string; icon: React.ReactNode; title: string }> = {
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: <Info className="h-4 w-4 text-sky-500" aria-hidden="true" />,
    title: 'Información',
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />,
    title: 'Listo',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <TriangleAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />,
    title: 'Atención',
  },
  error: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />,
    title: 'Error',
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  'aria-live': ariaLive = variant === 'error' ? 'assertive' : 'polite',
}: React.PropsWithChildren<{
  variant?: AlertVariant;
  title?: string;
  className?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}>) {
  const v = variantStyles[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={ariaLive}
      className={cn(
        'flex w-full items-start gap-3 rounded-[1.2rem] border px-4 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.12)]',
        v.wrap,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{v.icon}</span>
      <div className="min-w-0">
        <p className="ui-label text-[9px] text-current/70">{title ?? v.title}</p>
        <div className="mt-1 text-sm font-semibold leading-6 text-current/90">{children}</div>
      </div>
    </div>
  );
}

