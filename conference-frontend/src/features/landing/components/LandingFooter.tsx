import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LANDING_ASSETS } from '../constants/landing.constants';

type Props = {
  user: { name?: string } | null;
};

export function LandingCta({ user }: Props) {
  const href = user ? '/app' : '/auth';
  const label = user ? 'Go to dashboard' : 'Start your first meeting';

  return (
    <section className="bg-[#F1F6FD] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[#151D2B]">
          Ready when your team is
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6F7B8C]">
          Create an account and host your first Samtal meeting in minutes — no credit card
          required.
        </p>
        <Link
          to={href}
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[#DC6C7C] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#C85A6A]"
        >
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E8ECF1] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
        <div>
          <img src={LANDING_ASSETS.logoSidebar} alt="Samtal" className="h-8 w-auto" />
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#6F7B8C]">
            Connect with us — meetings, messages, and team work in one enterprise workspace.
          </p>
        </div>

        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#151D2B]">Product</h4>
          <ul className="mt-3 space-y-2">
            {['Meetings', 'Messages', 'Calendar', 'Recordings'].map((item) => (
              <li key={item}>
                <a
                  href="#product"
                  className="text-[13px] text-[#6F7B8C] transition-colors hover:text-[#016BE6]"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#151D2B]">Company</h4>
          <ul className="mt-3 space-y-2">
            {['About', 'Careers', 'Contact'].map((item) => (
              <li key={item}>
                <span className="text-[13px] text-[#6F7B8C]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#151D2B]">Legal</h4>
          <ul className="mt-3 space-y-2">
            {['Privacy', 'Terms', 'Security'].map((item) => (
              <li key={item}>
                <span className="text-[13px] text-[#6F7B8C]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[#F1F4F8] px-4 py-5 text-center text-[12px] text-[#8A94A6] sm:px-6">
        © {year} Samtal. All rights reserved.
      </div>
    </footer>
  );
}
