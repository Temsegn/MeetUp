import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

export const WelcomeHeader: React.FC = () => (
  <header className="mb-5 w-full">
    <h1
      id="signin-heading"
      className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.03em] text-[#0F172A] sm:text-[1.65rem]"
    >
      {SIGN_IN_COPY.title}
    </h1>
    <p className="mt-1.5 max-w-[22rem] text-[0.875rem] leading-snug text-[#64748B]">
      {SIGN_IN_COPY.subtitle}
    </p>
  </header>
);
