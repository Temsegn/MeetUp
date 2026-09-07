import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';
import { AUTH_ASSETS } from '../../constants/auth.assets';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

const outlineBtn =
  'inline-flex h-9 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white text-[0.8125rem] font-semibold text-[#1C2842] transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056EF]';

function startGoogleAuth() {
  window.location.assign(`${API_URL}/auth/google`);
}

/** Google OAuth via full-page redirect; Microsoft coming soon. */
export const SocialLoginButtons: React.FC = () => (
  <div className="flex shrink-0 flex-col gap-2">
    <div
      className="my-2 mb-0 flex items-center gap-2 text-[0.75rem] text-[#62748E] before:h-px before:flex-1 before:bg-[#E2E8F0] after:h-px after:flex-1 after:bg-[#E2E8F0]"
      role="separator"
    >
      <span>{SIGN_IN_COPY.orContinue}</span>
    </div>
    <button type="button" className={outlineBtn} onClick={startGoogleAuth}>
      <img src={AUTH_ASSETS.google} alt="" width={14} height={14} className="block size-3.5" />
      {SIGN_IN_COPY.google}
    </button>
    <button
      type="button"
      disabled
      title="Microsoft sign-in coming soon"
      className={`${outlineBtn} cursor-not-allowed opacity-55`}
    >
      <img src={AUTH_ASSETS.microsoft} alt="" width={14} height={14} className="block size-3.5" />
      {SIGN_IN_COPY.microsoft}
    </button>
  </div>
);
