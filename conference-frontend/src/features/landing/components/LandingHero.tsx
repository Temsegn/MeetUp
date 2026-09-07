import { Link } from 'react-router-dom';
import { ArrowRight, Play, Radio, Users } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { HERO_STATS, LANDING_ASSETS } from '../constants/landing.constants';

type Props = {
  user: { name?: string } | null;
};

export function LandingHero({ user }: Props) {
  const primaryHref = user ? '/app' : '/auth';
  const primaryLabel = user ? 'Open dashboard' : 'Start free';

  return (
    <section className="relative overflow-hidden bg-white" aria-label="Hero">
      <div
        className="pointer-events-none absolute -right-32 top-0 size-[480px] rounded-full bg-[#E8F1FF]/60 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 size-[360px] rounded-full bg-[#F1F6FD] blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24">
        <div className="max-w-xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E1E7EE] bg-white px-3 py-1 text-[11px] font-semibold text-[#016BE6] shadow-sm">
            <Radio className="size-3" />
            Enterprise conferencing platform
          </p>
          <h1 className="text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.12] tracking-tight text-[#151D2B]">
            Run meetings, messages, and recordings from one workspace
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#6F7B8C] sm:text-[16px]">
            Samtal brings live video, team chat, calendar, and analytics together — so your
            organization stays aligned before, during, and after every call.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to={primaryHref}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#DC6C7C] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#C85A6A]"
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#product"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E1E7EE] bg-white px-5 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
            >
              <Play className="size-4 text-[#016BE6]" />
              See the product
            </a>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {LANDING_ASSETS.avatars.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="size-8 rounded-full border-2 border-white object-cover ring-1 ring-[#E8ECF1]"
                />
              ))}
            </div>
            <p className="text-[12px] leading-snug text-[#6F7B8C]">
              <span className="font-semibold text-[#151D2B]">500+ teams</span> use Samtal for
              daily standups, client calls, and async follow-ups.
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
          <div className="overflow-hidden rounded-2xl border border-[#006DEC]/20 bg-[#F1F6FD] p-2 shadow-[0_20px_50px_rgba(1,107,230,0.12)]">
            <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white">
              <img
                src={LANDING_ASSETS.heroDashboard}
                alt="Samtal dashboard with meetings, calendar, and team activity"
                className="block w-full object-cover object-left-top"
              />
            </div>
          </div>

          {HERO_STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'absolute hidden rounded-xl border border-[#E8ECF1] bg-white px-3 py-2 shadow-[0_4px_16px_rgba(15,23,42,0.08)] sm:block',
                i === 0 && '-left-2 top-8 lg:-left-6',
                i === 1 && '-right-2 top-1/2 -translate-y-1/2 lg:-right-4',
                i === 2 && 'bottom-6 left-8 lg:left-12',
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                {stat.label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-bold text-[#151D2B]">
                {i === 0 ? <Radio className="size-3 text-[#EF4444]" /> : null}
                {i === 1 ? <Users className="size-3 text-[#016BE6]" /> : null}
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
