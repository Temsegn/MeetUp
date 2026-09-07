import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiError, authService } from '../../../services/auth/auth.service';
import { validateSignIn, type SignInFormValues, type FieldErrors } from '../schemas/auth.schemas';

export function useSignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<SignInFormValues>({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const setField = <K extends keyof SignInFormValues>(key: K, value: SignInFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === 'email') {
      setNeedsVerification(false);
      setResendMessage('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setNeedsVerification(false);
    const errors = validateSignIn(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await signIn(values.email.trim(), values.password, values.rememberMe);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
          setError(
            err.message ||
              'Please verify your email before signing in. Check your inbox for the verification link.',
          );
        } else if (err.status === 429) {
          setError(err.message || 'Too many attempts. Please try again later.');
        } else {
          setError(err.message || 'Invalid email or password.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    const email = values.email.trim();
    if (!email || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      await authService.resendVerificationEmail(email);
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
    submit,
    needsVerification,
    resendVerification,
    resendLoading,
    resendMessage,
  };
}
