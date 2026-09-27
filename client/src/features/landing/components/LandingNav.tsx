import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LANDING_ASSETS, NAV_LINKS } from '../constants/landing.constants';
import { LP_GHOST, LP_NAV_PRIMARY } from '../landing-ui';
import { useLandingChrome } from '../landing-chrome';
import { useLandingLocale } from '../landing-locale';
import { useLandingCopy } from '../useLandingCopy';
import { AppEntryLink, AuthLink } from './LandingLinks';

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
    workspace: copy.nav.workspace,
    security: copy.nav.security,
    pricing: copy.nav.pricing,
  };

  const goHome = () => {
    setMobileOpen(false);
    if (pathname !== '/') navigate('/');
    else goSection('top');
  };

  return (
    <header className="relative z-30 shrink-0 border-b border-[#E1E7EE] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid min-h-[4rem] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <button type="button" onClick={goHome} className="flex shrink-0 items-center justify-self-start" aria-label="Samtal">
          <img src={LANDING_ASSETS.logo} alt="Samtal" className="h-8 w-auto" />
        </button>

        <nav className="hidden items-center justify-center md:flex" aria-label="Main">
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => goSection(link.id)}
                className={cn(
                  'rounded-[14px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  activeId === link.id
                    ? 'bg-[#E8F1FE] text-[#016BE6]'
                    : 'text-[#6F7B8C] hover:bg-[#F5F7FA] hover:text-[#151D2B]',
                )}
              >
                {navLabels[link.id]}
              </button>
            ))}
          </div>
        </nav>

        <div className="hidden items-center justify-self-end gap-2 md:flex">
          <div className="me-1 flex rounded-[14px] border border-[#E1E7EE] bg-white p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={cn(
                'rounded-[12px] px-2.5 py-1',
                locale === 'en' ? 'bg-[#016BE6] text-white' : 'text-[#6F7B8C]',
              )}
            >
              {copy.nav.langEn}
            </button>
            <button
              type="button"
              onClick={() => setLocale('ar')}
              className={cn(
                'rounded-[12px] px-2.5 py-1',
                locale === 'ar' ? 'bg-[#016BE6] text-white' : 'text-[#6F7B8C]',
              )}
            >
              {copy.nav.langAr}
            </button>
          </div>
          {user ? (
            <AppEntryLink className={LP_NAV_PRIMARY}>{copy.nav.openDashboard}</AppEntryLink>
          ) : (
            <>
              <AuthLink to="/auth" className="px-2.5 text-[13px] font-semibold text-[#6F7B8C] hover:text-[#151D2B]">
                {copy.nav.signIn}
              </AuthLink>
              <AuthLink to="/auth/sign-up" className={LP_NAV_PRIMARY}>
                {copy.nav.getStarted}
              </AuthLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="justify-self-end rounded-[14px] p-2 text-[#6F7B8C] hover:bg-[#F5F7FA] md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-[#E1E7EE] bg-white px-4 py-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.2)] md:hidden">
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
                  'rounded-[14px] px-3 py-2.5 text-start text-[14px] font-semibold hover:bg-[#F5F7FA]',
                  activeId === link.id ? 'bg-[#E8F1FE] text-[#016BE6]' : 'text-[#151D2B]',
                )}
              >
                {navLabels[link.id]}
              </button>
            ))}
          </nav>
          <div className="mt-3 flex gap-2 border-t border-[#E8ECF1] pt-3">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={cn(
                'h-10 flex-1 rounded-[14px] border text-[13px] font-semibold',
                locale === 'en' ? 'border-[#016BE6] bg-[#016BE6] text-white' : 'border-[#E1E7EE] text-[#334155]',
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('ar')}
              className={cn(
                'h-10 flex-1 rounded-[14px] border text-[13px] font-semibold',
                locale === 'ar' ? 'border-[#016BE6] bg-[#016BE6] text-white' : 'border-[#E1E7EE] text-[#334155]',
              )}
            >
              عربي
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {user ? (
              <AppEntryLink className={LP_NAV_PRIMARY} onClick={() => setMobileOpen(false)}>
                {copy.nav.openDashboard}
              </AppEntryLink>
            ) : (
              <>
                <AuthLink to="/auth" onClick={() => setMobileOpen(false)} className={LP_GHOST}>
                  {copy.nav.signIn}
                </AuthLink>
                <AuthLink to="/auth/sign-up" onClick={() => setMobileOpen(false)} className={LP_NAV_PRIMARY}>
                  {copy.nav.getStarted}
                </AuthLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
