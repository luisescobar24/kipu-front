import { defineConfig } from 'vite';

// Rutas relativas: funciona en usuario.github.io/repositorio/ y Cloudflare Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
