import React, { Suspense, lazy } from 'react';
import ConfigurationErrorScreen from './components/screens/ConfigurationErrorScreen';
import { missingSupabaseEnvVars, supabaseConfigError } from './supabaseConfig';

const PracticeAppShell = lazy(() => import('./PracticeAppShell'));

const BootLoader: React.FC = () => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_45%,#f6f7fb_100%)] px-4">
    <div className="rounded-[1.8rem] border border-white/70 bg-white/86 px-6 py-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
      <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
      <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
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
