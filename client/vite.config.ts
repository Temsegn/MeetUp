import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CANONICAL_FRONTEND_URL = 'https://46.246.120.148:8981'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const frontendUrl = (env.VITE_FRONTEND_URL || CANONICAL_FRONTEND_URL).replace(/\/+$/, '')

  return {
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
      'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(frontendUrl),
    },
    server: {
      // Allow access from other devices on the network (for mobile testing)
      host: true,
    },
  }
})
