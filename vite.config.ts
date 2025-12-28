import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel will inject process.env.API_KEY during the build process
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});