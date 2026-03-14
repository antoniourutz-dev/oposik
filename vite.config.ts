import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // Temporary recovery mode: replace stale deployed service workers and clear old caches.
      selfDestroying: true,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: "KORRIKA - 11 Eguneko Erronka",
        short_name: "KORRIKA",
        description: "Euskararen aldeko lasterketari buruzko galdetegi interaktiboa.",
        start_url: "/",
        display: "standalone",
        background_color: "#e91e63",
        theme_color: "#e91e63",
        orientation: "portrait",
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23e91e63%22 rx=%2220%22/><text y=%22.9em%22 x=%2250%%22 text-anchor=%22middle%22 font-size=%2270%22>🏃‍♀️</text></svg>",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23e91e63%22 rx=%2220%22/><text y=%22.9em%22 x=%2250%%22 text-anchor=%22middle%22 font-size=%2270%22>🏃‍♀️</text></svg>",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
