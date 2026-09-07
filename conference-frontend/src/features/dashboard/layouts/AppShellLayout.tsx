import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from '../components/AppSidebar';
import { cn } from '../../../lib/cn';
import { useAppPresence } from '../../messages/hooks/useAppPresence';

export function AppShellLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  useAppPresence();
  const isLiveMeetingRoom = /^\/app\/meeting\/[^/]+$/.test(pathname);
  const isRecordingWatch =
    /^\/app\/recordings\/[^/]+$/.test(pathname);
  const isSettingsWorkspace =
    pathname.startsWith('/app/settings') || pathname.startsWith('/app/workspace');
  const isMessages = pathname.startsWith('/app/messages');
  const lockViewport = isLiveMeetingRoom || isRecordingWatch || isSettingsWorkspace || isMessages;

  // Live meeting: full-bleed only — no app sidebar, mobile nav, or page chrome
  if (isLiveMeetingRoom) {
    return (
      <div className="samtal-light flex h-full min-h-0 w-full overflow-hidden bg-white">
        <main className="min-h-0 flex-1 overflow-hidden bg-white">
          <div className="h-full min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="samtal-light flex h-full min-h-0 w-full overflow-hidden bg-white">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:static lg:z-20 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#E1E7EE] bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 hover:bg-[#F1F5F9]"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-[#151D2B]" />
          </button>
          <span className="text-sm font-semibold text-[#151D2B]">Samtal</span>
          {mobileOpen ? (
            <button
              type="button"
              className="ml-auto rounded-xl p-2 hover:bg-[#F1F5F9]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <main
          className={cn(
            'min-h-0 flex-1 bg-white',
            'px-3.5 sm:px-5 md:pl-6',
            'pr-3 sm:pr-4 md:pr-5 lg:pr-6',
            lockViewport
              ? 'overflow-hidden py-3 sm:py-3'
              : 'overflow-y-auto py-3.5 sm:py-4',
            isSettingsWorkspace && 'py-0 sm:py-0',
          )}
        >
          <div className={cn(lockViewport && 'h-full min-h-0')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
