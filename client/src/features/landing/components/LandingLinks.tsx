import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** In-SPA auth routes — never hardcode a host. */
export function AuthLink({
  to,
  className,
  children,
  onClick,
}: {
  to: '/auth' | '/auth/sign-up';
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

/**
 * Workspace entry stays on the current origin (React Router).
 * Absolute `frontendUrl('/app')` breaks when VITE_FRONTEND_URL ≠ the live
 * host (Chrome shows about:blank#blocked for http→https / wrong-host jumps).
 */
export function AppEntryLink({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link to="/app" className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
