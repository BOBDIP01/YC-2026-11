import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { fileURLToPath } from 'url';

export default defineConfig(() => {
  return {
    // Only allow non-sensitive public URL origin variables (VITE_PUBLIC_*) in client bundles;
    // all API keys (GEMINI_API_KEY, REVENUECAT_WEBHOOK_AUTH_SECRET, VITE_FIREBASE_*, VITE_REVENUECAT_*) stay on the backend server.
    envPrefix: ['VITE_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      hmr: true,
    },
    build: {
      chunkSizeWarningLimit: 2500,
      sourcemap: false,
    },
  };
});
