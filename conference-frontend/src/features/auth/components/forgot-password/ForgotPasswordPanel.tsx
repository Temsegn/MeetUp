import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { AuthLogo } from '../AuthShell';
import { AUTH_COPY } from '../../constants/auth.constants';
import type { FieldErrors, ForgotPasswordFormValues } from '../../schemas/auth.schemas';
import { BackArrowIcon, EmailIcon, SendIcon } from './ForgotPasswordIcons';

type Props = {
  values: ForgotPasswordFormValues;
  fieldErrors: FieldErrors;
  error: string;
  loading: boolean;
  sent: boolean;
  setField: <K extends keyof ForgotPasswordFormValues>(
    key: K,
    value: ForgotPasswordFormValues[K],
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const inputClass =
  'h-12 w-full rounded-[9px] border border-[#D9E0EA] bg-white pl-11 pr-3.5 text-[15px] tracking-[-0.17px] text-auth-text caret-brand-link outline-none shadow-[inset_0_0_0_1000px_#fff] [-webkit-text-fill-color:#1c2842] placeholder:text-auth-muted placeholder:[-webkit-text-fill-color:#62748e] transition-colors hover:border-slate-300 focus:border-brand-link';

export const ForgotPasswordPanel: React.FC<Props> = ({
  values,
  fieldErrors,
  error,
  loading,
  sent,
  setField,
  onSubmit,
}) => {
  const c = AUTH_COPY.forgot;

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col border-auth-border bg-white px-3.5 py-3.5 sm:px-5 sm:py-4 md:px-6 lg:border-r lg:py-6"
      aria-labelledby="forgot-heading"
    >
      <AuthLogo className="h-10 max-w-[12rem] sm:h-11 sm:max-w-[13rem]" />

      <div className="flex flex-1 items-center">
        <div className="w-full max-w-[492px] rounded-[15px] border border-[#E0E7EF] p-6 sm:p-9">
          <h1
            id="forgot-heading"
            className="m-0 text-[22px] font-bold leading-[35px] tracking-[-0.58px] text-auth-text sm:text-[26px]"
          >
            {c.title}
          </h1>
          <p className="mt-3 text-[15px] font-normal leading-[25px] tracking-[-0.17px] text-auth-muted">
            {c.subtitle}
          </p>

          {sent ? (
            <div className="mt-9">
              <div
                className="rounded-[9px] border border-brand-link/20 bg-brand-link/5 px-3.5 py-3 text-[15px] leading-[25px] text-auth-text"
                role="status"
              >
                <strong className="block font-semibold">{c.sentTitle}</strong>
                <p className="mt-2 mb-0">
                  {c.sentBodyPrefix} <strong>{values.email.trim()}</strong>
                  {c.sentBodySuffix}
                </p>
              </div>
              <div className="mt-7 flex justify-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 text-[15px] font-medium leading-[22px] tracking-[-0.17px] text-brand-link no-underline transition-opacity hover:opacity-80"
                >
                  <BackArrowIcon />
                  {c.back}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form className="mt-9" onSubmit={onSubmit} noValidate>
                {error ? (
                  <div
                    className="mb-4 rounded-[9px] border border-red-600/20 bg-red-600/10 px-3 py-2.5 text-[13px] leading-snug text-red-600"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}

                <label
                  htmlFor="forgot-email"
                  className="mb-2 block text-[15px] font-medium leading-[22px] tracking-[-0.17px] text-auth-text"
                >
                  {c.emailLabel}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2">
                    <EmailIcon />
                  </span>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={c.emailPlaceholder}
                    value={values.email}
                    onChange={(e) => setField('email', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'forgot-email-error' : undefined}
                    required
                    className={cn(inputClass, fieldErrors.email && 'border-red-600')}
                  />
                </div>
                {fieldErrors.email ? (
                  <p id="forgot-email-error" className="mt-1.5 text-[13px] text-red-600" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-brand-link text-[15px] font-semibold leading-[22px] tracking-[-0.17px] text-[#FAFCFE] transition-colors hover:bg-[#0059c4] active:bg-[#004ea8] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-link"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <SendIcon />}
                  {loading ? 'Sending…' : c.submit}
                </button>
              </form>

              <div className="mt-7 flex justify-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 text-[15px] font-medium leading-[22px] tracking-[-0.17px] text-brand-link no-underline transition-opacity hover:opacity-80"
                >
                  <BackArrowIcon />
                  {c.back}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
