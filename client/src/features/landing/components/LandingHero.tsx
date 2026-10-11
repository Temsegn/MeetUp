import { ArrowRight, Film, MonitorUp, Pencil, Shield } from 'lucide-react';
import { useLandingChrome } from '../landing-chrome';
import { useLandingCopy } from '../useLandingCopy';
import { LP_GHOST, LP_PRIMARY } from '../landing-ui';
import { AppEntryLink, AuthLink } from './LandingLinks';
import { ProductAppPreview } from './ProductAppPreview';

type Props = {
  user: { name?: string } | null;
};

const CAP_ICONS = [Shield, MonitorUp, Pencil, Film] as const;

export function LandingHero({ user }: Props) {
  const copy = useLandingCopy();
  const { goSection } = useLandingChrome();
  const primaryLabel = user ? copy.hero.primaryAuthed : copy.hero.primary;

  return (
    <section id="top" className="relative overflow-hidden" aria-label="Hero">
      {/* Atmospheric plane — soft blue wash + fine grid, not a flat fill */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#EEF4FB_0%,#F7F9FC_42%,#FFFFFF_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(1,107,230,0.16)_0%,transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_8%_90%,rgba(1,107,230,0.07)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14 lg:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="lp-rise lp-display text-[clamp(2.75rem,8vw,4.75rem)] font-semibold leading-none tracking-[-0.05em] text-[#016BE6]">
            Samtal
          </p>
          <h1 className="lp-rise lp-rise-delay-1 lp-display mt-5 text-[clamp(1.65rem,3.8vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.035em] text-[#0F172A]">
            {copy.hero.title}
          </h1>
          <p className="lp-rise lp-rise-delay-2 mx-auto mt-4 max-w-xl text-[16px] leading-[1.7] text-[#5B677A] sm:text-[17px]">
            {copy.hero.body}
          </p>

          <div className="lp-rise lp-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <AppEntryLink className={LP_PRIMARY}>
                {primaryLabel}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </AppEntryLink>
            ) : (
              <AuthLink to="/auth/sign-up" className={LP_PRIMARY}>
                {primaryLabel}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </AuthLink>
            )}
            <button type="button" onClick={() => goSection('product')} className={LP_GHOST}>
              {copy.hero.secondary}
            </button>
          </div>
          <p className="lp-fade mt-5 text-[13px] leading-relaxed text-[#7A8699]">{copy.hero.proof}</p>
        </div>
      </div>

      {/* Dominant product plane — full-bleed under the copy */}
      <div className="lp-stage relative mt-10 sm:mt-14">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent sm:h-32" aria-hidden />
        <div className="mx-auto max-w-[1240px] px-0 sm:px-6 lg:px-8">
          <ProductAppPreview
            size="hero"
            active="dashboard"
            alt="Samtal workspace dashboard"
            className="rounded-none border-x-0 border-b-0 shadow-none sm:rounded-t-2xl sm:border sm:border-b-0 sm:border-[#D7DEE8] sm:shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]"
          />
        </div>
      </div>

      {/* Capability strip — below the first composition */}
      <div className="relative border-y border-[#E6EBF2] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">
          {copy.capabilities.map((item, i) => {
            const Icon = CAP_ICONS[i] ?? Shield;
            return (
              <div
                key={item.label}
                className="border-[#E6EBF2] px-5 py-6 sm:px-7 sm:py-7 max-sm:border-b max-sm:[&:nth-last-child(-n+2)]:border-b-0 ltr:border-r ltr:even:border-r-0 sm:ltr:even:border-r sm:ltr:last:border-r-0 rtl:border-l rtl:even:border-l-0 sm:rtl:even:border-l sm:rtl:last:border-l-0"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#016BE6]">
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <p className="lp-display mt-3 text-[15px] font-semibold tracking-tight text-[#0F172A]">
                  {item.value}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5B677A]">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
