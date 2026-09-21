import { createContext, useContext, type ReactNode } from 'react';

type LandingChrome = {
  scrollTo: (id: string) => void;
  goSection: (id: string) => void;
  activeId: string;
  pathname: string;
};

const LandingChromeContext = createContext<LandingChrome | null>(null);

export function LandingChromeProvider({
  value,
  children,
}: {
  value: LandingChrome;
  children: ReactNode;
}) {
  return <LandingChromeContext.Provider value={value}>{children}</LandingChromeContext.Provider>;
}

export function useLandingChrome() {
  const ctx = useContext(LandingChromeContext);
  if (!ctx) throw new Error('useLandingChrome must be used within MarketingLayout');
  return ctx;
}
