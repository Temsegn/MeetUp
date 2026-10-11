import { ArrowRight, Film, MonitorUp, Pencil, Shield } from 'lucide-react';
import { useLandingChrome } from '../landing-chrome';
import { useLandingCopy } from '../useLandingCopy';
import { LandingBlueWash, LP_GHOST, LP_ICON, LP_PRIMARY } from '../landing-ui';
import { AppEntryLink, AuthLink } from './LandingLinks';

type Props = {
  user: { name?: string } | null;
};

const CAP_ICONS = [Shield, MonitorUp, Pencil, Film] as const;

/** Clean hero — blue/white circles like login; icons only, no product images. */
export function LandingHero({ user }: Props) {
  const copy = useLandingCopy();
  const { goSection } = useLandingChrome();
  const primaryLabel = user ? copy.hero.primaryAuthed : copy.hero.primary;

  return (
    <section id="top" className="relative overflow-hidden" aria-label="Hero">
      <LandingBlueWash variant="light" />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:pt-20">
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

        {/* Icon feature grid — app features, no screenshots */}
        <ul className="lp-stage mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4 sm:gap-4">
          {copy.capabilities.map((item, i) => {
            const Icon = CAP_ICONS[i] ?? Shield;
            return (
              <li
                key={item.label}
                className="rounded-2xl border border-[#E6EBF2] bg-white/90 px-4 py-5 text-center shadow-[0_8px_30px_-20px_rgba(1,107,230,0.35)] backdrop-blur-sm sm:px-5 sm:py-6"
              >
                <span className={`${LP_ICON} mx-auto`}>
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <p className="mt-3 text-[14px] font-semibold tracking-tight text-[#0F172A] sm:text-[15px]">
                  {item.value}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#5B677A] sm:text-[13px]">
                  {item.label}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
