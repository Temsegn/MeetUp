import { createContext, useContext } from 'react';

type LiveMeetingShellContextValue = {
  /** Open the mobile app sidebar drawer (icon + text nav). */
  openMobileNav: () => void;
};

const LiveMeetingShellContext = createContext<LiveMeetingShellContextValue | null>(null);

export function LiveMeetingShellProvider({
  value,
  children,
}: {
  value: LiveMeetingShellContextValue;
  children: React.ReactNode;
}) {
  return (
    <LiveMeetingShellContext.Provider value={value}>{children}</LiveMeetingShellContext.Provider>
  );
}

export function useLiveMeetingShell() {
  return useContext(LiveMeetingShellContext);
}
