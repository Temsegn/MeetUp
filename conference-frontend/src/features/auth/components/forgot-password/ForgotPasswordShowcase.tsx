import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { AUTH_COPY } from '../../constants/auth.constants';
import { CalendarIcon, ShieldIcon, SupportIcon } from './ForgotPasswordIcons';

const FEATURES = [
  { icon: ShieldIcon, title: AUTH_COPY.forgot.tip1Title, body: AUTH_COPY.forgot.tip1Body },
  { icon: CalendarIcon, title: AUTH_COPY.forgot.tip2Title, body: AUTH_COPY.forgot.tip2Body },
  { icon: SupportIcon, title: AUTH_COPY.forgot.tip3Title, body: AUTH_COPY.forgot.tip3Body },
] as const;

export const ForgotPasswordShowcase: React.FC = () => (
  <aside
    className="hidden min-h-0 min-w-0 flex-col bg-auth-promo px-6 pt-6 pb-10 sm:px-10 lg:flex lg:px-[70px] lg:pt-8 lg:pb-12"
    aria-label="Password recovery highlights"
  >
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Illustration scales in its own slot — feature list stays fixed below */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <img
          src={AUTH_ASSETS.forgotIllustration}
          alt=""
          className="h-auto w-full max-w-[min(100%,32rem)] max-h-[min(42vh,22rem)] object-contain"
        />
      </div>

      <ul className="m-0 mt-6 w-full max-w-[422px] shrink-0 list-none self-center p-0">
        {FEATURES.map(({ icon: Icon, title, body }, idx) => (
          <li key={title} className={`flex items-start gap-[18px] ${idx > 0 ? 'pt-5' : ''}`}>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[11px] bg-white shadow-sm">
              <Icon />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-[15px] font-semibold leading-[22px] tracking-[-0.17px] text-auth-text">
                {title}
              </h3>
              <p className="mt-1 text-[14px] font-normal leading-[22px] tracking-[-0.17px] text-auth-muted">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </aside>
);
