import React from 'react';
import { Link } from 'react-router-dom';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

export const SignUpPrompt: React.FC = () => (
  <p className="mt-6 flex w-full flex-wrap items-center justify-center gap-x-1.5 text-[0.875rem] text-[#64748B]">
    <span>{SIGN_IN_COPY.noAccount}</span>
    <Link
      className="font-semibold text-[#016BE6] hover:underline"
      to="/signup"
    >
      {SIGN_IN_COPY.signUp}
    </Link>
  </p>
);
