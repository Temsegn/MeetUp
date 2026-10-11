export const SIGN_IN_TOKENS = {
  primary: '#016BE6',
  primaryHover: '#0059C4',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  promo: '#016BE6',
  shellBorder: '#016BE6',
  error: '#DC2626',
  inputRadius: '12px',
  buttonRadius: '12px',
} as const;

/** Equal outer page inset (left of form = right of showcase = footer edges). */
export const SIGN_IN_PAGE_INSET = 'px-6 sm:px-8 lg:px-10 xl:px-14';
export const SIGN_IN_PAGE_INSET_LEFT = 'pl-6 sm:pl-8 lg:pl-10 xl:pl-14';
export const SIGN_IN_PAGE_INSET_RIGHT = 'pr-6 sm:pr-8 lg:pr-10 xl:pr-14';
export const SIGN_IN_COL_GAP = 'pr-0';
export const SIGN_IN_COL_GAP_LEFT = 'pl-0';

export const SIGN_IN_COPY = {
  title: 'Welcome Back',
  subtitle: 'Sign in to your account to continue',
  emailLabel: 'Email address',
  emailPlaceholder: 'Email address',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Password',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  submit: 'Sign In',
  submitting: 'Signing in…',
  noAccount: "Don't have an account?",
  signUp: 'Sign up',
  promo: {
    titleLine1: 'Smarter Meetings.',
    titleLine2: 'Better Collaboration.',
    /** Two visual lines in the left panel */
    subtitleLine1: 'Record, manage and share your',
    subtitleLine2: 'meetings with ease.',
    subtitle: 'Record, manage and share your meetings with ease.',
    features: [
      'High Quality Recordings',
      'Secure & Private',
      'Access Anywhere, Any Device',
    ],
  },
  /** @deprecated kept for older showcase usages */
  features: [
    {
      title: 'High Quality Recordings',
      body: 'Capture every session in clear video and audio.',
    },
    {
      title: 'Secure & Private',
      body: 'Authenticated rooms with host controls and invitations.',
    },
    {
      title: 'Access Anywhere',
      body: 'Join from desktop, tablet, or mobile in one workspace.',
    },
  ],
  footer: {
    copyright: `© ${new Date().getFullYear()} Samtal. All rights reserved.`,
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
} as const;
