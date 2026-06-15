import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es', 'umd'],
      name: 'AudioEQ',
      fileName: (format) => `audio-eq.${format}.js`,
    },
  },
  server: { open: '/examples/simple-demo/index.html' },
});
