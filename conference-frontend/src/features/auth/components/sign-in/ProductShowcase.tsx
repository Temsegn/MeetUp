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
    <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#D7E3F4] bg-[#EEF4FC]">
      <img src={iconSrc} alt="" width={15} height={15} className="block size-[15px]" />
    </div>
    <div className="min-w-0">
      <h3 className="m-0 text-[0.8125rem] font-bold leading-snug text-[#1C2842]">{title}</h3>
      <p className="mt-0.5 max-w-[16rem] text-[0.75rem] leading-snug text-[#62748E]">{body}</p>
    </div>
  </div>
);

/**
 * Right showcase — image + feature list share the exact same left edge.
 */
export const ProductShowcase: React.FC = () => (
  <aside
    className="hidden min-h-0 min-w-0 flex-col overflow-hidden bg-[#F1F6FD] lg:flex"
    aria-label="Product highlights"
  >
    <div
      className={`flex h-full min-h-0 w-full flex-col justify-start pt-1 pb-4 lg:pt-2 ${SIGN_IN_COL_GAP_LEFT} ${SIGN_IN_PAGE_INSET_RIGHT}`}
    >
      <div className="flex w-full flex-col items-stretch">
        <img
          src={AUTH_ASSETS.signInShowcase}
          alt=""
          className="block h-auto w-full max-h-[min(52vh,26rem)] self-start object-contain object-left"
        />

        <div className="mt-4 flex w-full flex-col items-stretch gap-3 self-start">
          {SIGN_IN_COPY.features.map((f, i) => (
            <FeatureItem key={f.title} title={f.title} body={f.body} iconSrc={FEATURE_ICONS[i]} />
          ))}
        </div>
      </div>
    </div>
  </aside>
);
