import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          if (id.includes('/src/features/')) {
            const match = id.match(/src\/features\/([^/]+)/);
            if (match?.[1]) {
              return `screen-${match[1]}`;
            }
          }

          if (id.includes('/src/game/') || id.includes('/src/data/')) {
            return 'game-core';
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
