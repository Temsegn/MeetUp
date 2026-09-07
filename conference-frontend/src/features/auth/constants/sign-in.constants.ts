export const SIGN_IN_TOKENS = {
  primary: '#0056EF',
  primaryHover: '#0048c7',
  text: '#1C2842',
  muted: '#62748E',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  promo: '#F1F6FD',
  shellBorder: '#0056EF',
  error: '#DC2626',
  inputRadius: '14px',
  buttonRadius: '14px',
} as const;

/** Equal outer page inset (left of form = right of showcase = footer edges). */
export const SIGN_IN_PAGE_INSET = 'px-8 lg:px-10 xl:px-12';
export const SIGN_IN_PAGE_INSET_LEFT = 'pl-8 lg:pl-10 xl:pl-12';
export const SIGN_IN_PAGE_INSET_RIGHT = 'pr-8 lg:pr-10 xl:pr-12';
export const SIGN_IN_COL_GAP = 'pr-6 lg:pr-8';
export const SIGN_IN_COL_GAP_LEFT = 'pl-6 lg:pl-8';

export const SIGN_IN_COPY = {
  title: 'Welcome back 👋',
  subtitle: 'Sign in to your account to continue',
  emailLabel: 'Email address',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  submit: 'Sign in',
  submitting: 'Signing in…',
  orContinue: 'or continue with',
  google: 'Continue with Google',
  microsoft: 'Continue with Microsoft',
  noAccount: "Don't have an account?",
  signUp: 'Sign up',
  oauthSoon: 'Social sign-in is not available yet.',
  features: [
    {
      title: 'Work smarter',
      body: 'Manage your meetings, tasks, and team in one place.',
    },
    {
      title: 'Stay organized',
      body: 'Calendar, recordings, and reports at your fingertips.',
    },
    {
      title: 'Collaborate seamlessly',
      body: 'Connect with your team and achieve more together.',
    },
  ],
  footer: {
    copyright: '© 2025 Samtal. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
} as const;
