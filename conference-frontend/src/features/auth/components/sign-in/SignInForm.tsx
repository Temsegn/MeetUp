import React from 'react';
import { Loader2 } from 'lucide-react';
import { EmailField } from './EmailField';
import { PasswordField } from './PasswordField';
import { RememberMeRow } from './RememberMeRow';
import { SignInButton } from './SignInButton';
import { SocialLoginButtons } from './SocialLoginButtons';
import { AUTH_COPY } from '../../constants/auth.constants';
import type { SignInFormValues, FieldErrors } from '../../schemas/auth.schemas';

type Props = {
  values: SignInFormValues;
  fieldErrors: FieldErrors;
  error: string;
  infoMessage?: string;
  loading: boolean;
  showPassword: boolean;
  setField: <K extends keyof SignInFormValues>(key: K, value: SignInFormValues[K]) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: React.FormEvent) => void;
  needsVerification?: boolean;
  resendVerification?: () => void;
  resendLoading?: boolean;
  resendMessage?: string;
};

export const SignInForm: React.FC<Props> = ({
  values,
  fieldErrors,
  error,
  infoMessage,
  loading,
  showPassword,
  setField,
  setShowPassword,
  onSubmit,
  needsVerification,
  resendVerification,
  resendLoading,
  resendMessage,
}) => (
  <form
    className="mt-0 flex w-full flex-col"
    onSubmit={onSubmit}
    noValidate
  >
    {infoMessage ? (
      <div
        className="mb-2 rounded-lg border border-[#C7E7D4] bg-[#ECFDF3] px-2.5 py-2 text-xs leading-snug text-[#027A48]"
        role="status"
      >
        {infoMessage}
      </div>
    ) : null}
    {resendMessage ? (
      <div
        className="mb-2 rounded-lg border border-[#C7E7D4] bg-[#ECFDF3] px-2.5 py-2 text-xs leading-snug text-[#027A48]"
        role="status"
      >
        {resendMessage}
      </div>
    ) : null}
    {error ? (
      <div
        className="mb-2 rounded-lg border border-red-600/20 bg-red-600/10 px-2.5 py-2 text-xs leading-snug text-red-600"
        role="alert"
      >
        <p className="m-0">{error}</p>
        {needsVerification && resendVerification ? (
          <button
            type="button"
            onClick={resendVerification}
            disabled={resendLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0056EF] underline-offset-2 hover:underline disabled:opacity-60"
          >
            {resendLoading ? (
              <Loader2 size={12} className="animate-spin" aria-hidden />
            ) : null}
            {AUTH_COPY.signIn.resendVerification}
          </button>
        ) : null}
      </div>
    ) : null}
    <EmailField
      value={values.email}
      error={fieldErrors.email}
      onChange={(v) => setField('email', v)}
    />
    <PasswordField
      value={values.password}
      error={fieldErrors.password}
      visible={showPassword}
      onChange={(v) => setField('password', v)}
      onToggleVisible={() => setShowPassword((v) => !v)}
    />
    <RememberMeRow
      checked={values.rememberMe}
      onChange={(v) => setField('rememberMe', v)}
    />
    <SignInButton loading={loading} />
    <SocialLoginButtons />
  </form>
);
