import { ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { RowActionsMenu } from './RowActionsMenu';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService, type Meeting } from '../../../services/meetings/meetings.service';
import { useMeetings } from '../../meetings/hooks/useMeetings';
import { MeetingRowSkeleton } from './DashboardSkeletons';
import {
  DASHBOARD_CARD_RADIUS_CLASS,
  DASHBOARD_LIST_CARD_HEADER_CLASS,
  DASHBOARD_LIST_CLASS,
  DASHBOARD_LIST_EMPTY_CLASS,
  DASHBOARD_LIST_ROW_CLASS,
} from './dashboardListStyles';

function isLive(m: Meeting, now: number): boolean {
  if (m.status === 'live') return true;
  if (m.status === 'scheduled' && m.scheduledAt) {
    return new Date(m.scheduledAt).getTime() <= now;
  }
  return false;
}

function isUpcoming(m: Meeting, now: number): boolean {
  return (
    m.status === 'scheduled' &&
    Boolean(m.scheduledAt) &&
    new Date(m.scheduledAt!).getTime() > now
  );
}

export function UpcomingMeetingsCard() {
  const navigate = useNavigate();
  const { activeWorkspace, user } = useAuth();
  const { meetings, loading, reload } = useMeetings({ page: 1, limit: 30 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      void reload();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [reload]);

  const rows = useMemo(() => {
    const live = meetings
      .filter((m) => isLive(m, now))
      .sort(
        (a, b) =>
          new Date(b.startedAt ?? b.scheduledAt ?? b.createdAt).getTime() -
          new Date(a.startedAt ?? a.scheduledAt ?? a.createdAt).getTime(),
      );
    const upcoming = meetings
      .filter((m) => isUpcoming(m, now))
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? a.createdAt).getTime() -
          new Date(b.scheduledAt ?? b.createdAt).getTime(),
      );
    return [...live, ...upcoming].slice(0, 5);
  }, [meetings, now]);

  return (
    <SectionCard
      className={DASHBOARD_CARD_RADIUS_CLASS}
      title="Upcoming Meetings"
      headerClassName={DASHBOARD_LIST_CARD_HEADER_CLASS}
      action={
        <button
          type="button"
          onClick={() => navigate('/app/meetings')}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-[#006DEC] hover:underline"
        >
          View all <ArrowUpRight className="size-2.5" />
        </button>
      }
    >
      {loading ? (
        <ul className={DASHBOARD_LIST_CLASS} aria-busy="true" aria-label="Loading meetings">
          {Array.from({ length: 4 }, (_, i) => (
            <MeetingRowSkeleton key={i} />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className={DASHBOARD_LIST_EMPTY_CLASS}>0</p>
      ) : (
        <ul className={DASHBOARD_LIST_CLASS}>
          {rows.map((m) => {
            const live = isLive(m, now);
            const when = new Date(m.scheduledAt ?? m.startedAt ?? m.createdAt);
            const time = when.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            const date = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const count = Math.max(0, m.participantCount ?? 0);
            const people =
              m.participantList && m.participantList.length > 0
                ? m.participantList
                : [
                    {
                      userId: m.createdBy,
                      name: m.createdByName,
                      avatarUrl: m.createdByAvatarUrl,
                      avatarColor: m.createdByAvatarColor,
                    },
                  ];
            const shown = people.slice(0, 3);
            const extra = Math.max(0, count - shown.length, people.length - shown.length);

            return (
              <li key={m.id} className={DASHBOARD_LIST_ROW_CLASS}>
                <div className="w-[4rem] shrink-0">
                  {live ? (
                    <p className="text-[11px] font-semibold leading-tight text-[#DC2626]">Live</p>
                  ) : (
                    <p className="text-[11px] font-semibold leading-tight text-[#006DEC]">{time}</p>
                  )}
                  <p className="mt-0.5 text-[10px] leading-tight text-[#8A94A6]">{date}</p>
                </div>

                <div className="min-w-0 flex-1 pr-4">
                  <p className="truncate text-[12px] font-semibold leading-tight text-[#151D2B]">
                    {m.title || m.roomId}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {count === 0 && people.length === 0 ? (
                      <span className="text-[10px] tabular-nums text-[#94A3B8]">0</span>
                    ) : (
                      <div className="flex items-center">
                        {shown.map((p, i) => (
                          <span key={p.userId ?? `${p.name}-${i}`} className={i === 0 ? '' : '-ml-1.5'}>
                            <UserAvatar
                              name={p.name}
                              avatarUrl={p.avatarUrl}
                              avatarColor={p.avatarColor}
                              size="xs"
                              ring
                            />
                          </span>
                        ))}
                        {extra > 0 ? (
                          <span className="-ml-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#E8F1FE] text-[8px] font-semibold text-[#006DEC]">
                            +{extra}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-md bg-[#016BE6] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0059C4]"
                    onClick={() => navigate(`/app/meeting/${m.roomId ?? m.id}`)}
                  >
                    Join
                  </button>
                  <RowActionsMenu
                    actions={[
                      {
                        label: 'Join conference',
                        onClick: () => navigate(`/app/meeting/${m.roomId ?? m.id}`),
                      },
                      {
                        label: 'Cancel meeting',
                        danger: true,
                        onClick: () => {
                          void (async () => {
                            if (!activeWorkspace?.workspaceId) return;
                            if (!window.confirm(`Cancel “${m.title || m.roomId}”?`)) return;
                            try {
                              await meetingsService.cancel(activeWorkspace.workspaceId, m.id);
                              void reload();
                            } catch (err) {
                              window.alert(
                                err instanceof Error ? err.message : 'Could not cancel meeting.',
                              );
                            }
                          })();
                        },
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
