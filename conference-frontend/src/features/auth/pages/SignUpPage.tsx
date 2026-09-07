import React from 'react';
import { SignUpPromoPanel } from '../components/sign-up/SignUpPromoPanel';
import { SignUpFormPanel } from '../components/sign-up/SignUpFormPanel';
import { useSignUp } from '../hooks/useSignUp';
import { SIGN_UP_PAGE_BG } from '../constants/sign-up.constants';

/**
 * Sign Up — login showcase bg (#F1F6FD), compact left promo, floating form card.
 */
export const SignUpPage: React.FC = () => {
  const {
    values,
    setField,
    fieldErrors,
    error,
    loading,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    submit,
    pendingVerifyEmail,
    resendVerification,
    resendLoading,
    resendMessage,
  } = useSignUp();

  return (
    <div
      className="samtal-light flex h-full min-h-0 w-full overflow-hidden font-sans text-[#161E35]"
      style={{ backgroundColor: SIGN_UP_PAGE_BG }}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col lg:flex-row">
        <SignUpPromoPanel />
        <SignUpFormPanel
          values={values}
          fieldErrors={fieldErrors}
          error={error}
          loading={loading}
          showPassword={showPassword}
          showConfirm={showConfirm}
          setField={setField}
          setShowPassword={setShowPassword}
          setShowConfirm={setShowConfirm}
          onSubmit={submit}
          pendingVerifyEmail={pendingVerifyEmail}
          resendVerification={resendVerification}
          resendLoading={resendLoading}
          resendMessage={resendMessage}
        />
      </div>
    </div>
  );
};
