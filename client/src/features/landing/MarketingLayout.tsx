import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuth } from '../../contexts/AuthContext';
import { LandingNav } from './components/LandingNav';
import { LandingChromeProvider } from './landing-chrome';
import { LandingLocaleProvider, useLandingLocale } from './landing-locale';

const SECTION_IDS = ['product', 'platform', 'security', 'pricing'] as const;

export function MarketingLayout() {
  return (
    <LandingLocaleProvider>
      <MarketingLayoutInner />
    </LandingLocaleProvider>
  );
}

function MarketingLayoutInner() {
  const { user } = useAuth();
  const { dir, locale } = useLandingLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState('top');

  const scrollTo = useCallback((id: string) => {
    const root = scrollRef.current;
    if (!root) return;
    if (id === 'top') {
      root.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveId('top');
      return;
    }
    const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goSection = useCallback(
    (id: string) => {
      if (location.pathname !== '/') {
        navigate(id === 'top' ? '/' : `/#${id}`);
        return;
      }
      scrollTo(id);
    },
    [location.pathname, navigate, scrollTo],
  );

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveId('');
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    const hash = location.hash.replace('#', '');
    if (!hash) {
      setActiveId('top');
      return;
    }
    let tries = 0;
    let timer = 0;
    const run = () => {
      const el = scrollRef.current?.querySelector(`#${CSS.escape(hash)}`);
      if (!el && tries < 12) {
        tries += 1;
        timer = window.setTimeout(run, 50);
        return;
      }
      if (el) scrollTo(hash);
    };
    timer = window.setTimeout(run, 50);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash, scrollTo]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || location.pathname !== '/') return;

    const sections = SECTION_IDS.map((id) => root.querySelector(`#${id}`)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
        else if (root.scrollTop < 80) setActiveId('top');
      },
      { root, rootMargin: '-12% 0px -70% 0px', threshold: [0.1, 0.35, 0.6] },
    );
    sections.forEach((section) => io.observe(section));
    return () => io.disconnect();
  }, [location.pathname]);

  const chrome = useMemo(
    () => ({ scrollTo, goSection, activeId, pathname: location.pathname }),
    [scrollTo, goSection, activeId, location.pathname],
  );

  const isAuth = location.pathname.startsWith('/auth');

  return (
    <LandingChromeProvider value={chrome}>
      <div
        dir={dir}
        lang={locale}
        className="samtal-light flex h-full min-h-0 flex-col bg-[#C5D4E6] p-2.5 font-sans text-[#0B1220] antialiased sm:p-4"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_28px_80px_-36px_rgba(15,35,70,0.45)] sm:rounded-[28px]">
          <LandingNav user={user} />
          <div
            ref={scrollRef}
            className={cn(
              'min-h-0 flex-1 overflow-x-hidden',
              isAuth ? 'flex flex-col overflow-hidden' : 'overflow-y-auto scroll-smooth',
            )}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </LandingChromeProvider>
  );
}
