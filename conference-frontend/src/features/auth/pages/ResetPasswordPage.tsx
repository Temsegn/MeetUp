import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AuthField } from '../components/AuthField';
import { AuthError, AuthSuccess } from '../components/AuthError';
import { AUTH_COPY } from '../constants/auth.constants';
import { useResetPassword } from '../hooks/useResetPassword';

/** Layout NOT FOUND IN FIGMA — styled with auth tokens for visual consistency. */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const {
    values,
    setField,
    fieldErrors,
    error,
    loading,
    success,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    submit,
  } = useResetPassword(token);
  const c = AUTH_COPY.reset;

  return (
    <AuthLayout solo>
      <h1 className="auth-title" style={{ fontSize: 28 }}>
        {c.title}
      </h1>
      <p className="auth-subtitle">{c.subtitle}</p>

      {success ? (
        <AuthSuccess>
          Password updated. Redirecting to sign in…
        </AuthSuccess>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <AuthError message={error} />

          <AuthField
            id="reset-password"
            label={c.passwordLabel}
            icon="lock"
            value={values.newPassword}
            placeholder={c.passwordPlaceholder}
            autoComplete="new-password"
            error={fieldErrors.newPassword}
            showPasswordToggle
            passwordVisible={showPassword}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onChange={(v) => setField('newPassword', v)}
            required
          />

          <AuthField
            id="reset-confirm"
            label={c.confirmLabel}
            icon="lock"
            value={values.confirmPassword}
            placeholder={c.confirmPlaceholder}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            showPasswordToggle
            passwordVisible={showConfirm}
            onTogglePassword={() => setShowConfirm((v) => !v)}
            onChange={(v) => setField('confirmPassword', v)}
            required
          />

          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            {loading ? 'Saving…' : c.submit}
          </button>

          <p className="auth-switch">
            <Link className="auth-link" to="/auth">
              Back to Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};
