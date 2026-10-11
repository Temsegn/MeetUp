import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

export const WelcomeHeader: React.FC = () => (
  <header className="mb-7 mt-7 w-full text-center">
    <h1
      id="signin-heading"
      className="m-0 text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-[#0F172A] sm:text-[1.95rem]"
    >
      {SIGN_IN_COPY.title}
    </h1>
    <p className="mt-2 text-[0.9375rem] leading-snug text-[#64748B]">
      {SIGN_IN_COPY.subtitle}
    </p>
  </header>
);
