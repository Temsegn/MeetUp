import React from 'react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';
import { AUTH_ASSETS } from '../../constants/auth.assets';

const outlineBtn =
  'inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white text-[0.8125rem] font-semibold text-[#1C2842] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056EF]';

const disabledBtn = `${outlineBtn} cursor-not-allowed opacity-55`;

/** Social buttons shown; Google and Microsoft are disabled for now. Backend OAuth remains available. */
export const SocialLoginButtons: React.FC = () => (
  <div className="flex shrink-0 flex-col gap-2">
    <div
      className="my-2 mb-0 flex items-center gap-2 text-[0.75rem] text-[#62748E] before:h-px before:flex-1 before:bg-[#E2E8F0] after:h-px after:flex-1 after:bg-[#E2E8F0]"
      role="separator"
    >
      <span>{SIGN_IN_COPY.orContinue}</span>
    </div>
    <button type="button" disabled title="Google sign-in is temporarily unavailable" className={disabledBtn}>
      <img src={AUTH_ASSETS.google} alt="" width={14} height={14} className="block size-3.5" />
      {SIGN_IN_COPY.google}
    </button>
    <button type="button" disabled title="Microsoft sign-in coming soon" className={disabledBtn}>
      <img src={AUTH_ASSETS.microsoft} alt="" width={14} height={14} className="block size-3.5" />
      {SIGN_IN_COPY.microsoft}
    </button>
  </div>
);
