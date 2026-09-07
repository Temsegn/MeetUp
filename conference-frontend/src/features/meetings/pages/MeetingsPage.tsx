import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { MeetingStatCards } from '../components/MeetingStatCards';
import { MeetingsList } from '../components/MeetingsList';
import { MeetingsTableSkeleton } from '../components/MeetingsSkeletons';
import { MeetingsToolbar } from '../components/MeetingsToolbar';
import {
  DEFAULT_MEETING_FILTERS,
  filterMeetings,
  type MeetingListFilters,
  type ListedMeeting,
} from '../data/meetings.data';
import { useMeetings } from '../hooks/useMeetings';
import type { Meeting } from '../../../services/meetings/meetings.service';

function formatParticipantMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function actualDurationMinutes(m: Meeting): number {
  if (m.startedAt && m.endedAt) {
    return Math.max(1, Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60000));
  }
  if ((m.status === 'live' || isDue(m)) && m.startedAt) {
    return Math.max(1, Math.round((Date.now() - new Date(m.startedAt).getTime()) / 60000));
  }
  return 0;
}

function isDue(m: Meeting): boolean {
  return (
    m.status === 'scheduled' &&
    Boolean(m.scheduledAt) &&
    new Date(m.scheduledAt!).getTime() <= Date.now()
  );
}

function apiMeetingToListed(m: Meeting): ListedMeeting {
  const dt = m.scheduledAt ? new Date(m.scheduledAt) : m.startedAt ? new Date(m.startedAt) : new Date(m.createdAt);
  const dateKey = dt.toISOString().slice(0, 10);
  const timeKey = dt.toTimeString().slice(0, 5);
  const live = m.status === 'live' || isDue(m);
  const statusMap: Record<string, ListedMeeting['status']> = {
    live: 'live',
    scheduled: live ? 'live' : 'upcoming',
    ended: 'ended',
    cancelled: 'cancelled',
  };
  const actual = actualDurationMinutes(m);
  const durationMinutes = actual > 0 ? actual : (m.status === 'scheduled' ? (m.duration ?? 30) : 0);
  return {
    id: m.id,
    title: m.title || m.roomId,
    status: statusMap[m.status] ?? 'upcoming',
    date: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    dateKey,
    time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    timeKey,
    duration: durationMinutes > 0 ? `${durationMinutes}m` : '—',
    durationMinutes,
    participants: Math.max(1, m.participants ?? m.peakParticipants ?? m.participantCount ?? 1),
    host: m.createdByName,
    hostUserId: m.createdBy,
    hostAvatarUrl: m.createdByAvatarUrl ?? null,
    hostAvatarColor: m.createdByAvatarColor ?? null,
    roomId: m.roomId,
    agenda: (m.agenda ?? []).map((a, i) => ({ id: String(i), title: a, duration: '' })),
    people:
      m.participantList && m.participantList.length > 0
        ? m.participantList.map((p) => ({
            name: p.name,
            avatarUrl: p.avatarUrl ?? null,
            avatarColor: p.avatarColor ?? null,
          }))
        : [
            {
              name: m.createdByName,
              avatarUrl: m.createdByAvatarUrl ?? null,
              avatarColor: m.createdByAvatarColor ?? null,
            },
          ],
  };
}

/**
 * Meetings listing — stats, filters (title/date/time/status), live first.
 * Live opens conference; upcoming/ended open detail page.
 */
export function MeetingsPage() {
  const [filters, setFilters] = useState<MeetingListFilters>(DEFAULT_MEETING_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page] = useState(1);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const { meetings: apiMeetings, stats: apiStats, loading, reload } = useMeetings({
    status:
      filters.status !== 'all'
        ? filters.status === 'live'
          ? 'live'
          : filters.status === 'upcoming'
            ? 'scheduled'
            : filters.status === 'cancelled'
              ? 'cancelled'
              : 'ended'
        : undefined,
    q: filters.query || undefined,
    date: filters.date || undefined,
    page,
    limit: 50,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTick(Date.now());
      void reload();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [reload]);

  const listedMeetings = useMemo(() => apiMeetings.map(apiMeetingToListed), [apiMeetings, nowTick]);
  const filtered = useMemo(() => filterMeetings(listedMeetings, { ...filters, status: 'all', query: '', date: '' }), [listedMeetings]);

  const stats = useMemo(() => ({
    totalMeetings: String(apiStats?.total ?? listedMeetings.length),
    totalTime: formatParticipantMinutes(apiStats?.participantMinutes ?? 0),
    totalParticipants: String(apiStats?.uniqueParticipants ?? 0),
    liveNow: String(apiStats?.live ?? listedMeetings.filter((m) => m.status === 'live').length),
    trends: apiStats?.trends,
  }), [apiStats, listedMeetings]);

  return (
    <div className="flex flex-col gap-4 pb-4 sm:gap-5">
      <AppHeader
        title="Meetings"
        subtitle="Browse live, upcoming, and past meetings before joining."
      />

      <MeetingStatCards
        loading={loading}
        totalMeetings={stats.totalMeetings}
        totalTime={stats.totalTime}
        totalParticipants={stats.totalParticipants}
        liveNow={stats.liveNow}
        trends={stats.trends}
      />

      <MeetingsToolbar
        filters={filters}
        onChange={setFilters}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
      />

      {loading ? (
        <MeetingsTableSkeleton rows={5} />
      ) : (
        <MeetingsList
          meetings={filtered}
          filterKey={`${filters.query}|${filters.date}|${filters.time}|${filters.status}|${page}`}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
