import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LandingLocale = 'en' | 'ar';

type Ctx = {
  locale: LandingLocale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: LandingLocale) => void;
};

const LandingLocaleContext = createContext<Ctx | null>(null);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LandingLocale>('en');
  const value = useMemo<Ctx>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      setLocale,
    }),
    [locale],
  );
  return <LandingLocaleContext.Provider value={value}>{children}</LandingLocaleContext.Provider>;
}

export function useLandingLocale() {
  const ctx = useContext(LandingLocaleContext);
  if (!ctx) throw new Error('useLandingLocale must be used within LandingLocaleProvider');
  return ctx;
}
