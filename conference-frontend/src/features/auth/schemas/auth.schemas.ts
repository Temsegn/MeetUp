/** Lightweight validators (no zod on frontend — mirrors backend password policy). */

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordError(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

export interface SignInFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function validateSignIn(values: SignInFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'A valid email address is required.';
  if (!values.password) errors.password = 'Password is required.';
  return errors;
}

export interface SignUpFormValues {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  teamSize: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export function validateSignUp(values: SignUpFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'A valid email address is required.';
  const pw = passwordError(values.password);
  if (pw) errors.password = pw;
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!values.acceptTerms) {
    errors.acceptTerms = 'You must agree to the Terms of Service and Privacy Policy.';
  }
  return errors;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export function validateForgotPassword(values: ForgotPasswordFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'A valid email address is required.';
  return errors;
}

export interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export function validateResetPassword(values: ResetPasswordFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const pw = passwordError(values.newPassword);
  if (pw) errors.newPassword = pw;
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}