import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  base: './',
  server: { strictPort: true, host: '127.0.0.1', port: 5178 },
});
