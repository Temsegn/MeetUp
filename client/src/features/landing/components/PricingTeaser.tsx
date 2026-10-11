import { Check } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LandingBlueWash, LP_BODY, LP_EYEBROW, LP_GHOST, LP_H2, LP_PRIMARY } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';
import { AppEntryLink, AuthLink } from './LandingLinks';

type Props = {
  user: { name?: string } | null;
};

export function PricingTeaser({ user }: Props) {
  const copy = useLandingCopy();

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden bg-[#F3F8FF] py-20 sm:py-28">
      <LandingBlueWash variant="light" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.pricing.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.pricing.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.pricing.body}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {copy.pricing.tiers.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                'flex flex-col rounded-2xl border p-6 sm:p-7',
                tier.highlighted
                  ? 'border-[#016BE6] bg-white shadow-[0_20px_50px_-32px_rgba(1,107,230,0.45)]'
                  : 'border-[#E6EBF2] bg-white',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5B677A]">
                  {tier.name}
                </h3>
                {tier.highlighted ? (
                  <span className="inline-flex h-6 items-center rounded-md bg-[#EAF2FF] px-2 text-[11px] font-semibold text-[#016BE6]">
                    {copy.pricing.popular}
                  </span>
                ) : null}
              </div>
              <p className="mt-5">
                <span className="lp-display text-[36px] font-semibold tracking-tight text-[#0F172A]">
                  {tier.price}
                </span>
                <span className="ms-2 text-[13px] text-[#5B677A]">{tier.period}</span>
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5B677A]">{tier.description}</p>
              <ul className="mt-7 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[14px] text-[#0F172A]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#016BE6]" strokeWidth={2.25} />
                    {feature}
                  </li>
                ))}
              </ul>
              {user ? (
                <AppEntryLink className={cn('mt-8', tier.highlighted ? LP_PRIMARY : LP_GHOST)}>
                  {copy.pricing.openApp}
                </AppEntryLink>
              ) : (
                <AuthLink
                  to="/signup"
                  className={cn('mt-8', tier.highlighted ? LP_PRIMARY : LP_GHOST)}
                >
                  {tier.cta}
                </AuthLink>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
