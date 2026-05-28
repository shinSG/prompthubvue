import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));
const serverPort = process.env.PORT ?? '3001';

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Allow importing React desktop components
          isCustomElement: () => false,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@desktop-renderer-app': path.resolve(
        __dirname,
        '../desktop/src/renderer/App.tsx',
      ),
      '@desktop-toast-provider': path.resolve(
        __dirname,
        '../desktop/src/renderer/components/ui/Toast.tsx',
      ),
      '@desktop-renderer-i18n': path.resolve(
        __dirname,
        'src/client/i18n.ts',
      ),
      '@desktop-renderer-globals-css': path.resolve(
        __dirname,
        '../desktop/src/renderer/styles/globals.css',
      ),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
      },
    },
  },
});
