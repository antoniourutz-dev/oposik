import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const pwaManifest = {
  name: 'Oposik',
  short_name: 'Oposik',
  description: 'Practica oposiciones por bloques de 10 preguntas con estadisticas y repaso de errores.',
  start_url: '/',
  display: 'standalone' as const,
  background_color: '#f8fafc',
  theme_color: '#0f172a',
  orientation: 'portrait' as const,
  lang: 'es',
  icons: [
    {
      src: '/korrika_icon_set/icon_192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/korrika_icon_set/icon_512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
};

const devManifestPlugin = () => ({
  name: 'dev-manifest-webmanifest',
  apply: 'serve' as const,
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/manifest.webmanifest')) {
        next();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.end(JSON.stringify(pwaManifest));
    });
  }
});

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  plugins: [
    tailwindcss(),
    react(),
    devManifestPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}']
      },
      manifest: pwaManifest,
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
