import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { queryClient } from './queryClient';

const CHUNK_RELOAD_KEY = 'korrika_chunk_reload_attempted';

window.addEventListener('vite:preloadError', (event) => {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') {
    return;
  }

  event.preventDefault();
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});

window.setTimeout(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}, 10000);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  void import('./telemetry/telemetryClient').then(
    ({ initializeTelemetry, recordNavigation }) => {
      initializeTelemetry();
      window.requestAnimationFrame(() => {
        recordNavigation('app_rendered', {
          timeSinceLoadMs:
            typeof performance !== 'undefined' ? performance.now() : Date.now()
        });
      });
    }
  ).catch(() => undefined);

  void import('./telemetry/webVitals')
    .then(({ installWebVitalsObservers }) => {
      installWebVitalsObservers();
    })
    .catch(() => undefined);
}
