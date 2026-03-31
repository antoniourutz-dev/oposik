import * as React from 'react';
import { APP_DISPLAY_NAME } from '../../appMeta';
import { BrandSpinner } from './spinner';

type AppLoadingSurfaceProps = {
  label: string;
  /** Texto accesible distinto del visible */
  ariaLabel?: string;
};

/**
 * Superficie de carga pantalla completa: mismo patrón en App, PracticeAppShell y Suspense.
 */
export function AppLoadingSurface({ label, ariaLabel }: AppLoadingSurfaceProps) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_12%_0%,rgba(124,182,232,0.18),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(141,147,242,0.2),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(194,223,255,0.16),transparent_28%),linear-gradient(180deg,#f4f8ff_0%,#f7faff_34%,#edf4ff_100%)] px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel ?? label}
    >
      <div className="relative overflow-hidden rounded-[1.9rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-6 py-8 text-center shadow-[0_28px_70px_-40px_rgba(141,147,242,0.24)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_38%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4fb] bg-white/86 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
            <span className="h-1.5 w-1.5 rounded-full quantia-bg-gradient" />
            {APP_DISPLAY_NAME}
          </span>
          <div className="mx-auto mt-5 flex justify-center">
            <BrandSpinner decorative />
          </div>
        </div>
        <p className="relative mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-600">
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Banner no bloqueante mientras llegan cuenta o catálogo (el shell ya es visible).
 */
export function CatalogSyncBanner({
  syncingAccount,
  loadingCatalog,
}: {
  syncingAccount: boolean;
  loadingCatalog: boolean;
}) {
  if (!syncingAccount && !loadingCatalog) return null;
  const label = syncingAccount ? 'Sincronizando cuenta…' : 'Cargando catálogo de preguntas…';
  return (
    <div
      className="mx-auto mb-3 w-full max-w-4xl rounded-[1rem] border border-sky-200/85 bg-[linear-gradient(180deg,rgba(240,249,255,0.95),rgba(236,254,255,0.88))] px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-sky-900 shadow-[0_12px_28px_-22px_rgba(14,165,233,0.35)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label}
    </div>
  );
}

/** Panel de carga dentro del shell (p. ej. banco de preguntas) — misma familia visual que AppLoadingSurface. */
export function InlineLoadingPanel({ label }: { label: string }) {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative w-full overflow-hidden p-8 text-center ui-surface-solid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.08),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.04),transparent_38%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4fb] bg-white/86 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
            <span className="h-1.5 w-1.5 rounded-full quantia-bg-gradient" />
            {APP_DISPLAY_NAME}
          </span>
        </div>
        <div className="relative mx-auto mt-5 flex justify-center">
          <BrandSpinner decorative className="h-16 w-16 border-2" />
        </div>
        <p className="relative mt-5 text-sm font-black uppercase tracking-[0.18em] text-slate-600">{label}</p>
      </div>
    </div>
  );
}
