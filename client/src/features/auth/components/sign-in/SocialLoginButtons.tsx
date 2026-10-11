import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';
import { AUTH_ASSETS } from '../../constants/auth.assets';

const outlineBtn =
  'inline-flex h-11 w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[0.9375rem] font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BE6] disabled:cursor-not-allowed disabled:opacity-55';

/** Google social button — matches login mock (Microsoft hidden for visual parity). */
export const SocialLoginButtons: React.FC = () => (
  <div className="flex shrink-0 flex-col">
    <div
      className="my-5 flex items-center gap-3 text-[0.8125rem] text-[#94A3B8] before:h-px before:flex-1 before:bg-[#E2E8F0] after:h-px after:flex-1 after:bg-[#E2E8F0]"
      role="separator"
    >
      <span>{SIGN_IN_COPY.orContinue}</span>
    </div>
    <button type="button" disabled title="Google sign-in is temporarily unavailable" className={outlineBtn}>
      <img src={AUTH_ASSETS.google} alt="" width={18} height={18} className="block size-[18px]" />
      {SIGN_IN_COPY.google}
    </button>
  </div>
);
