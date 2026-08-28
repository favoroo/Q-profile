import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 纯静态 SPA，base 固定 '/'，EdgeOne Pages 根目录部署时开箱即用
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
});
