import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/gdpr': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Tối ưu chunk size
    chunkSizeWarningLimit: 1000, // Tăng limit từ 500KB lên 1000KB
    rollupOptions: {
      output: {
        // Manual chunks để tách vendor libraries
        manualChunks: {
          // Tách React và React DOM
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Tách Recharts (library lớn)
          'recharts': ['recharts']
        }
      }
    }
  }
})