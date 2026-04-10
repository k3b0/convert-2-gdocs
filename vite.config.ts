import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      exclude: ['src/**/*.test.ts', 'src/test/**'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GoogleDocsConverter',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['cheerio'],
      output: {
        exports: 'named'
      },
    },
    sourcemap: false,
    outDir: 'dist',
  },
});