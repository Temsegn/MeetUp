import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

export const WelcomeHeader: React.FC = () => (
  <header className="mb-4 w-full">
    <h1
      id="signin-heading"
      className="m-0 text-[1.35rem] font-extrabold leading-tight tracking-[-0.02em] text-[#1C2842]"
    >
      {SIGN_IN_COPY.title}
    </h1>
    <p className="mt-1 text-[0.8125rem] leading-snug text-[#62748E]">{SIGN_IN_COPY.subtitle}</p>
  </header>
);
