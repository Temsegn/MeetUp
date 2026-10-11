import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LANDING_ASSETS } from '../constants/landing.constants';
import { LP_PRIMARY } from '../landing-ui';
import { useLandingChrome } from '../landing-chrome';
import { useLandingCopy } from '../useLandingCopy';
import { AppEntryLink, AuthLink } from './LandingLinks';

type Props = {
  user: { name?: string } | null;
};

export function LandingCta({ user }: Props) {
  const copy = useLandingCopy();
  const label = user ? copy.cta.actionAuthed : copy.cta.action;

  return (
    <section className="relative overflow-hidden border-t border-[#E6EBF2] bg-[#0B1220] py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_360px_at_50%_-20%,rgba(1,107,230,0.35)_0%,transparent_65%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="lp-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold tracking-[-0.03em] text-white">
          {copy.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#94A3B8]">{copy.cta.body}</p>
        {user ? (
          <AppEntryLink className={`${LP_PRIMARY} mt-8`}>
            {label}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </AppEntryLink>
        ) : (
          <AuthLink to="/auth/sign-up" className={`${LP_PRIMARY} mt-8`}>
            {label}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </AuthLink>
        )}
      </div>
    </section>
  );
}

export function LandingFooter() {
  const copy = useLandingCopy();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#070B14] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <img src={LANDING_ASSETS.logoSidebar} alt="Samtal" className="h-8 w-auto brightness-0 invert" />
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-[#94A3B8]">{copy.footer.blurb}</p>
        </div>
        <FooterCol title={copy.footer.product} items={copy.footer.productItems} />
        <FooterCol title={copy.footer.company} items={copy.footer.companyItems} />
        <FooterCol title={copy.footer.legal} items={copy.footer.legalItems} />
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-[12px] text-[#64748B] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>
            © {year} Samtal. {copy.footer.rights}
          </span>
          <span>EN · العربية</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ label: string; sectionId?: string; to?: string }>;
}) {
  const { goSection } = useLandingChrome();
  return (
    <div>
      <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <Link to={item.to} className="text-[14px] text-[#CBD5E1] transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : item.sectionId ? (
              <button
                type="button"
                onClick={() => goSection(item.sectionId!)}
                className="text-[14px] text-[#CBD5E1] transition-colors hover:text-white"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[14px] text-[#CBD5E1]">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
