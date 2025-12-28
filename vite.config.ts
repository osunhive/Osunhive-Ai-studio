import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows your code to use process.env.API_KEY 
    // It will pull from the environment variables you set in Netlify
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
