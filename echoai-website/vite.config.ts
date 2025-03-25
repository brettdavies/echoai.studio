import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize build to better split code
    rollupOptions: {
      output: {
        // Chunk CSS and JS files to reduce initial page load size
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Optimize CSS by splitting it into smaller files
    cssCodeSplit: true,
    // Use esbuild for minification (default and faster)
    minify: 'esbuild',
  }
})
