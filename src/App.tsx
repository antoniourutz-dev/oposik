import React, { Suspense, lazy } from 'react';
import ConfigurationErrorScreen from './components/screens/ConfigurationErrorScreen';
import { AppLoadingSurface } from './components/ui/app-loading-surface';
import { missingSupabaseEnvVars, supabaseConfigError } from './supabaseConfig';

const PracticeAppShell = lazy(() => import('./PracticeAppShell'));

const App: React.FC = () => {
  if (supabaseConfigError) {
    return <ConfigurationErrorScreen missingVars={missingSupabaseEnvVars} />;
  }

  return (
    <Suspense fallback={<AppLoadingSurface />}>
      <PracticeAppShell />
    </Suspense>
  );
};

export default App;
