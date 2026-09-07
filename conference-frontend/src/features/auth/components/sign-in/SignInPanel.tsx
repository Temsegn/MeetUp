import React from 'react';
import { AuthLogo } from '../AuthShell';
import { WelcomeHeader } from './WelcomeHeader';
import { SignInForm } from './SignInForm';
import { SignUpPrompt } from './SignUpPrompt';
import {
  SIGN_IN_COL_GAP,
  SIGN_IN_PAGE_INSET_LEFT,
} from '../../constants/sign-in.constants';
import type { SignInFormValues, FieldErrors } from '../../schemas/auth.schemas';

type Props = {
  values: SignInFormValues;
  fieldErrors: FieldErrors;
  error: string;
  infoMessage?: string;
  loading: boolean;
  showPassword: boolean;
  setField: <K extends keyof SignInFormValues>(key: K, value: SignInFormValues[K]) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: React.FormEvent) => void;
  needsVerification?: boolean;
  resendVerification?: () => void;
  resendLoading?: boolean;
  resendMessage?: string;
};

/** Left form — app-scale; outer left margin matches page right margin. */
export const SignInPanel: React.FC<Props> = (props) => (
  <section
    className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white"
    aria-labelledby="signin-heading"
  >
    <div
      className={`flex h-full min-h-0 flex-col justify-start pt-10 pb-4 lg:pt-12 ${SIGN_IN_PAGE_INSET_LEFT} ${SIGN_IN_COL_GAP}`}
    >
      <div className="w-full max-w-[24rem] self-start">
        <AuthLogo className="mb-4 h-8 max-w-[10.5rem] sm:h-9 sm:max-w-[11.5rem]" />
        <WelcomeHeader />
        <SignInForm {...props} />
        <SignUpPrompt />
      </div>
    </div>
  </section>
);
