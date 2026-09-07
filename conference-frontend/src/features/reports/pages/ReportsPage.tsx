import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { reportsService, type ReportsOverview } from '../../../services/reports/reports.service';
import { cn } from '../../../lib/cn';
import {
  DATE_RANGES,
  DEFAULT_FILTERS,
  REPORT_TABS,
  formatMeetingMinutes,
  sparklinePath,
  type DateRangeKey,
  type MeetingTypeKey,
  type ReportFilters,
  type ReportMeeting,
  type ReportRecording,
  type ReportTab,
} from '../data/reports.data';
import { ReportStatCards } from '../components/ReportStatCards';
import { ReportsToolbar } from '../components/ReportsToolbar';
import { ReportsSummaryPanel } from '../components/ReportsSummaryPanel';
import { MeetingActivityTrend } from '../components/MeetingActivityTrend';
import { MeetingEngagementChart } from '../components/MeetingEngagementChart';
import { MeetingsByTypeChart } from '../components/MeetingsByTypeChart';
import { MeetingsHeatmap } from '../components/MeetingsHeatmap';
import {
  EngagementTab,
  MeetingsTab,
  ParticipantsTab,
  RecordingsTab,
} from '../components/ReportTabPanels';

function mapMeetings(overview: ReportsOverview | null): ReportMeeting[] {
  if (!overview) return [];
  return overview.meetings.map((m) => {
    const started = m.startedAt ? new Date(m.startedAt) : null;
    return {
      id: m.id,
      title: m.title,
      type: m.type,
      date: started ? started.toISOString().slice(0, 10) : '',
      dateLabel: started
        ? started.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : '—',
      duration: `${m.durationMinutes} min`,
      participants: m.participants,
      attendance: m.attendance,
      cameraOn: 0,
    };
  });
}

function mapRecordings(overview: ReportsOverview | null): ReportRecording[] {
  if (!overview) return [];
  return overview.recordings.map((r) => {
    const created = r.createdAt ? new Date(r.createdAt) : null;
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      date: created ? created.toISOString().slice(0, 10) : '',
      dateLabel: created
        ? created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '—',
      duration: r.duration,
      views: r.views,
    };
  });
}

function mapTopParticipants(overview: ReportsOverview | null) {
  if (!overview) return [];
  return overview.topParticipants.map((p) => ({
    name: p.name,
    meetings: `${p.meetingCount} meeting${p.meetingCount === 1 ? '' : 's'}`,
    time: formatMeetingMinutes(p.totalMinutes),
    avatarUrl: p.avatarUrl,
    avatarColor: p.avatarColor,
    pct: p.pct,
  }));
}

/** Reports — Figma layout: filters → tabs → stat row + sidebar grid. */
export function ReportsPage() {
  const { activeWorkspace } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<ReportTab>('Overview');
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeDays = DATE_RANGES.find((r) => r.key === filters.dateRange)?.days ?? 30;
  const compareLabel = DATE_RANGES.find((r) => r.key === filters.dateRange)?.compare ?? 'vs prior period';

  const apiTypes = useMemo((): MeetingTypeKey[] | undefined => {
    const all: MeetingTypeKey[] = ['instant', 'scheduled'];
    if (filters.meetingTypes.size >= all.length) return undefined;
    return [...filters.meetingTypes].sort();
  }, [filters.meetingTypes]);

  const typesKey = apiTypes?.join(',') ?? 'all';

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      setOverview(null);
      return;
    }
    setLoading(true);
    reportsService
      .getOverview(activeWorkspace.workspaceId, rangeDays, apiTypes)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId, rangeDays, typesKey, apiTypes]);

  const totalMeetings = overview?.totalMeetings ?? 0;
  const totalMinutes = overview?.totalParticipantMinutes ?? 0;
  const uniqueParticipants = overview?.uniqueParticipants ?? 0;
  const avgMinutes = totalMeetings > 0 ? Math.round(totalMinutes / totalMeetings) : 0;
  const totalTimeLabel = formatMeetingMinutes(totalMinutes);
  const avgLabel = `${avgMinutes}m`;

  const meetings = useMemo(() => mapMeetings(overview), [overview]);
  const recordings = useMemo(() => mapRecordings(overview), [overview]);
  const topParticipants = useMemo(() => mapTopParticipants(overview), [overview]);

  const sparklines = useMemo(() => {
    const days = overview?.byDay ?? [];
    const last = days.slice(-7);
    return {
      meetings: sparklinePath(last.map((d) => d.meetings)),
      participants: sparklinePath(last.map((d) => d.participantMinutes)),
      minutes: sparklinePath(last.map((d) => d.participantMinutes)),
      avg: sparklinePath(
        last.map((d) => (d.meetings > 0 ? d.participantMinutes / d.meetings : 0)),
      ),
    };
  }, [overview]);

  const summaryRows = [
    {
      label: 'Total Meetings',
      value: String(totalMeetings),
      change: overview?.trends.meetings.change,
      up: overview?.trends.meetings.positive,
    },
    {
      label: 'Total Meeting Time',
      value: totalTimeLabel,
      change: overview?.trends.minutes.change,
      up: overview?.trends.minutes.positive,
    },
    {
      label: 'Participants',
      value: String(uniqueParticipants),
      change: overview?.trends.participants.change,
      up: overview?.trends.participants.positive,
    },
    {
      label: 'Average Duration',
      value: avgLabel,
      change: overview?.trends.avgDuration.change,
      up: overview?.trends.avgDuration.positive,
    },
    {
      label: 'Recordings',
      value: String(overview?.totalRecordings ?? 0),
      change: overview?.trends.recordings.change,
      up: overview?.trends.recordings.positive,
    },
    {
      label: 'Files Shared',
      value: String(overview?.filesShared ?? 0),
    },
  ];

  const toolbarProps = {
    filters,
    rangeDays,
    onDateRangeChange: (key: DateRangeKey) => setFilters((f) => ({ ...f, dateRange: key })),
    onToggleType: (key: MeetingTypeKey) =>
      setFilters((f) => {
        const next = new Set(f.meetingTypes);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        if (next.size === 0) return f;
        return { ...f, meetingTypes: next };
      }),
    onSelectAllTypes: () =>
      setFilters((f) => ({
        ...f,
        meetingTypes: new Set(['instant', 'scheduled']),
      })),
    onResetTypes: () =>
      setFilters((f) => ({
        ...f,
        meetingTypes: new Set(['instant', 'scheduled']),
      })),
  };

  return (
    <div className="flex flex-col gap-3 pb-3 sm:gap-4">
      <AppHeader
        title="Reports"
        subtitle="Track your meeting performance and team collaboration."
      />

      {/* Tabs left · date + filters right (aligned above Summary) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8ECF1] pt-2 sm:mt-4">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-px">
          {REPORT_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
                tab === t
                  ? 'border-[#016BE6] text-[#016BE6]'
                  : 'border-transparent text-[#6F7B8C] hover:text-[#151D2B]',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <ReportsToolbar {...toolbarProps} className="shrink-0 pb-1.5" />
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E8ECF1] bg-white p-6 text-sm text-[#6F7B8C]">
          Loading reports…
        </div>
      ) : (
        <>
          {tab === 'Overview' ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)_minmax(240px,280px)]">
              {/* Row 1: four KPI boxes span left + center columns */}
              <div className="order-1 xl:col-span-2 xl:row-start-1">
                <ReportStatCards
                  totalMeetings={String(totalMeetings)}
                  participants={String(uniqueParticipants)}
                  totalTime={totalTimeLabel}
                  avgDuration={avgLabel}
                  compareLabel={compareLabel}
                  changes={{
                    totalMeetings: overview?.trends.meetings ?? null,
                    participants: overview?.trends.participants ?? null,
                    totalTime: overview?.trends.minutes ?? null,
                    avgDuration: overview?.trends.avgDuration ?? null,
                  }}
                  sparklines={sparklines}
                />
              </div>

              <div className="order-4 xl:order-none xl:col-start-3 xl:row-start-1 xl:row-span-3 xl:self-start">
                <ReportsSummaryPanel
                  rows={summaryRows}
                  participants={topParticipants}
                  insights={overview?.insights ?? []}
                />
              </div>

              {/* Row 2: activity + engagement (left) */}
              <div className="order-2 flex min-w-0 flex-col gap-3 xl:col-start-1 xl:row-start-2">
                <MeetingActivityTrend byDay={overview?.byDay ?? []} />
                <MeetingEngagementChart
                  attendance={overview?.engagement.attendance ?? []}
                  camera={overview?.engagement.camera ?? []}
                />
              </div>

              {/* Row 2: meetings by type + heatmap (center) */}
              <div className="order-3 flex min-w-0 flex-col gap-3 xl:col-start-2 xl:row-start-2">
                <MeetingsByTypeChart meetings={meetings} />
                <MeetingsHeatmap data={overview?.heatmap ?? undefined} />
              </div>
            </div>
          ) : (
            <>
              <ReportStatCards
                totalMeetings={String(totalMeetings)}
                participants={String(uniqueParticipants)}
                totalTime={totalTimeLabel}
                avgDuration={avgLabel}
                compareLabel={compareLabel}
                changes={{
                  totalMeetings: overview?.trends.meetings ?? null,
                  participants: overview?.trends.participants ?? null,
                  totalTime: overview?.trends.minutes ?? null,
                  avgDuration: overview?.trends.avgDuration ?? null,
                }}
                sparklines={sparklines}
              />

              {tab === 'Meetings' ? <MeetingsTab meetings={meetings} /> : null}
              {tab === 'Participants' ? <ParticipantsTab participants={topParticipants} /> : null}
              {tab === 'Engagement' ? (
                <EngagementTab
                  meetings={meetings}
                  heatmap={overview?.heatmap}
                  engagement={overview?.engagement}
                />
              ) : null}
              {tab === 'Recordings' ? <RecordingsTab recordings={recordings} /> : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
