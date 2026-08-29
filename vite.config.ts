import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 支持 GitHub Pages (/Q-profile/) 与本地开发(/)自适应
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/Q-profile/' : '/'),
});
