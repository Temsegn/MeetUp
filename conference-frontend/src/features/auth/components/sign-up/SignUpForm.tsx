import React from 'react';
import { Loader2 } from 'lucide-react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { AUTH_COPY } from '../../constants/auth.constants';
import type { FieldErrors, SignUpFormValues } from '../../schemas/auth.schemas';
import { SignUpPasswordField, SignUpTextField } from './SignUpFields';
import { SignUpTeamSizeSelect } from './SignUpTeamSizeSelect';
import { SignUpTermsRow } from './SignUpTermsRow';
import { SignUpSocialButtons } from './SignUpSocialButtons';

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
};

export const SignUpForm: React.FC<Props> = ({
  values,
  fieldErrors,
  error,
  loading,
  showPassword,
  showConfirm,
  setField,
  setShowPassword,
  setShowConfirm,
  onSubmit,
}) => {
  const c = AUTH_COPY.signUp;

  return (
    <form className="flex w-full flex-col gap-2" onSubmit={onSubmit} noValidate>
      {error ? (
        <div
          className="rounded-[8px] border border-red-600/20 bg-red-600/10 px-3 py-2 text-[0.75rem] text-red-600"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
        <SignUpTextField
          id="signup-first"
          label={c.firstNameLabel}
          placeholder={c.firstNamePlaceholder}
          autoComplete="given-name"
          value={values.firstName}
          error={fieldErrors.firstName}
          required
          iconSrc={AUTH_ASSETS.user}
          onChange={(v) => setField('firstName', v)}
        />
        <SignUpTextField
          id="signup-last"
          label={c.lastNameLabel}
          placeholder={c.lastNamePlaceholder}
          autoComplete="family-name"
          value={values.lastName}
          error={fieldErrors.lastName}
          required
          iconSrc={AUTH_ASSETS.user}
          onChange={(v) => setField('lastName', v)}
        />
      </div>

      <SignUpTextField
        id="signup-email"
        label={c.emailLabel}
        type="email"
        placeholder={c.emailPlaceholder}
        autoComplete="email"
        value={values.email}
        error={fieldErrors.email}
        required
        iconSrc={AUTH_ASSETS.email}
        onChange={(v) => setField('email', v)}
      />

      <SignUpPasswordField
        id="signup-password"
        label={c.passwordLabel}
        placeholder={c.passwordPlaceholder}
        autoComplete="new-password"
        value={values.password}
        error={fieldErrors.password}
        visible={showPassword}
        hint={c.passwordHint}
        required
        onChange={(v) => setField('password', v)}
        onToggleVisible={() => setShowPassword((v) => !v)}
      />

      <SignUpPasswordField
        id="signup-confirm"
        label={c.confirmLabel}
        placeholder={c.confirmPlaceholder}
        autoComplete="new-password"
        value={values.confirmPassword}
        error={fieldErrors.confirmPassword}
        visible={showConfirm}
        required
        onChange={(v) => setField('confirmPassword', v)}
        onToggleVisible={() => setShowConfirm((v) => !v)}
      />

      <SignUpTextField
        id="signup-company"
        label={c.companyLabel}
        placeholder={c.companyPlaceholder}
        autoComplete="organization"
        value={values.company}
        iconSrc={AUTH_ASSETS.building}
        onChange={(v) => setField('company', v)}
      />

      <SignUpTeamSizeSelect
        id="signup-team"
        value={values.teamSize}
        onChange={(v) => setField('teamSize', v)}
      />

      <SignUpTermsRow
        checked={values.acceptTerms}
        error={fieldErrors.acceptTerms}
        onChange={(v) => setField('acceptTerms', v)}
      />

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="mt-0.5 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-0 bg-[#0056EF] text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#0048c7] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056EF]"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <img
            src={AUTH_ASSETS.createAccount}
            alt=""
            width={14}
            height={14}
            className="block size-3.5"
            aria-hidden
          />
        )}
        {loading ? 'Creating account…' : c.submit}
      </button>

      <SignUpSocialButtons />
    </form>
  );
};
