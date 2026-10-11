import React from 'react';
import { Cloud, Shield, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

const FEATURE_ICONS = [Video, Shield, Cloud] as const;

/**
 * Left promo (~55%) — large logo, smaller headlines, taller product image.
 */
export const ProductShowcase: React.FC = () => (
  <aside
    className="relative hidden min-h-0 min-w-0 flex-col overflow-hidden lg:flex"
    aria-label="Product highlights"
  >
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        background: 'linear-gradient(165deg, #1A8CFF 0%, #0B74F0 40%, #016BE6 75%, #0058D0 100%)',
      }}
    />
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        background: [
          'radial-gradient(ellipse 440px 340px at 10% 16%, rgba(255,255,255,0.26) 0%, transparent 55%)',
          'radial-gradient(ellipse 400px 320px at 90% 10%, rgba(255,255,255,0.16) 0%, transparent 52%)',
          'radial-gradient(ellipse 480px 360px at 82% 82%, rgba(150,205,255,0.32) 0%, transparent 55%)',
          'radial-gradient(ellipse 360px 300px at 6% 88%, rgba(255,255,255,0.12) 0%, transparent 50%)',
        ].join(', '),
      }}
    />

    <div className="relative flex h-full min-h-0 items-center justify-center px-10 py-8 xl:px-14 xl:py-10">
      <div className="flex w-full max-w-[46rem] flex-col items-start">
        {/* Logo larger than the headlines below */}
        <Link to="/" className="inline-flex w-fit shrink-0" aria-label="Samtal home">
          <img
            src={AUTH_ASSETS.logoOnBlue}
            alt="samtal — CONNECT WITH US"
            className="h-16 w-auto max-w-[20rem] object-contain object-left xl:h-[4.5rem] xl:max-w-[22rem]"
          />
        </Link>

        <h2 className="mt-6 m-0 w-full text-left text-[clamp(1.35rem,1.9vw,1.65rem)] font-bold leading-[1.25] tracking-[-0.02em] text-white">
          <span className="block">{SIGN_IN_COPY.promo.titleLine1}</span>
          <span className="block">{SIGN_IN_COPY.promo.titleLine2}</span>
        </h2>

        <p className="mt-2.5 m-0 w-full max-w-[26rem] text-left text-[13px] font-normal leading-[1.5] text-[#C9D9EF] xl:text-[14px]">
          <span className="block">{SIGN_IN_COPY.promo.subtitleLine1}</span>
          <span className="block">{SIGN_IN_COPY.promo.subtitleLine2}</span>
        </p>

        <div className="mt-5 w-full flex-1">
          <img
            src={AUTH_ASSETS.signInDashboard}
            alt="Samtal recordings workspace"
            className="h-auto w-full max-h-[min(64vh,40rem)] rounded-2xl object-contain object-left shadow-[0_24px_56px_-18px_rgba(7,24,60,0.5)] ring-1 ring-white/20 xl:max-h-[min(70vh,46rem)]"
          />
        </div>

        <ul className="mt-8 flex w-full flex-wrap items-start gap-x-7 gap-y-3 xl:mt-9 xl:gap-x-9">
          {SIGN_IN_COPY.promo.features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Video;
            return (
              <li key={feature} className="flex min-w-0 items-center gap-2.5 text-white">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="size-4 text-white" strokeWidth={1.85} aria-hidden />
                </span>
                <span className="max-w-[9.5rem] text-[13px] font-medium leading-snug text-white xl:max-w-[10.5rem] xl:text-[14px]">
                  {feature}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  </aside>
);
