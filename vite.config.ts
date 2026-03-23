import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':   ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf':      ['jspdf'],
          'vendor-google':   ['@google/generative-ai'],
        },
      },
    },
  },
});
