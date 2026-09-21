import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LANDING_ASSETS } from '../constants/landing.constants';
import { useLandingChrome } from '../landing-chrome';
import { useLandingCopy } from '../useLandingCopy';

type Props = {
  user: { name?: string } | null;
};

export function LandingCta({ user }: Props) {
  const copy = useLandingCopy();
  const href = user ? '/app' : '/auth';
  const label = user ? copy.cta.actionAuthed : copy.cta.action;

  return (
    <section className="border-t border-[#E6EAF0] bg-[#F6F8FB] py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em] text-[#0B1220]">
          {copy.cta.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#5A6B7C]">{copy.cta.body}</p>
        <Link
          to={href}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-[#016BE6] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#0A4FBF]"
        >
          {label}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const copy = useLandingCopy();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0B1220] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <img src={LANDING_ASSETS.logoSidebar} alt="Samtal" className="h-8 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#9AA8B5]">{copy.footer.blurb}</p>
        </div>
        <FooterCol title={copy.footer.product} items={copy.footer.productItems} sectionId="product" />
        <FooterCol title={copy.footer.company} items={copy.footer.companyItems} />
        <FooterCol title={copy.footer.legal} items={copy.footer.legalItems} sectionId="security" />
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-[12px] text-[#7A8896] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>© {year} Samtal. {copy.footer.rights}</span>
          <span>EN · العربية</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
  sectionId,
}: {
  title: string;
  items: readonly string[];
  sectionId?: string;
}) {
  const { goSection } = useLandingChrome();
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A8896]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item}>
            {sectionId ? (
              <button
                type="button"
                onClick={() => goSection(sectionId)}
                className="text-[13px] text-[#C5D0DA] transition-colors hover:text-white"
              >
                {item}
              </button>
            ) : (
              <span className="text-[13px] text-[#C5D0DA]">{item}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
