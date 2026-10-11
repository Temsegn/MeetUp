import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from '../components/AppSidebar';
import { cn } from '../../../lib/cn';
import { useAppPresence } from '../../messages/hooks/useAppPresence';
import { useAuth } from '../../../contexts/AuthContext';
import { LiveMeetingShellProvider } from './LiveMeetingShellContext';

export function AppShellLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaveNavOpen, setLeaveNavOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  useAppPresence();

  const isLiveMeetingRoom = /^\/app\/meeting\/[^/]+$/.test(pathname);
  const isRecordingWatch = /^\/app\/recordings\/[^/]+$/.test(pathname);
  const isSettingsWorkspace =
    pathname.startsWith('/app/settings') || pathname.startsWith('/app/workspace');
  const isMessages = pathname.startsWith('/app/messages');
  const lockViewport = isLiveMeetingRoom || isRecordingWatch || isSettingsWorkspace || isMessages;

  // Logged-in users in a live meeting: desktop keeps a collapsed rail; mobile uses hamburger drawer.
  const showAppSidebar = !isLiveMeetingRoom || Boolean(user);
  const forceCollapsedInMeeting = isLiveMeetingRoom && Boolean(user);
  const sidebarCollapsed = forceCollapsedInMeeting ? true : collapsed;

  useEffect(() => {
    if (!forceCollapsedInMeeting) return;
    setMobileOpen(false);
    setCollapsed(true);
  }, [forceCollapsedInMeeting, pathname]);

  const openMobileNav = useCallback(() => setMobileOpen(true), []);

  const shellValue = useMemo(() => ({ openMobileNav }), [openMobileNav]);

  const requestNavigate = useCallback(
    (to: string) => {
      if (isLiveMeetingRoom) {
        pendingNavRef.current = to;
        setMobileOpen(false);
        setLeaveNavOpen(true);
        return;
      }
      setMobileOpen(false);
      navigate(to);
    },
    [isLiveMeetingRoom, navigate],
  );

  const confirmLeaveAndNavigate = () => {
    const to = pendingNavRef.current || '/app/meetings';
    pendingNavRef.current = null;
    setLeaveNavOpen(false);
    // LiveMeetingPage listens and cleans up media/socket before navigating.
    window.dispatchEvent(
      new CustomEvent('samtal:request-leave-meeting', { detail: { to } }),
    );
  };

  return (
    <LiveMeetingShellProvider value={shellValue}>
      <div
        className={cn(
          'samtal-light flex w-full overflow-hidden bg-white',
          isLiveMeetingRoom
            ? 'h-[100svh] h-[100dvh] max-w-[100vw] overflow-x-hidden'
            : 'h-full min-h-0',
        )}
      >
        {mobileOpen && showAppSidebar ? (
          <button
            type="button"
            className={cn(
              'fixed inset-0 z-40 bg-black/40',
              forceCollapsedInMeeting ? 'lg:hidden' : 'lg:hidden',
            )}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        {showAppSidebar ? (
          <div
            className={cn(
              'z-50 transition-transform duration-200',
              forceCollapsedInMeeting
                ? cn(
                    // Mobile: off-canvas drawer with full labels when open
                    'fixed inset-y-0 left-0 lg:relative lg:static lg:z-20 lg:translate-x-0',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    'h-full min-h-0 shrink-0 self-stretch',
                  )
                : cn(
                    'fixed inset-y-0 left-0 lg:relative lg:static lg:z-20',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                  ),
            )}
          >
            <AppSidebar
              collapsed={sidebarCollapsed}
              // Mobile meeting drawer: full icon + text menu.
              forceExpanded={forceCollapsedInMeeting && mobileOpen}
              lockCollapsed={forceCollapsedInMeeting}
              onToggle={() => {
                if (forceCollapsedInMeeting) return;
                setCollapsed((c) => !c);
              }}
              onNavigate={() => setMobileOpen(false)}
              onNavIntent={forceCollapsedInMeeting ? requestNavigate : undefined}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'flex items-center gap-2 border-b border-[#E1E7EE] bg-white/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden',
              // During live meeting the hamburger lives in the meeting header instead.
              (isLiveMeetingRoom || forceCollapsedInMeeting) && 'hidden',
            )}
          >
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
              isLiveMeetingRoom
                ? 'overflow-hidden p-0'
                : cn(
                    'px-3.5 sm:px-5 md:pl-6',
                    'pr-3 sm:pr-4 md:pr-5 lg:pr-6',
                    lockViewport
                      ? 'overflow-hidden py-3 sm:py-3'
                      : 'overflow-y-auto py-3.5 sm:py-4',
                    isSettingsWorkspace && 'py-0 sm:py-0',
                  ),
            )}
          >
            <div className={cn(lockViewport && 'h-full min-h-0')}>
              <Outlet />
            </div>
          </main>
        </div>

        {leaveNavOpen ? (
          <div className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-meeting-nav-title"
              className="w-full max-w-md rounded-t-2xl border border-[#E8ECF1] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
            >
              <h2 id="leave-meeting-nav-title" className="text-[16px] font-bold text-[#151D2B]">
                Leave this meeting?
              </h2>
              <p className="mt-2 text-[13px] text-[#6F7B8C]">
                Are you sure you want to leave the meeting? You can rejoin later with the meeting
                link.
              </p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    pendingNavRef.current = null;
                    setLeaveNavOpen(false);
                  }}
                  className="h-12 rounded-xl border border-[#E1E7EE] px-4 text-[14px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:h-10 sm:text-[12px]"
                >
                  Stay in meeting
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveAndNavigate}
                  className="h-12 rounded-xl bg-[#DC2626] px-4 text-[14px] font-semibold text-white hover:bg-[#B91C1C] sm:h-10 sm:text-[12px]"
                >
                  Leave meeting
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </LiveMeetingShellProvider>
  );
}
