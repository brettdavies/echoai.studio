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
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor'
          }
        },
      },
    },
    // Optimize CSS by splitting it into smaller files
    cssCodeSplit: true,
  }
})
