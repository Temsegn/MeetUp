import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** Mirrors features/auth/schemas/auth.schemas.ts — keep in sync when policy changes. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordError(password) {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

function validateSignIn(values) {
  const errors = {};
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'A valid email address is required.';
  if (!values.password) errors.password = 'Password is required.';
  return errors;
}

function validateSignUp(values) {
  const errors = {};
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

describe('auth validation (policy mirror)', () => {
  it('rejects invalid sign-in email', () => {
    assert.ok(validateSignIn({ email: 'bad', password: 'x', rememberMe: true }).email);
  });

  it('accepts valid sign-in', () => {
    assert.deepEqual(validateSignIn({ email: 'a@b.com', password: 'x', rememberMe: false }), {});
  });

  it('enforces password policy on sign-up', () => {
    assert.ok(
      validateSignUp({
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        company: '',
        password: 'short',
        confirmPassword: 'short',
        acceptTerms: true,
      }).password,
    );
  });

  it('requires matching confirm + terms', () => {
    const mismatch = validateSignUp({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      company: '',
      password: 'Password1ab',
      confirmPassword: 'Password1ac',
      acceptTerms: true,
    });
    assert.equal(mismatch.confirmPassword, 'Passwords do not match.');
    const terms = validateSignUp({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      company: '',
      password: 'Password1ab',
      confirmPassword: 'Password1ab',
      acceptTerms: false,
    });
    assert.ok(terms.acceptTerms);
  });
});
