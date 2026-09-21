import { Check } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { frontendUrl } from '../../../lib/frontendUrl';
import { useLandingCopy } from '../useLandingCopy';

type Props = {
  user: { name?: string } | null;
};

export function PricingTeaser({ user }: Props) {
  const copy = useLandingCopy();
  const ctaHref = frontendUrl(user ? '/app' : '/auth');

  return (
    <section id="pricing" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            {copy.pricing.eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em] text-[#0B1220]">
            {copy.pricing.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5A6B7C]">{copy.pricing.body}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {copy.pricing.tiers.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                'flex flex-col rounded-2xl border p-7',
                tier.highlighted
                  ? 'border-[#016BE6] bg-[#F4F8FF] shadow-[0_20px_50px_-32px_rgba(1,107,230,0.45)]'
                  : 'border-[#E6EAF0] bg-white',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[#5A6B7C]">
                  {tier.name}
                </h3>
                {tier.highlighted ? (
                  <span className="rounded-full bg-[#016BE6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Pro
                  </span>
                ) : null}
              </div>
              <p className="mt-5">
                <span className="text-[36px] font-semibold tracking-tight text-[#0B1220]">
                  {tier.price}
                </span>
                <span className="ms-2 text-[12px] text-[#7A8896]">{tier.period}</span>
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#5A6B7C]">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-[#0B1220]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#016BE6]" strokeWidth={2.25} />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={ctaHref}
                className={cn(
                  'mt-8 inline-flex h-11 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors',
                  tier.highlighted
                    ? 'bg-[#016BE6] text-white hover:bg-[#0A4FBF]'
                    : 'border border-[#D9E0E8] bg-white text-[#0B1220] hover:bg-[#F4F7FB]',
                )}
              >
                {user ? copy.pricing.openApp : tier.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
