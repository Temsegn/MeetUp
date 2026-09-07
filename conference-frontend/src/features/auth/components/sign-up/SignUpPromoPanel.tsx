import React from 'react';
import { Link } from 'react-router-dom';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { AUTH_COPY } from '../../constants/auth.constants';
import { SignUpFeatureItem } from './SignUpFeatureItem';
import { SignUpDashboardPreview } from './SignUpDashboardPreview';

const FEATURES = [
  {
    iconSrc: AUTH_ASSETS.signUpPlatform,
    title: AUTH_COPY.signUp.feature1Title,
    description: AUTH_COPY.signUp.feature1Body,
  },
  {
    iconSrc: AUTH_ASSETS.signUpSecure,
    title: AUTH_COPY.signUp.feature2Title,
    description: AUTH_COPY.signUp.feature2Body,
  },
  {
    iconSrc: AUTH_ASSETS.signUpInsights,
    title: AUTH_COPY.signUp.feature3Title,
    description: AUTH_COPY.signUp.feature3Body,
  },
] as const;

/**
 * Left promo — more left inset (content shifted right), larger dashboard.
 */
export const SignUpPromoPanel: React.FC = () => {
  const c = AUTH_COPY.signUp;
  const f = AUTH_COPY.footer;

  return (
    <aside
      className="relative hidden min-h-0 w-[46%] max-w-[44rem] shrink-0 flex-col overflow-hidden lg:flex"
      aria-label="Why Samtal"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col justify-between pt-12 pb-5 pl-24 pr-3 xl:pt-14 xl:pb-6 xl:pl-28 xl:pr-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Link to="/" className="inline-flex shrink-0 self-start" aria-label="Samtal home">
            <img
              src={AUTH_ASSETS.signUpLogo}
              alt="Samtal — Connect with us"
              className="block h-8 w-auto max-w-[10.5rem] object-contain object-left xl:h-9 xl:max-w-[11.5rem]"
            />
          </Link>

          <header className="mt-4 shrink-0 space-y-1">
            <h1 className="m-0 text-[1.35rem] font-extrabold leading-snug tracking-[-0.02em] text-[#161E35] xl:text-[1.5rem]">
              {c.title}
            </h1>
            <p className="m-0 max-w-[22rem] text-[0.75rem] leading-snug text-[rgba(22,30,53,0.7)]">
              {c.subtitle}
            </p>
          </header>

          <div className="mt-4 flex shrink-0 flex-col gap-2.5">
            {FEATURES.map((item) => (
              <SignUpFeatureItem
                key={item.title}
                iconSrc={item.iconSrc}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>

          <div className="mt-4 min-h-0 flex-1">
            <SignUpDashboardPreview />
          </div>
        </div>

        <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[rgba(22,30,53,0.1)] pt-3 text-[10px] text-[rgba(22,30,53,0.6)]">
          <span className="whitespace-nowrap">{f.copyright}</span>
          <nav className="flex gap-5" aria-label="Legal">
            <a href="#privacy" className="whitespace-nowrap hover:text-[#161E35] hover:underline">
              {f.privacy}
            </a>
            <a href="#terms" className="whitespace-nowrap hover:text-[#161E35] hover:underline">
              {f.terms}
            </a>
          </nav>
        </footer>
      </div>
    </aside>
  );
};
