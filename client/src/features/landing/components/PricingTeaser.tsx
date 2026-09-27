import { Check } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LP_BODY, LP_EYEBROW, LP_GHOST, LP_H2, LP_PRIMARY } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';
import { AppEntryLink, AuthLink } from './LandingLinks';

type Props = {
  user: { name?: string } | null;
};

export function PricingTeaser({ user }: Props) {
  const copy = useLandingCopy();

  return (
    <section id="pricing" className="scroll-mt-20 bg-[#F5F7FA] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.pricing.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.pricing.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.pricing.body}</p>
        </div>

        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {copy.pricing.tiers.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                'flex flex-col rounded-[14px] border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7',
                tier.highlighted
                  ? 'border-[#016BE6] bg-[#F8FBFF] ring-1 ring-[#016BE6]/15'
                  : 'border-[#E2E7ED] bg-white',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[#6F7B8C]">{tier.name}</h3>
                {tier.highlighted ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-[#ECFDF3] px-2 text-[10px] font-semibold text-[#027A48]">
                    Pro
                  </span>
                ) : null}
              </div>
              <p className="mt-4">
                <span className="text-[32px] font-bold tracking-tight text-[#151D2B]">{tier.price}</span>
                <span className="ms-2 text-[12px] text-[#6F7B8C]">{tier.period}</span>
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#6F7B8C]">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-[#151D2B]">
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
                  to="/auth/sign-up"
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
