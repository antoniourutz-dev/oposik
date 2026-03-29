import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const pwaManifest = {
  name: 'Oposik',
  short_name: 'Oposik',
  description: 'Practica oposiciones por bloques de 20 preguntas con estadisticas y repaso de errores.',
  start_url: '/',
  display: 'standalone' as const,
  background_color: '#f8fafc',
  theme_color: '#0f172a',
  orientation: 'portrait' as const,
  lang: 'es',
  icons: [
    {
      src: '/minimal_dark_192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/minimal_dark_512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: [
          'assets/AdminConsoleScreen-*.js',
          'assets/DashboardProfileTab-*.js',
          'assets/DashboardStatsTab-*.js',
          'assets/DashboardStudyTab-*.js',
          'assets/QuestionExplanation-*.js',
          'assets/practiceSessionStarterCommands-*.js',
          'assets/telemetryClient-*.js',
          'assets/webVitals-*.js',
          'assets/react-dom-*.js',
          'assets/supabase-*.js',
          'minimal_dark_1024.png',
          'minimal_dark_512.png'
        ]
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
          'react-dom': ['react', 'react-dom', 'react-dom/client'],
          icons: ['lucide-react'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
