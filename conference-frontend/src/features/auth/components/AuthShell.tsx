import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';
import { SIGN_IN_PAGE_INSET } from '../constants/sign-in.constants';

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="samtal-light flex h-full min-h-0 w-full flex-col overflow-hidden bg-white font-sans text-auth-text">
    <div className="flex min-h-0 w-full flex-1 flex-col bg-white">{children}</div>
  </div>
);

export const AuthMain: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="grid min-h-0 flex-1 grid-cols-1 content-stretch items-stretch overflow-hidden lg:grid-cols-2">
    {children}
  </main>
);

export const AuthFooter: React.FC<{
  copyright: string;
  privacy: string;
  terms: string;
  /** Links-only strip (right panel). Default bar = full-width © left + links right. */
  variant?: 'bar' | 'panel';
}> = ({ copyright, privacy, terms, variant = 'bar' }) => {
  if (variant === 'panel') {
    return (
      <footer
        className={`flex w-full shrink-0 flex-wrap items-center justify-end gap-x-5 border-t border-[#E2E8F0] bg-white py-2.5 text-[11px] text-[#6E7B8E] ${SIGN_IN_PAGE_INSET}`}
      >
        <nav className="flex shrink-0 gap-5" aria-label="Legal">
          <a href="#privacy" className="whitespace-nowrap underline hover:text-[#0A182D]">
            {privacy}
          </a>
          <a href="#terms" className="whitespace-nowrap hover:text-[#0A182D] hover:underline">
            {terms}
          </a>
        </nav>
      </footer>
    );
  }

  return (
    <footer
      className={`relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] bg-white py-2.5 text-[11px] text-[#6E7B8E] ${SIGN_IN_PAGE_INSET}`}
    >
      <span className="whitespace-nowrap">{copyright}</span>
      <nav className="flex shrink-0 gap-5" aria-label="Legal">
        <a href="#privacy" className="whitespace-nowrap underline hover:text-[#0A182D]">
          {privacy}
        </a>
        <a href="#terms" className="whitespace-nowrap hover:text-[#0A182D] hover:underline">
          {terms}
        </a>
      </nav>
    </footer>
  );
};

/** Brand asset — samtal logo (sign-in / sign-up / forgot) */
export const AuthLogo: React.FC<{ to?: string; className?: string }> = ({
  to = '/',
  className,
}) => {
  const mark = (
    <img
      src="/auth/samtal-logo.png?v=2"
      alt="Samtal — Connect with us"
      className={cn(
        'block h-[clamp(2.75rem,6vh,3.75rem)] w-auto max-w-[min(14rem,85%)] object-contain object-left',
        className,
      )}
    />
  );

  if (!to) return mark;
  return (
    <Link to={to} className="mb-0 inline-flex self-start" aria-label="Samtal home">
      {mark}
    </Link>
  );
};
