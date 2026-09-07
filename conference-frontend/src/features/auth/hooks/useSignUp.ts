import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiError, authService } from '../../../services/auth/auth.service';
import { validateSignUp, type SignUpFormValues, type FieldErrors } from '../schemas/auth.schemas';

export function useSignUp() {
  const { signUp, signOut } = useAuth();
  const [values, setValues] = useState<SignUpFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    teamSize: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const setField = <K extends keyof SignUpFormValues>(key: K, value: SignUpFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    const errors = validateSignUp(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const name = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
    const email = values.email.trim();

    setLoading(true);
    try {
      await signUp(name, email, values.password, true, {
        company: values.company.trim(),
        teamSize: values.teamSize,
      });
      // Stay on register page and ask to verify — clear the auto-login session.
      await signOut();
      setPendingVerifyEmail(email);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'EMAIL_EXISTS') {
          setError(err.message || 'An account with this email already exists.');
        } else if (err.status === 429) {
          setError(err.message || 'Too many attempts. Please try again later.');
        } else {
          setError(err.message || 'Could not create your account.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!pendingVerifyEmail || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');
    try {
      await authService.resendVerificationEmail(pendingVerifyEmail);
      setResendMessage('Verification email sent. Check your inbox.');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setError(err.message || 'Too many attempts. Please try again later.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not resend verification email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return {
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
  };
}
