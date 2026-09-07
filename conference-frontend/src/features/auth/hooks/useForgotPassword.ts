import { useState } from 'react';
import { authService, ApiError } from '../../../services/auth/auth.service';
import {
  validateForgotPassword,
  type ForgotPasswordFormValues,
  type FieldErrors,
} from '../schemas/auth.schemas';

export function useForgotPassword() {
  const [values, setValues] = useState<ForgotPasswordFormValues>({ email: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const setField = <K extends keyof ForgotPasswordFormValues>(
    key: K,
    value: ForgotPasswordFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validateForgotPassword(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await authService.forgotPassword(values.email.trim());
      setSent(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setError(err.message || 'Too many attempts. Please try again later.');
      } else {
        // Enumeration-safe: still show success for most failures after a soft attempt,
        // but surface network errors honestly.
        if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
          setError(err.message);
        } else {
          setSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return { values, setField, fieldErrors, error, loading, sent, submit };
}
