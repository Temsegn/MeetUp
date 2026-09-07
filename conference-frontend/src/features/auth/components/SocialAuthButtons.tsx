import React from 'react';
import { AUTH_COPY } from '../constants/auth.constants';
import { AUTH_ASSETS } from '../constants/auth.assets';

type Variant = 'signin' | 'signup';

export const SocialAuthButtons: React.FC<{ variant?: Variant }> = ({ variant = 'signin' }) => {
  const copy = variant === 'signup' ? AUTH_COPY.signUp : AUTH_COPY.signIn;

  const unavailable = () => {
    window.alert(AUTH_COPY.oauthUnavailable);
  };

  return (
    <>
      <p className={`auth-divider${variant === 'signup' ? ' auth-divider--lined' : ''}`}>
        {copy.orContinue}
      </p>
      <div className={`auth-social${variant === 'signup' ? ' auth-social--row' : ''}`}>
        <button type="button" className="auth-btn auth-btn--outline" onClick={unavailable}>
          <img src={AUTH_ASSETS.google} alt="" width={18} height={18} />
          {copy.google}
        </button>
        <button type="button" className="auth-btn auth-btn--outline" onClick={unavailable}>
          <img src={AUTH_ASSETS.microsoft} alt="" width={18} height={18} />
          {copy.microsoft}
        </button>
      </div>
    </>
  );
};
