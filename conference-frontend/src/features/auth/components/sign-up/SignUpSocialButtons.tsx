import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { AUTH_COPY } from '../../constants/auth.constants';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

function startGoogleAuth() {
  window.location.assign(`${API_URL}/auth/google`);
}

/** Google OAuth starts on the API; Microsoft remains unavailable. */
export const SignUpSocialButtons: React.FC = () => {
  const c = AUTH_COPY.signUp;

  return (
    <div>
      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E2E8F0]" />
        <span className="text-[0.6875rem] text-[#62748E]">{c.orContinue}</span>
        <div className="h-px flex-1 bg-[#E2E8F0]" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={startGoogleAuth}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-3 text-[0.75rem] font-medium text-[#1C2842] transition-colors hover:bg-slate-50"
        >
          <img src={AUTH_ASSETS.google} alt="" width={14} height={14} className="block size-3.5" />
          {c.google}
        </button>
        <button
          type="button"
          disabled
          title="Microsoft sign-up coming soon"
          className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-3 text-[0.75rem] font-medium text-[#1C2842] opacity-55"
        >
          <img src={AUTH_ASSETS.microsoft} alt="" width={14} height={14} className="block size-3.5" />
          {c.microsoft}
        </button>
      </div>
    </div>
  );
};
