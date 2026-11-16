import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MEDIAPIPE_WASM_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'node_modules/@mediapipe/tasks-vision/wasm',
)

/**
 * Self-host the MediaPipe wasm runtime at /mediapipe/wasm/* (virtual background).
 * Dev: served straight from node_modules. Build: emitted into dist, so the version
 * always matches the installed @mediapipe/tasks-vision and nothing is committed.
 */
function mediapipeWasm(): Plugin {
  const files = () => fs.readdirSync(MEDIAPIPE_WASM_DIR).filter((f) => /\.(js|wasm)$/.test(f))
  return {
    name: 'samtal-mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use('/mediapipe/wasm', (req, res, next) => {
        const name = path.basename((req.url ?? '').split('?')[0])
        if (!files().includes(name)) return next()
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(path.join(MEDIAPIPE_WASM_DIR, name)).pipe(res)
      })
    },
    generateBundle() {
      for (const name of files()) {
        this.emitFile({
          type: 'asset',
          fileName: `mediapipe/wasm/${name}`,
          source: fs.readFileSync(path.join(MEDIAPIPE_WASM_DIR, name)),
        })
      }
    },
  }
}

const CANONICAL_FRONTEND_URL = 'http://46.246.120.148:8980'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const frontendUrl = (env.VITE_FRONTEND_URL || CANONICAL_FRONTEND_URL).replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      mediapipeWasm(),
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
