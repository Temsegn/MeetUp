import React from 'react';
import { AuthShell, AuthMain, AuthFooter } from '../components/AuthShell';
import { ForgotPasswordPanel } from '../components/forgot-password/ForgotPasswordPanel';
import { ForgotPasswordShowcase } from '../components/forgot-password/ForgotPasswordShowcase';
import { SIGN_IN_COPY } from '../constants/sign-in.constants';
import { useForgotPassword } from '../hooks/useForgotPassword';

/**
 * Forgot Password — Tailwind-only, matches design spacing/icons.
 * Flow: form → useForgotPassword → authService.forgotPassword → POST /auth/forgot-password
 */
export const ForgotPasswordPage: React.FC = () => {
  const { values, setField, fieldErrors, error, loading, sent, submit } = useForgotPassword();

  return (
    <AuthShell>
      <AuthMain>
        <ForgotPasswordPanel
          values={values}
          fieldErrors={fieldErrors}
          error={error}
          loading={loading}
          sent={sent}
          setField={setField}
          onSubmit={submit}
        />
        <ForgotPasswordShowcase />
      </AuthMain>
      <AuthFooter
        copyright={SIGN_IN_COPY.footer.copyright}
        privacy={SIGN_IN_COPY.footer.privacy}
        terms={SIGN_IN_COPY.footer.terms}
      />
    </AuthShell>
  );
};
