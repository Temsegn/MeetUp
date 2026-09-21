import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // Excalidraw ships ESM that Vite should pre-bundle for the meeting whiteboard
    include: ['@excalidraw/excalidraw'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  define: {
    // Excalidraw references process.env in some builds
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  server: {
    // Allow access from other devices on the network (for mobile testing)
    host: true,
  },
})
