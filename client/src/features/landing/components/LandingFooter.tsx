import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LANDING_ASSETS } from '../constants/landing.constants';
import { LP_EYEBROW, LP_PRIMARY } from '../landing-ui';
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
    <section className="border-t border-[#E1E7EE] bg-[#F5F7FA] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[14px] border border-[#E2E7ED] bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_240px_at_50%_-40px,rgba(1,107,230,0.10)_0%,transparent_70%)]"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight text-[#151D2B]">
              {copy.cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#6F7B8C]">{copy.cta.body}</p>
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
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const copy = useLandingCopy();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#151D2B] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <img src={LANDING_ASSETS.logoSidebar} alt="Samtal" className="h-8 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#94A3B8]">{copy.footer.blurb}</p>
        </div>
        <FooterCol title={copy.footer.product} items={copy.footer.productItems} />
        <FooterCol title={copy.footer.company} items={copy.footer.companyItems} />
        <FooterCol title={copy.footer.legal} items={copy.footer.legalItems} />
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-[12px] text-[#94A3B8] sm:px-8">
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
      <h4 className={`${LP_EYEBROW} text-[#94A3B8]`}>{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <Link to={item.to} className="text-[13px] text-[#CBD5E1] hover:text-white">
                {item.label}
              </Link>
            ) : item.sectionId ? (
              <button
                type="button"
                onClick={() => goSection(item.sectionId!)}
                className="text-[13px] text-[#CBD5E1] hover:text-white"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[13px] text-[#CBD5E1]">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
