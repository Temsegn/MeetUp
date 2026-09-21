/** API / Socket.IO base URL. Empty string = same origin (nginx / compose proxy). */
export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:4001' : '');
