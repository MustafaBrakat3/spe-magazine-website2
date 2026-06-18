import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        archive: resolve(__dirname, 'archive.html'),
        reader: resolve(__dirname, 'reader.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
