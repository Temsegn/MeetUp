import React from 'react';
import { AuthShell, AuthMain } from '../components/AuthShell';
import { ProductShowcase } from '../components/sign-in/ProductShowcase';
import { SignUpFormPanel } from '../components/sign-up/SignUpFormPanel';
import { useSignUp } from '../hooks/useSignUp';

/**
 * Sign Up — same left promo as sign-in; only the right form column differs.
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
    <AuthShell>
      <AuthMain>
        <ProductShowcase />
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
      </AuthMain>
    </AuthShell>
  );
};
