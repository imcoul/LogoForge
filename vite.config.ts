import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  loadEnv(mode, '.', '');
  return {
    build: {
      // The initial chunk is the mobile-first bottleneck: the measured baseline was a single
      // 572 kB gzip bundle giving a 15 s first contentful paint on a throttled phone. Keep
      // this limit low enough that a regression is noticed rather than warned about once.
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          /*
           * Vendor splitting. Route- and feature-level splitting happens via React.lazy in
           * the app itself; this separates the large third-party dependencies so they cache
           * independently of application code and do not all land in the entry chunk.
           */
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
            'vendor-i18n': ['i18next', 'react-i18next'],
            'vendor-markdown': ['react-markdown'],
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
        },
        manifest: {
          name: 'Forgel',
          short_name: 'Forgel',
          description: 'AI-powered brand identity operating system',
          theme_color: '#6366f1',
          background_color: '#ffffff',
          // Required for the browser to treat the app as installable.
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'any',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        }
      })
    ],
    // NOTE: `process.env.GEMINI_API_KEY` was previously defined here, which would inline the
    // key into the client bundle for any client-side reference to that name. The key is
    // server-side only (src/server/geminiRouter.ts); the define has been removed so it cannot
    // leak by accident.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
