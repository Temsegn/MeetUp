import type { ComponentType, SVGProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Calendar,
  Contact,
  MessageSquare,
  Film,
  Building2,
  LayoutTemplate,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronDown,
  ArrowUpRight,
  Shield,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { APP_NAV } from '../nav';
import { useAuth } from '../../../contexts/AuthContext';
import { ADMIN_NAV } from '../../admin/nav';

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>;

const ICONS: Record<string, NavIcon> = {
  Dashboard: LayoutDashboard,
  Meetings: Video,
  Calendar,
  Contacts: Contact,
  Messages: MessageSquare,
  Recordings: Film,
  Workspace: Building2,
  Templates: LayoutTemplate,
  Reports: BarChart3,
  'AI Insights': Sparkles,
  Settings,
};

function navItemActive(
  pathname: string,
  item: (typeof APP_NAV)[number],
  isActive: boolean,
): boolean {
  if (item.label === 'Meetings' && /^\/app\/meeting(\/|$)/.test(pathname)) {
    return true;
  }
  if ('matchSections' in item && item.matchSections) {
    const parts = pathname.split('/');
    const section = parts[3];
    if (pathname.startsWith('/app/settings') && section) {
      return (item.matchSections as readonly string[]).includes(section);
    }
    if (pathname === '/app/settings' && item.label === 'Settings') return true;
    return false;
  }
  return isActive;
}

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
};

export function AppSidebar({ collapsed, onToggle, onNavigate }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isPlatformAdmin =
    user?.platformRole === 'admin' || user?.platformRole === 'super_admin';
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith('/admin'));
  const adminRef = useRef<HTMLDivElement>(null);
  const w = collapsed ? 'w-[100px]' : 'w-[228px]';

  useEffect(() => {
    if (pathname.startsWith('/admin')) setAdminOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!adminOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!adminRef.current?.contains(e.target as Node)) setAdminOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [adminOpen]);

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col bg-[#016BE6] text-white transition-[width] duration-200',
        w,
        collapsed ? 'items-center px-1.5 pb-2 pt-1.5' : 'px-3 pb-2 pt-1.5',
      )}
    >
      <div
        className={cn(
          'mb-3 flex h-[100px] w-full shrink-0 items-center pt-0.5',
          collapsed ? 'justify-center gap-2' : 'gap-3',
        )}
      >
        <button
          type="button"
          onClick={() => {
            navigate('/app');
            onNavigate?.();
          }}
          className={cn(
            'flex h-full items-center',
            collapsed ? 'w-12 shrink-0 justify-center' : 'min-w-0 flex-1 justify-start',
          )}
          aria-label="Samtal home"
        >
          {collapsed ? (
            <img src="/samtal-mark.png" alt="Samtal" className="h-11 w-11 object-contain" />
          ) : (
            <img
              src="/samtal-logo-sidebar.png?v=5"
              alt="Samtal"
              className="h-[72px] w-full max-w-none object-contain object-left"
            />
          )}
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="hidden size-6 shrink-0 items-center justify-center self-center rounded-full border-[1.5px] border-white bg-transparent text-white transition-colors hover:bg-white/15 lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn('size-3.5', collapsed && 'rotate-180')}
            strokeWidth={2.25}
          />
        </button>
      </div>

      <nav
        className={cn(
          'scrollbar-none flex flex-1 flex-col overflow-y-auto',
          collapsed ? 'w-full items-center gap-1.5' : 'gap-1.5',
        )}
      >
        {APP_NAV.map((item) => {
          const Icon = ICONS[item.label] ?? LayoutDashboard;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center rounded-[10px] transition-colors',
                  collapsed ? 'size-9 justify-center' : 'min-h-9 w-full gap-2 px-2.5 py-2',
                  navItemActive(pathname, item, isActive)
                    ? 'bg-black/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-none">
                  {item.label}
                </span>
              )}
              {!collapsed && 'badge' in item && item.badge ? (
                <span className="shrink-0 rounded-full bg-[#E7000B] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}

        {isPlatformAdmin ? (
          <div ref={adminRef} className="relative mt-1 w-full">
            <button
              type="button"
              title="Platform Admin"
              aria-expanded={adminOpen}
              onClick={() => setAdminOpen((o) => !o)}
              className={cn(
                'flex w-full items-center rounded-[10px] transition-colors',
                collapsed ? 'mx-auto size-9 justify-center' : 'min-h-9 gap-2 px-2.5 py-2',
                pathname.startsWith('/admin') || adminOpen
                  ? 'bg-black/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <Shield className="size-[18px] shrink-0" strokeWidth={2} />
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-left text-[14px] font-medium leading-none">
                    Platform Admin
                  </span>
                  <ChevronDown
                    className={cn('size-3.5 shrink-0 transition', adminOpen && 'rotate-180')}
                    strokeWidth={2.25}
                  />
                </>
              ) : null}
            </button>

            {adminOpen && !collapsed ? (
              <div className="mt-1 overflow-hidden rounded-[12px] bg-[#0047A8]/55 p-1.5 shadow-lg ring-1 ring-white/10">
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold tracking-[0.08em] text-white/70">
                  ADMIN
                </p>
                <div className="flex flex-col gap-0.5">
                  {ADMIN_NAV.map((item) => {
                    const Icon = item.icon;
                    const active =
                      'end' in item && item.end
                        ? pathname === item.to
                        : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => {
                          navigate(item.to);
                          setAdminOpen(false);
                          onNavigate?.();
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12px] font-medium transition',
                          active
                            ? 'bg-white text-[#016BE6]'
                            : 'text-white/90 hover:bg-white/10',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {adminOpen && collapsed ? (
              <div className="absolute top-0 left-[calc(100%+8px)] z-50 w-[200px] overflow-hidden rounded-[12px] bg-[#016BE6] p-1.5 shadow-xl ring-1 ring-white/15">
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold tracking-[0.08em] text-white/70">
                  ADMIN
                </p>
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => {
                        navigate(item.to);
                        setAdminOpen(false);
                        onNavigate?.();
                      }}
                      className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12px] font-medium text-white/90 hover:bg-white/10"
                    >
                      <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto flex w-full justify-center pb-1 pt-3">
        {collapsed ? (
          <div className="mx-auto flex min-h-[88px] w-[92%] flex-col overflow-hidden rounded-lg bg-white/15 px-1.5 py-2 text-center">
            <button
              type="button"
              title="Upgrade to Pro"
              onClick={() => {
                navigate('/app/billing');
                onNavigate?.();
              }}
              className="flex min-h-[72px] w-full flex-1 flex-col items-center justify-center gap-1"
            >
              <ArrowUpRight className="size-3 text-white" strokeWidth={2} />
              <span className="text-[8px] font-semibold leading-tight text-white">Pro</span>
              <span className="mt-0.5 flex h-5 w-full items-center justify-center rounded bg-white text-[7px] font-bold text-[#016BE6]">
                Upgrade
              </span>
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-[88%] flex-col overflow-hidden rounded-lg bg-white/15 px-2 py-1.5">
            <div className="mb-1 flex h-9 w-full items-center justify-center overflow-hidden rounded-md">
              <img
                src="/upgrade-pro-people.png"
                alt=""
                className="h-full w-full object-cover object-center mix-blend-screen"
              />
            </div>
            <p className="text-center text-[10px] font-semibold text-white">Upgrade to Pro</p>
            <p className="mt-0.5 text-center text-[8px] leading-snug text-white/70">Unlock premium.</p>
            <button
              type="button"
              onClick={() => {
                navigate('/app/billing');
                onNavigate?.();
              }}
              className="mt-1.5 flex h-6 w-full items-center justify-center gap-0.5 rounded-md bg-white text-[9px] font-semibold text-[#016BE6] hover:bg-blue-50"
            >
              Upgrade
              <ArrowUpRight className="size-2.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
