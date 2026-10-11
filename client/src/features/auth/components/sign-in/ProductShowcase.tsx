import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import {
  SIGN_IN_COL_GAP_LEFT,
  SIGN_IN_COPY,
  SIGN_IN_PAGE_INSET_RIGHT,
} from '../../constants/sign-in.constants';

const FEATURE_ICONS = [
  AUTH_ASSETS.workSmarter,
  AUTH_ASSETS.stayOrganized,
  AUTH_ASSETS.collaborate,
] as const;

export const FeatureItem: React.FC<{
  title: string;
  body: string;
  iconSrc: string;
}> = ({ title, body, iconSrc }) => (
  <div className="flex w-full items-start gap-3">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#D7E3F4] bg-white/80">
      <img src={iconSrc} alt="" width={16} height={16} className="block size-4" />
    </div>
    <div className="min-w-0">
      <h3 className="m-0 text-[0.8125rem] font-semibold leading-snug text-[#0F172A]">{title}</h3>
      <p className="mt-0.5 max-w-[17rem] text-[0.75rem] leading-snug text-[#64748B]">{body}</p>
    </div>
  </div>
);

/**
 * Right showcase — calm product panel for desktop sign-in.
 */
export const ProductShowcase: React.FC = () => (
  <aside
    className="relative hidden min-h-0 min-w-0 flex-col overflow-hidden bg-[#EEF4FB] lg:flex"
    aria-label="Product highlights"
  >
    <div
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 70% 20%, rgba(1,107,230,0.08), transparent 60%)',
      }}
      aria-hidden
    />
    <div
      className={`relative flex h-full min-h-0 w-full flex-col justify-center py-8 ${SIGN_IN_COL_GAP_LEFT} ${SIGN_IN_PAGE_INSET_RIGHT}`}
    >
      <div className="flex w-full max-w-md flex-col items-stretch">
        <img
          src={AUTH_ASSETS.signInShowcase}
          alt=""
          className="block h-auto w-full max-h-[min(48vh,24rem)] self-start object-contain object-left"
        />

        <div className="mt-6 flex w-full flex-col items-stretch gap-4 self-start">
          {SIGN_IN_COPY.features.map((f, i) => (
            <FeatureItem key={f.title} title={f.title} body={f.body} iconSrc={FEATURE_ICONS[i]} />
          ))}
        </div>
      </div>
    </div>
  </aside>
);
