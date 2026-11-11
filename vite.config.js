import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути сохраняют возможность публикации на GitHub Pages.
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
