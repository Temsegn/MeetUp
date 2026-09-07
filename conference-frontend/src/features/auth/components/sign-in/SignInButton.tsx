import React from 'react';
import { Loader2 } from 'lucide-react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

type Props = {
  loading: boolean;
};

export const SignInButton: React.FC<Props> = ({ loading }) => (
  <button
    type="submit"
    disabled={loading}
    aria-busy={loading}
    className="inline-flex h-9 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-0 bg-[#0056EF] text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#0048c7] active:bg-[#003fae] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056EF]"
  >
    {loading ? (
      <Loader2 size={14} className="animate-spin" aria-hidden />
    ) : (
      <img src={AUTH_ASSETS.signIn} alt="" width={14} height={14} className="block size-3.5" aria-hidden />
    )}
    {loading ? SIGN_IN_COPY.submitting : SIGN_IN_COPY.submit}
  </button>
);
