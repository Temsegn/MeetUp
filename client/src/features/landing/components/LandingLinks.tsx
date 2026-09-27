import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { frontendUrl } from '../../../lib/frontendUrl';

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

/** Workspace entry uses the configured public frontend origin. */
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
    <a href={frontendUrl('/app')} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
