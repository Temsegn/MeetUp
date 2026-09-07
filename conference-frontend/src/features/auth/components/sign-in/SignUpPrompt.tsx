import React from 'react';
import { Link } from 'react-router-dom';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

export const SignUpPrompt: React.FC = () => (
  <p className="mt-3 flex w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-left text-[0.75rem] text-[#62748E]">
    <span>{SIGN_IN_COPY.noAccount}</span>
    <Link
      className="inline-flex shrink-0 rounded-[8px] bg-[#e8f1fe] px-2 py-0.5 text-[0.75rem] font-semibold text-[#0056EF] hover:underline"
      to="/auth/sign-up"
    >
      {SIGN_IN_COPY.signUp}
    </Link>
  </p>
);
