import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ── Service Worker Registration ───────────────────────────────────────────────
// Only register in production builds over HTTPS (or localhost for dev).
// The SW lives at /sw.js (public/) so it has full scope over the app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.info('[PWA] Service worker registered:', registration.scope)
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[PWA] Service worker registration failed:', err)
        }
      })
  })
}
