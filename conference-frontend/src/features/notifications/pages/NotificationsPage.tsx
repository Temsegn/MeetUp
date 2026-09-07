import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Trash2,
  Video,
  Building2,
  Info,
} from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import {
  useNotificationCenter,
  type NotificationItem,
  type NotificationKind,
} from '../../../contexts/NotificationCenterContext';
import { cn } from '../../../lib/cn';

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: typeof Bell; badge: string; iconWrap: string }
> = {
  message: {
    label: 'Message',
    icon: MessageSquare,
    badge: 'border-[#DBEAFE] bg-[#EFF6FF] text-[#016BE6]',
    iconWrap: 'bg-[#E8F1FF] text-[#016BE6]',
  },
  meeting: {
    label: 'Meeting',
    icon: Video,
    badge: 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]',
    iconWrap: 'bg-[#FFF7ED] text-[#EA580C]',
  },
  workspace: {
    label: 'Workspace',
    icon: Building2,
    badge: 'border-[#D1FAE5] bg-[#ECFDF5] text-[#059669]',
    iconWrap: 'bg-[#ECFDF5] text-[#059669]',
  },
  system: {
    label: 'System',
    icon: Info,
    badge: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]',
    iconWrap: 'bg-[#F1F5F9] text-[#64748B]',
  },
};

type Filter = 'all' | 'unread' | NotificationKind;

/**
 * Notifications inbox — Samtal light dashboard styling.
 */
export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead, clearAll } =
    useNotificationCenter();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.kind === filter);
  }, [notifications, filter]);

  const openNotification = (item: NotificationItem) => {
    markRead(item.id);
    if (item.href) navigate(item.href);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AppHeader
        title="Notifications"
        subtitle="Messages, meetings, and workspace updates in one place."
        className="shrink-0"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"
            >
              <CheckCheck className="size-3.5 text-[#016BE6]" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          </div>
        }
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F4F8] px-3 py-2.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
              { id: 'message', label: 'Messages' },
              { id: 'meeting', label: 'Meetings' },
              { id: 'workspace', label: 'Workspace' },
            ] as { id: Filter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'h-8 rounded-lg px-3 text-[12px] font-semibold transition-colors',
                filter === tab.id
                  ? 'bg-[#E8F1FF] text-[#016BE6]'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#E8F1FF] text-[#016BE6]">
                <Bell className="size-5" />
              </div>
              <p className="text-[13px] font-semibold text-[#151D2B]">No notifications yet</p>
              <p className="max-w-sm text-[12px] text-[#8A94A6]">
                New messages, meeting updates, and workspace invites will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F4F8]">
              {filtered.map((item) => {
                const meta = KIND_META[item.kind] ?? KIND_META.system;
                const Icon = meta.icon;
                const unread = !item.read;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(item)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F8FAFC]',
                        unread && 'bg-[#F8FBFF]',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                          meta.iconWrap,
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-[13px] text-[#151D2B]',
                              unread ? 'font-bold' : 'font-semibold',
                            )}
                          >
                            {item.title}
                          </p>
                          <span
                            className={cn(
                              'rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                              meta.badge,
                            )}
                          >
                            {meta.label}
                          </span>
                          {unread ? (
                            <span className="size-1.5 rounded-full bg-[#016BE6]" aria-label="Unread" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6F7B8C]">{item.body}</p>
                        <p className="mt-1 text-[10px] font-medium text-[#94A3B8]">
                          {formatWhen(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
