import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001' // This sends any fetch starting with /api to your server
    },
    open: true, // This opens the browser automatically
    port: 5173,
  },

})
