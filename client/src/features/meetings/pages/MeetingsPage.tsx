import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { MeetingStatCards } from '../components/MeetingStatCards';
import { MeetingsList } from '../components/MeetingsList';
import { MeetingsTableSkeleton } from '../components/MeetingsSkeletons';
import { MeetingsToolbar } from '../components/MeetingsToolbar';
import {
  DEFAULT_MEETING_FILTERS,
  filterMeetings,
  meetingRangeQuery,
  type MeetingListFilters,
  type ListedMeeting,
} from '../data/meetings.data';
import { useMeetings } from '../hooks/useMeetings';
import type { Meeting } from '../../../services/meetings/meetings.service';
import { useLiveMeetingPresence } from '../../meeting/lib/live-meeting-presence';

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
  const planned = Number(m.duration);
  const plannedMinutes = Number.isFinite(planned) && planned > 0 ? Math.round(planned) : 30;
  const durationMinutes = actual > 0 ? actual : (m.status === 'scheduled' || m.status === 'live' ? plannedMinutes : 0);
  return {
    id: m.id,
    title: m.title || m.roomId,
    status: statusMap[m.status] ?? 'upcoming',
    date: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    dateKey,
    time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    timeKey,
    duration: durationMinutes > 0 ? formatParticipantMinutes(durationMinutes) : '—',
    durationMinutes,
    participants: Math.max(
      1,
      m.participants ??
        m.peakParticipants ??
        m.participantCount ??
        Math.max(1, (m.participantList?.length ?? 0) + (m.guestEmails?.length ?? 0)),
    ),
    host: m.createdByName,
    hostUserId: m.createdBy,
    hostAvatarUrl: m.createdByAvatarUrl ?? null,
    hostAvatarColor: m.createdByAvatarColor ?? null,
    roomId: m.roomId,
    agenda: (m.agenda ?? []).map((a, i) => ({ id: String(i), title: a, duration: '' })),
    people: (() => {
      const fromRoster =
        m.participantList?.map((p) => ({
          name: p.name,
          avatarUrl: p.avatarUrl ?? null,
          avatarColor: p.avatarColor ?? null,
        })) ?? [];
      const rosterEmails = new Set(
        (m.participantList ?? []).map((p) => String(p.email || '').toLowerCase()).filter(Boolean),
      );
      const fromGuests = (m.guestEmails ?? [])
        .map((email) => String(email || '').trim().toLowerCase())
        .filter((email) => email && !rosterEmails.has(email))
        .map((email) => ({
          name: email.split('@')[0] || email,
          avatarUrl: null as string | null,
          avatarColor: '#64748B' as string | null,
        }));
      const people = [...fromRoster, ...fromGuests];
      if (people.length > 0) return people;
      return [
        {
          name: m.createdByName,
          avatarUrl: m.createdByAvatarUrl ?? null,
          avatarColor: m.createdByAvatarColor ?? null,
        },
      ];
    })(),
  };
}

/**
 * Meetings listing — all by default; period + status filters; live/upcoming first.
 * Live opens conference; upcoming/ended open detail page.
 */
const MEETING_FILTERS_KEY = 'samtal:meetingFilters:v2';

function loadStoredFilters(): MeetingListFilters {
  try {
    const raw = sessionStorage.getItem(MEETING_FILTERS_KEY);
    if (!raw) return DEFAULT_MEETING_FILTERS;
    return { ...DEFAULT_MEETING_FILTERS, ...(JSON.parse(raw) as MeetingListFilters) };
  } catch {
    return DEFAULT_MEETING_FILTERS;
  }
}

export function MeetingsPage() {
  const [filters, setFilters] = useState<MeetingListFilters>(() => loadStoredFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page] = useState(1);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    try {
      sessionStorage.setItem(MEETING_FILTERS_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const range = useMemo(() => meetingRangeQuery(filters), [filters]);

  const { meetings: apiMeetings, stats: apiStats, loading, reload, refreshQuietly } = useMeetings({
    status:
      filters.status !== 'all'
        ? filters.status === 'live'
          ? 'live'
          : filters.status === 'upcoming'
            ? 'scheduled'
            : filters.status === 'cancelled'
              ? 'cancelled'
              : 'ended'
        : 'all',
    q: filters.query || undefined,
    from: range.from,
    to: range.to,
    days: range.days ?? null,
    page,
    limit: 100,
  });

  const inLiveMeeting = useLiveMeetingPresence();

  useEffect(() => {
    // Don't hammer workspace-meetings/stats while a call is active (other tab / shell).
    if (inLiveMeeting) return;
    const id = window.setInterval(() => {
      setNowTick(Date.now());
      void refreshQuietly();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [refreshQuietly, inLiveMeeting]);

  const listedMeetings = useMemo(() => apiMeetings.map(apiMeetingToListed), [apiMeetings, nowTick]);
  const filtered = useMemo(
    () => filterMeetings(listedMeetings, filters),
    [listedMeetings, filters],
  );

  // Stats follow the same period filter as the list (All → all-time total).
  const stats = useMemo(() => ({
    totalMeetings: String(apiStats?.periodTotal ?? apiStats?.total ?? listedMeetings.length),
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
          filterKey={`${filters.query}|${filters.dateRange}|${filters.dateFrom}|${filters.dateTo}|${filters.time}|${filters.status}|${page}`}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
