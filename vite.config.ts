import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import path from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }

          if (
            id.includes('react-dnd') ||
            id.includes('dnd-core') ||
            id.includes('react-dnd-html5-backend') ||
            id.includes('/redux/')
          ) {
            return 'dnd-vendor';
          }

          if (id.includes('/date-fns/')) {
            return 'date-vendor';
          }

          if (id.includes('/lucide-react/')) {
            return 'icons-vendor';
          }

          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark-') ||
            id.includes('/mdast-') ||
            id.includes('/micromark') ||
            id.includes('/hast-') ||
            id.includes('/unist-') ||
            id.includes('/unified/') ||
            id.includes('/vfile/') ||
            id.includes('/property-information/') ||
            id.includes('/comma-separated-tokens/') ||
            id.includes('/space-separated-tokens/') ||
            id.includes('/decode-named-character-reference/')
          ) {
            return 'markdown-vendor';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
      },
      {
        entry: 'electron/plaid-link-preload.ts',
      },
    ]),
  ],
  server: {
    watch: {
      ignored: [
        '**/dist/**',
        '**/dist-electron/**',
        '**/release/**',
        '**/build/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
