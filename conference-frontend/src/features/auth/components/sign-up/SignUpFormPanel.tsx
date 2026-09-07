import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
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

/**
 * Right column — floating rounded white form card with top/bottom inset.
 */
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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent"
      aria-labelledby="signup-heading"
    >
      <div className="flex h-full w-full flex-1 items-stretch justify-center px-4 py-4 sm:px-6 sm:py-5 lg:justify-end lg:py-5 lg:pr-8 lg:pl-2 xl:pr-10 xl:py-6">
        <div className="flex h-full w-full max-w-[34rem] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white px-6 py-4 shadow-[0_18px_48px_-16px_rgba(28,40,66,0.22)] sm:px-8 sm:py-5 lg:max-w-[36rem] lg:px-9 lg:py-6">
          <div className="mb-2 shrink-0 lg:hidden">
            <Link to="/" className="inline-flex" aria-label="Samtal home">
              <img
                src={AUTH_ASSETS.signUpLogo}
                alt="Samtal — Connect with us"
                className="block h-8 w-auto max-w-[10.5rem] object-contain object-left"
              />
            </Link>
          </div>

          {pendingVerifyEmail ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#E8F1FE] text-[#0056EF]">
                <Mail size={18} strokeWidth={1.75} aria-hidden />
              </div>
              <h2
                id="signup-heading"
                className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-[#161E35]"
              >
                {c.verifyTitle}
              </h2>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[rgba(22,30,53,0.7)]">
                {c.verifyBodyPrefix}{' '}
                <span className="font-semibold text-[#161E35]">{pendingVerifyEmail}</span>
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
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E2E8F0] bg-white text-[0.875rem] font-semibold text-[#161E35] transition hover:bg-[#F7F9FC] disabled:opacity-60"
              >
                {resendLoading ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : null}
                {c.verifyResend}
              </button>
              <Link
                to="/auth"
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#0056EF] text-[0.875rem] font-semibold text-white transition hover:bg-[#0048c7]"
              >
                {c.verifyGoSignIn}
              </Link>
            </div>
          ) : (
            <>
              <div className="shrink-0">
                <h2
                  id="signup-heading"
                  className="m-0 text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-[#161E35]"
                >
                  {c.formTitle}
                </h2>
                <p className="mt-1 mb-3 text-[0.875rem] leading-snug text-[rgba(22,30,53,0.7)]">
                  {c.hasAccount}{' '}
                  <Link to="/auth" className="font-semibold text-[#0056EF] hover:underline">
                    {c.signInLink}
                  </Link>
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
                <SignUpForm {...props} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
