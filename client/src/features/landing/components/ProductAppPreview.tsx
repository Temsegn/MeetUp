import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Contact,
  Film,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Settings,
  Sparkles,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LANDING_ASSETS } from '../constants/landing.constants';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'meetings', label: 'Meetings', Icon: Video },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'contacts', label: 'Contacts', Icon: Contact },
  { id: 'messages', label: 'Messages', Icon: MessageSquare },
  { id: 'recordings', label: 'Recordings', Icon: Film },
  { id: 'workspace', label: 'Workspace', Icon: Building2 },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'reports', label: 'Reports', Icon: BarChart3 },
  { id: 'ai', label: 'AI Insights', Icon: Sparkles, badge: 'Beta' },
  { id: 'settings', label: 'Settings', Icon: Settings },
] as const;

type PreviewId = 'dashboard' | 'meetings' | 'calendar' | 'contacts' | 'messages' | 'recordings' | 'workspace';

const SCREEN: Record<PreviewId, string> = {
  dashboard: LANDING_ASSETS.heroDashboard,
  meetings: LANDING_ASSETS.moduleMeetings,
  calendar: LANDING_ASSETS.moduleCalendar,
  contacts: LANDING_ASSETS.moduleMeetings,
  messages: LANDING_ASSETS.moduleMessages,
  recordings: LANDING_ASSETS.moduleRecordings,
  workspace: LANDING_ASSETS.heroDashboard,
};

const TITLE: Record<PreviewId, string> = {
  dashboard: 'Dashboard',
  meetings: 'Meetings',
  calendar: 'Calendar',
  contacts: 'Contacts',
  messages: 'Messages',
  recordings: 'Recordings',
  workspace: 'Workspace',
};

type Props = {
  active?: PreviewId;
  alt: string;
  className?: string;
  size?: 'hero' | 'section';
};

/** Decorative clone of the signed-in app shell (sidebar + header + canvas). */
export function ProductAppPreview({ active = 'dashboard', alt, className, size = 'section' }: Props) {
  const screen = SCREEN[active];
  const hero = size === 'hero';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[14px] border border-[#E2E7ED] bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]',
        className,
      )}
    >
      <div className={cn('flex min-w-0 bg-[#F5F7FA]', hero ? 'min-h-[240px] sm:min-h-[340px] lg:min-h-[400px]' : 'min-h-[220px] sm:min-h-[300px]')}>
        <aside
          className={cn(
            'hidden shrink-0 flex-col bg-[#016BE6] text-white sm:flex',
            hero ? 'w-[158px] px-2.5 py-3' : 'w-[148px] px-2 py-2.5',
          )}
        >
          <img
            src="/samtal-logo-sidebar.png?v=5"
            alt=""
            className="mb-3 h-7 w-auto object-contain object-left"
          />
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden" aria-hidden>
            {NAV.filter((item) => hero || !['templates', 'reports', 'ai'].includes(item.id)).map((item) => {
              const Icon = item.Icon;
              const on =
                item.id === active ||
                (active === 'workspace' && item.id === 'workspace') ||
                (active === 'dashboard' && item.id === 'dashboard');
              return (
                <span
                  key={item.id}
                  className={cn(
                    'flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[11px] font-medium leading-none',
                    on ? 'bg-black/20 text-white' : 'text-white/80',
                  )}
                >
                  <Icon className="size-[14px] shrink-0" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {'badge' in item && item.badge ? (
                    <span className="shrink-0 rounded-full bg-[#E7000B] px-1.5 py-0.5 text-[8px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </nav>
          <div className="mt-2 overflow-hidden rounded-lg bg-white/15 px-2 py-1.5">
            <p className="text-center text-[10px] font-semibold text-white">Upgrade to Pro</p>
            <p className="mt-0.5 text-center text-[8px] leading-snug text-white/70">Unlock premium.</p>
            <span className="mt-1.5 flex h-5 items-center justify-center rounded bg-white text-[8px] font-bold text-[#016BE6]">
              Upgrade
            </span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#E8ECF1] bg-white px-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold tracking-tight text-[#151D2B]">{TITLE[active]}</p>
              <p className="hidden text-[10px] text-[#6F7B8C] sm:block">Samtal</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-7 items-center gap-1 rounded-[14px] bg-[#016BE6] px-2.5 text-[10px] font-semibold text-white">
                New Meeting
                <ArrowUpRight className="size-3" />
              </span>
              <span className="hidden size-7 items-center justify-center rounded-[14px] border border-[#E1E7EE] text-[#1E293B] sm:inline-flex">
                <Bell className="size-3.5" strokeWidth={2} />
              </span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#016BE6] text-[10px] font-bold text-white">
                SA
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-2 sm:p-2.5">
            <img
              src={screen}
              alt={alt}
              className="h-full min-h-[180px] w-full rounded-[10px] border border-[#E8ECF1] object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
