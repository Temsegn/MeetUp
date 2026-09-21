import { ArrowRight, Globe2 } from 'lucide-react';
import { LANDING_ASSETS } from '../constants/landing.constants';
import { frontendUrl } from '../../../lib/frontendUrl';
import { useLandingChrome } from '../landing-chrome';
import { useLandingCopy } from '../useLandingCopy';

type Props = {
  user: { name?: string } | null;
};

export function LandingHero({ user }: Props) {
  const copy = useLandingCopy();
  const { goSection } = useLandingChrome();
  const primaryHref = frontendUrl(user ? '/app' : '/auth');
  const primaryLabel = user ? copy.hero.primaryAuthed : copy.hero.primary;

  return (
    <section id="top" className="relative overflow-hidden" aria-label="Hero">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_480px_at_50%_-80px,#c5d8f3_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(#D7E2EE 1px, transparent 1px), linear-gradient(90deg, #D7E2EE 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 18%, transparent 72%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            <Globe2 className="size-3.5" strokeWidth={2.25} />
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-[clamp(2.15rem,4.4vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#0B1220]">
            {copy.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-[#5A6B7C] sm:text-[17px]">
            {copy.hero.body}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={primaryHref}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#016BE6] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#0A4FBF]"
            >
              {primaryLabel}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </a>
            <button
              type="button"
              onClick={() => goSection('product')}
              className="inline-flex h-12 items-center rounded-full border border-[#D9E0E8] bg-white px-5 text-[14px] font-semibold text-[#0B1220] transition-colors hover:bg-[#F4F7FB]"
            >
              {copy.hero.secondary}
            </button>
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-[#7A8896]">{copy.hero.proof}</p>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-[#E6EAF0] bg-white p-2 shadow-[0_24px_80px_-32px_rgba(11,18,32,0.35)]">
            <div className="mb-2 flex items-center gap-1.5 px-2 pt-1">
              <span className="size-2 rounded-full bg-[#E6EAF0]" />
              <span className="size-2 rounded-full bg-[#E6EAF0]" />
              <span className="size-2 rounded-full bg-[#E6EAF0]" />
              <span className="ms-3 h-5 flex-1 rounded bg-[#F4F7FB]" />
            </div>
            <img
              src={LANDING_ASSETS.heroDashboard}
              alt="Samtal meeting workspace"
              className="block aspect-[16/10] w-full rounded-xl object-cover object-center"
            />
          </div>
        </div>
      </div>

      <div className="relative border-y border-[#E6EAF0] bg-white/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-[#E6EAF0] sm:grid-cols-4 rtl:divide-x-reverse">
          {copy.capabilities.map((item) => (
            <div key={item.label} className="px-5 py-5 sm:px-8 sm:py-6">
              <p className="text-[15px] font-semibold tracking-tight text-[#0B1220]">{item.value}</p>
              <p className="mt-1 text-[12px] text-[#7A8896]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
