import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GoogleDocsConverter',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['cheerio', 'marked'],
      output: {
        exports: 'named'
      },
    },
    sourcemap: true,
    outDir: 'dist',
  },
});