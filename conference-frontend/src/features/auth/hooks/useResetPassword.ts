import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, ApiError } from '../../../services/auth/auth.service';
import {
  validateResetPassword,
  type ResetPasswordFormValues,
  type FieldErrors,
} from '../schemas/auth.schemas';

export function useResetPassword(token: string) {
  const navigate = useNavigate();
  const [values, setValues] = useState<ResetPasswordFormValues>({
    newPassword: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setField = <K extends keyof ResetPasswordFormValues>(
    key: K,
    value: ResetPasswordFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is invalid or incomplete.');
      return;
    }
    const errors = validateResetPassword(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/auth', { replace: true }), 2000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Could not reset password. The link may have expired.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
