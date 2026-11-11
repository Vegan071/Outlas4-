import { defineConfig } from 'vite';

export default defineConfig({
  // относительные пути — сборку можно выложить в любую папку / на GitHub Pages
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          yuka: ['yuka'],
        },
      },
    },
  },
});
