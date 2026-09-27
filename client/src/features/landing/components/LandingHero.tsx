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
    <section id="top" className="relative bg-[#F5F7FA]" aria-label="Hero">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(920px_460px_at_78%_-80px,rgba(1,107,230,0.12)_0%,transparent_68%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
        <div className="max-w-2xl">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-[clamp(1.85rem,3.6vw,2.85rem)] font-bold leading-[1.15] tracking-tight text-[#151D2B]">
            {copy.hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-[#6F7B8C] sm:text-[16px]">{copy.hero.body}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
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
          <p className="mt-5 text-[13px] leading-relaxed text-[#6F7B8C]">{copy.hero.proof}</p>
        </div>

        <div className="mt-8 min-w-0">
          <ProductAppPreview size="hero" active="dashboard" alt="Samtal workspace dashboard" />
        </div>
      </div>

      <div className="relative border-y border-[#E1E7EE] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">
          {copy.capabilities.map((item, i) => {
            const Icon = CAP_ICONS[i] ?? Shield;
            return (
              <div
                key={item.label}
                className="border-[#E8ECF1] px-5 py-5 sm:px-7 sm:py-6 max-sm:border-b max-sm:[&:nth-last-child(-n+2)]:border-b-0 ltr:border-r ltr:even:border-r-0 sm:ltr:even:border-r sm:ltr:last:border-r-0 rtl:border-l rtl:even:border-l-0 sm:rtl:even:border-l sm:rtl:last:border-l-0"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#E8F1FE] text-[#016BE6]">
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <p className="mt-3 text-[14px] font-semibold tracking-tight text-[#151D2B]">{item.value}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6F7B8C]">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
