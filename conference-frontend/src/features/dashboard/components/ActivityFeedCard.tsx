import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useMeetings } from '../../meetings/hooks/useMeetings';
import { useRecordings } from '../hooks/useRecordings';
import { ActivityRowSkeleton } from './DashboardSkeletons';
import { DASHBOARD_CARD_RADIUS_CLASS } from './dashboardListStyles';
import { cn } from '../../../lib/cn';

type FeedItem = {
  id: string;
  name: string;
  action: string;
  detail: string;
  time: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export function ActivityFeedCard({ className }: { className?: string }) {
  const { meetings, loading: meetingsLoading } = useMeetings({ page: 1, limit: 4 });
  const { recordings, loading: recordingsLoading } = useRecordings({ page: 1, limit: 4 });
  const loading = meetingsLoading || recordingsLoading;

  const items: FeedItem[] = [];
  for (const m of meetings.slice(0, 2)) {
    items.push({
      id: `m-${m.id}`,
      name: m.createdByName || 'Meeting',
      action: m.status === 'live' ? 'is live now' : 'was scheduled',
      detail: m.title || m.roomId,
      time: new Date(m.scheduledAt ?? m.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      avatarUrl: m.createdByAvatarUrl ?? null,
      avatarColor: m.createdByAvatarColor ?? null,
    });
  }
  for (const r of recordings.slice(0, 2)) {
    const host = r.participants?.[0];
    items.push({
      id: `r-${r.id}`,
      name: host?.name || 'Recording',
      action: 'was saved',
      detail: r.title,
      time: new Date(r.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      avatarUrl: host?.avatarUrl ?? null,
      avatarColor: host?.avatarColor ?? null,
    });
  }

  return (
    <SectionCard
      className={cn(DASHBOARD_CARD_RADIUS_CLASS, className)}
      title="Activity Feed"
      action={
        <Link
          to="/app/reports"
          className="flex items-center gap-0.5 text-[11px] font-semibold text-[#006DEC] hover:underline"
        >
          View all <ArrowUpRight className="size-2.5" />
        </Link>
      }
    >
      {loading ? (
        <ul className="space-y-2.5" aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 4 }, (_, i) => (
            <ActivityRowSkeleton key={i} />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="py-3 text-center text-[12px] tabular-nums text-[#8A94A6]">0</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2">
              <UserAvatar
                name={a.name}
                avatarUrl={a.avatarUrl}
                avatarColor={a.avatarColor}
                size="sm"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-snug text-[#334155]">
                  <span className="font-semibold text-[#151D2B]">{a.name}</span> {a.action}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[#8A94A6]">{a.detail}</p>
              </div>
              <span className="shrink-0 text-[9px] text-[#8A94A6]">{a.time}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
