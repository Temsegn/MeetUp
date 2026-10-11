import React from 'react';
import { Loader2 } from 'lucide-react';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

type Props = {
  loading: boolean;
};

export const SignInButton: React.FC<Props> = ({ loading }) => (
  <button
    type="submit"
    disabled={loading}
    aria-busy={loading}
    className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#016BE6] text-[0.9375rem] font-semibold text-white transition-colors hover:bg-[#0059C4] active:bg-[#004BA8] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BE6]"
  >
    {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
    {loading ? SIGN_IN_COPY.submitting : SIGN_IN_COPY.submit}
  </button>
);
