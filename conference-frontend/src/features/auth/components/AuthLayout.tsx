import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, BarChart3, CalendarDays, TrendingUp } from 'lucide-react';
import { AUTH_COPY } from '../constants/auth.constants';
import { AUTH_ASSETS } from '../constants/auth.assets';
import '../styles/auth.css';

type PromoVariant = 'signin' | 'signup' | 'forgot';

const SIGNIN_FEATURES = [
  { title: AUTH_COPY.promo.workTitle, body: AUTH_COPY.promo.workBody, Icon: Users },
  { title: AUTH_COPY.promo.organizeTitle, body: AUTH_COPY.promo.organizeBody, Icon: CalendarDays },
  { title: AUTH_COPY.promo.collabTitle, body: AUTH_COPY.promo.collabBody, Icon: TrendingUp },
] as const;

const SIGNUP_FEATURES = [
  { title: AUTH_COPY.signUp.feature1Title, body: AUTH_COPY.signUp.feature1Body, Icon: Users },
  { title: AUTH_COPY.signUp.feature2Title, body: AUTH_COPY.signUp.feature2Body, Icon: Shield },
  { title: AUTH_COPY.signUp.feature3Title, body: AUTH_COPY.signUp.feature3Body, Icon: BarChart3 },
] as const;

function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src={AUTH_ASSETS.logo}
      alt="Samtal — Connect with us"
      className={`auth-brand-logo ${className}`.trim()}
    />
  );
}

function FeatureList({
  items,
}: {
  items: readonly { title: string; body: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }> }[];
}) {
  return (
    <div className="auth-promo-features">
      {items.map(({ title, body, Icon }) => (
        <div key={title} className="auth-promo-feature">
          <div className="auth-promo-icon">
            <Icon size={22} strokeWidth={1.75} color="#006DEC" />
          </div>
          <div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const AuthLayout: React.FC<{
  children: React.ReactNode;
  promo?: PromoVariant;
  solo?: boolean;
}> = ({ children, promo = 'signin', solo = false }) => {
  if (solo) {
    return (
      <div className="auth-root auth-root--solo">
        <div className="auth-solo-wrap">
          <div className="auth-card-solo">{children}</div>
          <div className="auth-logo-dock">
            <BrandLogo />
          </div>
        </div>
      </div>
    );
  }

  if (promo === 'forgot') {
    return (
      <div className="auth-root">
        <div className="auth-split">
          <div className="auth-form-pane">
            <div className="auth-form-scroll">
              <div className="auth-forgot-card">{children}</div>
            </div>
            <div className="auth-logo-dock">
              <BrandLogo />
            </div>
          </div>
          <aside className="auth-promo-pane">
            <img
              className="auth-promo-hero"
              src={AUTH_ASSETS.promoSecureMail}
              alt=""
            />
            <FeatureList
              items={[
                { title: AUTH_COPY.forgot.tip1Title, body: AUTH_COPY.forgot.tip1Body, Icon: Shield },
                { title: AUTH_COPY.forgot.tip2Title, body: AUTH_COPY.forgot.tip2Body, Icon: TrendingUp },
                { title: AUTH_COPY.forgot.tip3Title, body: AUTH_COPY.forgot.tip3Body, Icon: Users },
              ]}
            />
          </aside>
        </div>
      </div>
    );
  }

  if (promo === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-split auth-split--promo-first">
          <aside className="auth-promo-pane">
            <div className="auth-promo-top">
              <h1 className="auth-title">{AUTH_COPY.signUp.title}</h1>
              <p className="auth-subtitle">{AUTH_COPY.signUp.subtitle}</p>
              <FeatureList items={SIGNUP_FEATURES} />
            </div>
            <div className="auth-promo-visual">
              <img src={AUTH_ASSETS.promoDashboard} alt="" />
            </div>
            <div className="auth-logo-dock auth-logo-dock--promo">
              <BrandLogo />
            </div>
          </aside>
          <div className="auth-form-pane">
            <div className="auth-form-scroll">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  // Sign in — form left (white), promo right (#F1F6FD)
  return (
    <div className="auth-root">
      <div className="auth-split">
        <div className="auth-form-pane">
          <div className="auth-form-scroll">{children}</div>
          <div className="auth-logo-dock">
            <BrandLogo />
          </div>
        </div>
        <aside className="auth-promo-pane">
          <div className="auth-promo-visual auth-promo-visual--signin">
            <img src={AUTH_ASSETS.promoDashboardAlt} alt="" />
          </div>
          <FeatureList items={SIGNIN_FEATURES} />
          <p className="auth-promo-foot">{AUTH_COPY.footer.copyright}</p>
        </aside>
      </div>
    </div>
  );
};

/** Compact top logo link for mobile when dock is hidden in promo-only views */
export const AuthMobileBrand: React.FC = () => (
  <Link to="/" className="auth-mobile-brand">
    <BrandLogo />
  </Link>
);
