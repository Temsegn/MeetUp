/**
 * Compatibility barrel — the meetings/recordings modules and the socket
 * layer import `authenticate` / `AuthRequest` from '../auth/auth.middleware'.
 */
export { authenticate } from './middleware/authenticate.middleware';
export { optionalAuth } from './middleware/optional-auth.middleware';
export type { AuthRequest } from './auth.types';
