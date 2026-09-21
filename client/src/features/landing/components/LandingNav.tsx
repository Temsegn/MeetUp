import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { frontendUrl } from '../../../lib/frontendUrl';
import { LANDING_ASSETS, NAV_LINKS } from '../constants/landing.constants';
import { useLandingChrome } from '../landing-chrome';
import { useLandingLocale } from '../landing-locale';
import { useLandingCopy } from '../useLandingCopy';

type Props = {
  user: { name?: string } | null;
};

export function LandingNav({ user }: Props) {
  const copy = useLandingCopy();
  const { locale, setLocale } = useLandingLocale();
  const { goSection, activeId, pathname } = useLandingChrome();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLabels: Record<(typeof NAV_LINKS)[number]['id'], string> = {
    product: copy.nav.product,
    platform: copy.nav.platform,
    security: copy.nav.security,
    pricing: copy.nav.pricing,
  };

  const goHome = () => {
    setMobileOpen(false);
    if (pathname !== '/') navigate('/');
    else goSection('top');
  };

  return (
    <header className="relative z-30 shrink-0 border-b border-[#E8EEF4] bg-white/90 backdrop-blur-xl">
      <div className="grid h-[4.25rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-7">
        <button type="button" onClick={goHome} className="flex shrink-0 items-center justify-self-start" aria-label="Samtal">
          <img src={LANDING_ASSETS.logo} alt="Samtal" className="h-8 w-auto" />
        </button>

        <nav className="hidden items-center justify-center lg:flex" aria-label="Main">
          <div className="flex items-center gap-0.5 rounded-full bg-[#F4F7FB] p-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => goSection(link.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  activeId === link.id
                    ? 'bg-white text-[#0B1220] shadow-[0_1px_2px_rgba(15,35,70,0.08)]'
                    : 'text-[#5A6B7C] hover:text-[#0B1220]',
                )}
              >
                {navLabels[link.id]}
              </button>
            ))}
          </div>
        </nav>

        <div className="hidden items-center justify-self-end gap-2 lg:flex">
          <div className="me-1 flex rounded-full border border-[#E6EAF0] bg-white p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={cn(
                'rounded-full px-2.5 py-1',
                locale === 'en' ? 'bg-[#0B1220] text-white' : 'text-[#5A6B7C]',
              )}
            >
              {copy.nav.langEn}
            </button>
            <button
              type="button"
              onClick={() => setLocale('ar')}
              className={cn(
                'rounded-full px-2.5 py-1',
                locale === 'ar' ? 'bg-[#0B1220] text-white' : 'text-[#5A6B7C]',
              )}
            >
              {copy.nav.langAr}
            </button>
          </div>
          {user ? (
            <a
              href={frontendUrl('/app')}
              className="inline-flex h-10 items-center rounded-full bg-[#016BE6] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0A4FBF]"
            >
              {copy.nav.openDashboard}
            </a>
          ) : (
            <>
              <a
                href={frontendUrl('/auth')}
                onClick={() => setMobileOpen(false)}
                className="px-2.5 text-[13px] font-semibold text-[#5A6B7C] transition-colors hover:text-[#0B1220]"
              >
                {copy.nav.signIn}
              </a>
              <a
                href={frontendUrl('/auth')}
                className="inline-flex h-10 items-center rounded-full bg-[#016BE6] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0A4FBF]"
              >
                {copy.nav.getStarted}
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          className="justify-self-end rounded-lg p-2 text-[#5A6B7C] hover:bg-[#F4F7FB] lg:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-[#E6EAF0] bg-white px-4 py-4 shadow-[0_16px_40px_-24px_rgba(15,35,70,0.35)] lg:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  goSection(link.id);
                }}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-start text-[14px] font-medium hover:bg-[#F4F7FB]',
                  activeId === link.id ? 'bg-[#F4F7FB] text-[#016BE6]' : 'text-[#0B1220]',
                )}
              >
                {navLabels[link.id]}
              </button>
            ))}
          </nav>
          <div className="mt-3 flex gap-2 border-t border-[#EEF2F6] pt-3">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={cn(
                'h-10 flex-1 rounded-lg border text-[13px] font-semibold',
                locale === 'en' ? 'border-[#0B1220] bg-[#0B1220] text-white' : 'border-[#E6EAF0]',
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('ar')}
              className={cn(
                'h-10 flex-1 rounded-lg border text-[13px] font-semibold',
                locale === 'ar' ? 'border-[#0B1220] bg-[#0B1220] text-white' : 'border-[#E6EAF0]',
              )}
            >
              عربي
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {user ? (
              <a
                href={frontendUrl('/app')}
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#016BE6] text-[13px] font-semibold text-white"
              >
                {copy.nav.openDashboard}
              </a>
            ) : (
              <>
                <a
                  href={frontendUrl('/auth')}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#E6EAF0] text-[13px] font-semibold text-[#0B1220]"
                >
                  {copy.nav.signIn}
                </a>
                <a
                  href={frontendUrl('/auth')}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#016BE6] text-[13px] font-semibold text-white"
                >
                  {copy.nav.getStarted}
                </a>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
