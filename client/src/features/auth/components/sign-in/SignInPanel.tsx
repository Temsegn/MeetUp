import React from 'react';
import { AuthLogo } from '../AuthShell';
import { WelcomeHeader } from './WelcomeHeader';
import { SignInForm } from './SignInForm';
import { SignUpPrompt } from './SignUpPrompt';
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

/** Right form — all content centered in the column. */
export const SignInPanel: React.FC<Props> = (props) => (
  <section
    className="flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-white"
    aria-labelledby="signin-heading"
  >
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-10 sm:px-12 sm:py-12">
      <div className="flex w-full max-w-[24rem] flex-col items-center">
        <AuthLogo className="mb-0 h-14 max-w-[15rem] object-contain sm:h-16 sm:max-w-[16rem]" />
        <WelcomeHeader />
        <div className="w-full">
          <SignInForm {...props} />
          <SignUpPrompt />
        </div>
      </div>
    </div>
  </section>
);
