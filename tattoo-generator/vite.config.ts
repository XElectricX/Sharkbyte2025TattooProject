import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API requests to the FastAPI backend during development so
    // the frontend can use relative paths like `/generate-tattoo/`.
    proxy: {
      '/generate-tattoo': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Also proxy static assets if your backend serves them under /static
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/alter-tattoo': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
})
