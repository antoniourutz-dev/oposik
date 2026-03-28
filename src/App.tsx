import React, { Suspense, lazy } from 'react';
import ConfigurationErrorScreen from './components/screens/ConfigurationErrorScreen';
import { missingSupabaseEnvVars, supabaseConfigError } from './supabaseConfig';

const PracticeAppShell = lazy(() => import('./PracticeAppShell'));

const BootLoader: React.FC = () => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_12%_0%,rgba(124,182,232,0.18),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(141,147,242,0.2),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(194,223,255,0.16),transparent_28%),linear-gradient(180deg,#f4f8ff_0%,#f7faff_34%,#edf4ff_100%)] px-4">
    <div className="relative overflow-hidden rounded-[1.9rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-6 py-8 text-center shadow-[0_28px_70px_-40px_rgba(141,147,242,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_38%)]" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4fb] bg-white/86 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.18)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)]" />
          Oposik
        </span>
        <span className="mx-auto mt-5 block h-12 w-12 animate-spin rounded-full border-[3px] border-[#d7e4fb] border-t-[#7cb6e8] border-r-[#8d93f2] shadow-[0_18px_30px_-22px_rgba(141,147,242,0.24)]" />
      </div>
      <p className="relative mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-600">
        Cargando aplicacion
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  if (supabaseConfigError) {
    return <ConfigurationErrorScreen missingVars={missingSupabaseEnvVars} />;
  }

  return (
    <Suspense fallback={<BootLoader />}>
      <PracticeAppShell />
    </Suspense>
  );
};

export default App;
