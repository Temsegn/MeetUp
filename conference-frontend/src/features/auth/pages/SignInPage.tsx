import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AuthShell, AuthMain, AuthFooter } from '../components/AuthShell';
import { SignInPanel } from '../components/sign-in/SignInPanel';
import { ProductShowcase } from '../components/sign-in/ProductShowcase';
import { useSignIn } from '../hooks/useSignIn';
import { SIGN_IN_COPY } from '../constants/sign-in.constants';

/**
 * Sign In — one viewport; full-width footer like design (© left, links right).
 */
export const SignInPage: React.FC = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const oauthError = params.get('error');
  const stateMessage =
    location.state && typeof location.state === 'object' && 'message' in location.state
      ? String((location.state as { message?: string }).message ?? '')
      : '';
  const {
    values,
    setField,
    fieldErrors,
    error,
    loading,
    showPassword,
    setShowPassword,
    submit,
    needsVerification,
    resendVerification,
    resendLoading,
    resendMessage,
  } = useSignIn();

  const oauthMessage =
    oauthError === 'google_not_configured'
      ? 'Google sign-in is not configured on the server yet.'
      : oauthError === 'google_denied' || oauthError === 'google_failed'
        ? 'Google sign-in was cancelled or failed. Try again.'
        : '';

  return (
    <AuthShell>
      <AuthMain>
        <SignInPanel
          values={values}
          fieldErrors={fieldErrors}
          error={error || oauthMessage}
          infoMessage={stateMessage}
          loading={loading}
          showPassword={showPassword}
          setField={setField}
          setShowPassword={setShowPassword}
          onSubmit={submit}
          needsVerification={needsVerification}
          resendVerification={resendVerification}
          resendLoading={resendLoading}
          resendMessage={resendMessage}
        />
        <ProductShowcase />
      </AuthMain>
      <AuthFooter
        copyright={SIGN_IN_COPY.footer.copyright}
        privacy={SIGN_IN_COPY.footer.privacy}
        terms={SIGN_IN_COPY.footer.terms}
      />
    </AuthShell>
  );
};
