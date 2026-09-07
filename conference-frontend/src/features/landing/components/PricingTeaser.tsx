import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { PRICING_TIERS } from '../constants/landing.constants';

type Props = {
  user: { name?: string } | null;
};

export function PricingTeaser({ user }: Props) {
  const ctaHref = user ? '/app' : '/auth';

  return (
    <section id="pricing" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#016BE6]">
            Pricing
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[#151D2B]">
            Simple plans that scale with your team
          </h2>
          <p className="mt-3 text-[14px] text-[#6F7B8C]">
            Start free. Upgrade when you need recordings, reports, and admin controls.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6',
                tier.highlighted
                  ? 'border-[#016BE6] ring-1 ring-[#016BE6]/20'
                  : 'border-[#E8ECF1]',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-bold text-[#151D2B]">{tier.name}</h3>
                {tier.highlighted ? (
                  <span className="rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[10px] font-bold text-[#016BE6]">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3">
                <span className="text-[32px] font-bold tracking-tight text-[#151D2B]">
                  {tier.price}
                </span>
                <span className="ml-1 text-[12px] text-[#8A94A6]">{tier.period}</span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#6F7B8C]">{tier.description}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-[#334155]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#016BE6]" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={ctaHref}
                className={cn(
                  'mt-6 inline-flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold transition-colors',
                  tier.highlighted
                    ? 'bg-[#016BE6] text-white hover:bg-[#0056EF]'
                    : 'border border-[#E1E7EE] bg-white text-[#334155] hover:bg-[#F8FAFC]',
                )}
              >
                {user ? 'Open app' : tier.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
