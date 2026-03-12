import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'main.js',
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'path', 'url', 'electron-squirrel-startup'],
    },
    outDir: '.vite/build',
    minify: false,
  },
  resolve: {
    // Some libraries that use 'node_modules' may need this
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
