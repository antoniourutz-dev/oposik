
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
    <App />
  </React.StrictMode>
);
