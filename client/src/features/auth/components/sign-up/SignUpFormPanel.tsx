import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { AUTH_COPY } from '../../constants/auth.constants';
import type { FieldErrors, SignUpFormValues } from '../../schemas/auth.schemas';
import { SignUpForm } from './SignUpForm';

type Props = {
  values: SignUpFormValues;
  fieldErrors: FieldErrors;
  error: string;
  loading: boolean;
  showPassword: boolean;
  showConfirm: boolean;
  setField: <K extends keyof SignUpFormValues>(key: K, value: SignUpFormValues[K]) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: React.FormEvent) => void;
  pendingVerifyEmail: string | null;
  resendVerification: () => void;
  resendLoading: boolean;
  resendMessage: string;
};

/** Right form column — matches sign-in panel chrome (no logo, white column). */
export const SignUpFormPanel: React.FC<Props> = (props) => {
  const c = AUTH_COPY.signUp;
  const {
    pendingVerifyEmail,
    resendVerification,
    resendLoading,
    resendMessage,
    error,
  } = props;

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-white"
      aria-labelledby="signup-heading"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-8 py-10 sm:px-12 sm:py-12">
        <div className="flex w-full max-w-[24rem] flex-col items-center">
          {pendingVerifyEmail ? (
            <div className="w-full">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#E8F1FE] text-[#016BE6]">
                <Mail size={18} strokeWidth={1.75} aria-hidden />
              </div>
              <h2
                id="signup-heading"
                className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-[#0F172A]"
              >
                {c.verifyTitle}
              </h2>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[#64748B]">
                {c.verifyBodyPrefix}{' '}
                <span className="font-semibold text-[#0F172A]">{pendingVerifyEmail}</span>
                {c.verifyBodySuffix}
              </p>
              {error ? (
                <div
                  className="mt-3 rounded-lg border border-red-600/20 bg-red-600/10 px-3 py-2 text-[0.75rem] text-red-600"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              {resendMessage ? (
                <div
                  className="mt-3 rounded-lg border border-[#C7E7D4] bg-[#ECFDF3] px-3 py-2 text-[0.75rem] text-[#027A48]"
                  role="status"
                >
                  {resendMessage || c.verifyResent}
                </div>
              ) : null}
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendLoading}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white text-[0.875rem] font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-60"
              >
                {resendLoading ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : null}
                {c.verifyResend}
              </button>
              <Link
                to="/sign-in"
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[0.875rem] font-semibold text-white transition hover:bg-[#0059C4]"
              >
                {c.verifyGoSignIn}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 w-full text-center sm:text-left">
                <h2
                  id="signup-heading"
                  className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-[#0F172A]"
                >
                  {c.formTitle}
                </h2>
                <p className="mt-1.5 text-[0.875rem] leading-snug text-[#64748B]">
                  {c.hasAccount}{' '}
                  <Link to="/sign-in" className="font-semibold text-[#016BE6] hover:underline">
                    {c.signInLink}
                  </Link>
                </p>
              </div>
              <div className="w-full">
                <SignUpForm {...props} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
