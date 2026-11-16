import React from 'react';
import { Link } from 'react-router-dom';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

/**
 * Sign-in header — Samtal logo (clickable → home) + concise heading.
 * No verbose subtitle on mobile; keeps the form focused.
 */
export const WelcomeHeader: React.FC = () => (
  <header className="mb-6 w-full text-center">
    <Link to="/" className="mb-4 inline-flex justify-center" aria-label="Samtal home">
      <img
        src="/auth/samtal-logo.png?v=4"
        alt="Samtal"
        className="h-10 w-auto object-contain"
      />
    </Link>
    <h1
      id="signin-heading"
      className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.03em] text-[#0F172A] sm:text-[1.75rem]"
    >
      {SIGN_IN_COPY.title}
    </h1>
  </header>
);
