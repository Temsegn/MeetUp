import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LANDING_ASSETS, NAV_LINKS } from '../constants/landing.constants';

type Props = {
  user: { name?: string } | null;
};

export function LandingNav({ user }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-colors duration-200',
        scrolled
          ? 'border-[#E8ECF1] bg-white/90 backdrop-blur-md'
          : 'border-transparent bg-white',
      )}
    >
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Samtal home">
          <img src={LANDING_ASSETS.logo} alt="Samtal" className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] font-semibold text-[#6F7B8C] transition-colors hover:text-[#016BE6]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Link
              to="/app"
              className="inline-flex h-10 items-center rounded-full bg-[#DC6C7C] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#C85A6A]"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-[13px] font-semibold text-[#6F7B8C] transition-colors hover:text-[#151D2B]"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                className="inline-flex h-10 items-center rounded-full bg-[#DC6C7C] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#C85A6A]"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-[#6F7B8C] hover:bg-[#F1F5F9] md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#E8ECF1] bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[14px] font-semibold text-[#151D2B] hover:bg-[#F8FAFC]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-[#F1F4F8] pt-3">
            {user ? (
              <Link
                to="/app"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#DC6C7C] text-[13px] font-semibold text-white"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E1E7EE] text-[13px] font-semibold text-[#334155]"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#DC6C7C] text-[13px] font-semibold text-white"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
