import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/auth/auth.service';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { CalendarMonthGrid } from '../components/CalendarMonthGrid';
import { CalendarPageSkeleton } from '../components/CalendarSkeletons';
import { CalendarSidePanel } from '../components/CalendarSidePanel';
import {
  CalendarSideToolbar,
  CalendarViewSwitcher,
  type CalendarView,
} from '../components/CalendarToolbar';
import { CalendarWeekGrid } from '../components/CalendarWeekGrid';
import {
  ALL_EVENT_TYPES,
  apiEventToCalendarEvent,
  EVENT_STYLES,
  getCalendarDaysInMonth,
  getCalendarMonthIndex,
  getCalendarMonthLabel,
  getCalendarYear,
  getDefaultSelectedDay,
  setCalendarCursor,
  setLiveCalendarEvents,
  setUpcomingMeetings,
  shiftCalendarMonth,
  type CalendarEventType,
  type UpcomingMeeting,
  weekDaysContaining,
} from '../data/calendar.data';

/** Two-column layout: calendar left, side panel right (Figma) */
const layoutGrid = 'grid grid-cols-1 xl:grid-cols-[1fr_minmax(260px,300px)]';

type ApiEvent = {
  id: string;
  roomId: string;
  title: string;
  scheduledAt?: string;
  duration?: number;
  status: string;
  type?: string;
  participantCount?: number;
  createdByName?: string;
  createdByAvatarUrl?: string | null;
  createdByAvatarColor?: string | null;
};

/**
 * Calendar — Figma Month/Week/Day + side panel. Live API data; empty = 0.
 */
export function CalendarPage() {
  const { activeWorkspace } = useAuth();
  const [view, setView] = useState<CalendarView>('Month');
  const [selectedDay, setSelectedDay] = useState(getDefaultSelectedDay);
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(
    () => new Set(ALL_EVENT_TYPES),
  );
  const [monthLabel, setMonthLabel] = useState(getCalendarMonthLabel);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshMeta = useCallback(() => {
    setMonthLabel(getCalendarMonthLabel());
    setSelectedDay((d) => {
      const max = getCalendarDaysInMonth();
      const prefer = getDefaultSelectedDay();
      if (d < 1 || d > max) return prefer;
      return Math.min(d, max);
    });
  }, []);

  const loadEvents = useCallback(async () => {
    const ws = activeWorkspace?.workspaceId;
    if (!ws) {
      setLiveCalendarEvents([]);
      setUpcomingMeetings([]);
      setRevision((n) => n + 1);
      setLoading(false);
      return;
    }

    const y = getCalendarYear();
    const m = getCalendarMonthIndex();
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const upcomingEnd = new Date(y, m, 1);
    upcomingEnd.setDate(upcomingEnd.getDate() + 60);

    setLoading(true);
    try {
      const data = await apiFetch<{ events: ApiEvent[] }>(
        `/calendar/events?from=${start.toISOString()}&to=${upcomingEnd.toISOString()}`,
        { headers: { 'X-Workspace-Id': ws } },
      );
      const events = data.events ?? [];
      const mapped = events
        .map((ev) => apiEventToCalendarEvent(ev))
        .filter((e): e is NonNullable<typeof e> => e != null);
      setLiveCalendarEvents(mapped);

      const now = Date.now();
      const upcoming: UpcomingMeeting[] = events
        .filter((ev) => ev.scheduledAt && new Date(ev.scheduledAt).getTime() >= now)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
        )
        .slice(0, 8)
        .map((ev) => {
          const dt = new Date(ev.scheduledAt!);
          const count = Math.max(0, ev.participantCount ?? 0);
          return {
            id: ev.id,
            dayLabel: dt.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
            time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            title: ev.title || 'Meeting',
            avatars: count,
            roomId: ev.roomId,
            meetingId: ev.id,
            hostName: ev.createdByName,
            hostAvatarUrl: ev.createdByAvatarUrl ?? null,
            hostAvatarColor: ev.createdByAvatarColor ?? null,
          };
        });
      setUpcomingMeetings(upcoming);
    } catch {
      setLiveCalendarEvents([]);
      setUpcomingMeetings([]);
    } finally {
      setRevision((n) => n + 1);
      setLoading(false);
    }
  }, [activeWorkspace?.workspaceId, monthLabel]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const goToday = () => {
    const now = new Date();
    setCalendarCursor(now.getFullYear(), now.getMonth());
    refreshMeta();
    setSelectedDay(getDefaultSelectedDay());
  };

  const goPrev = () => {
    if (view === 'Month') {
      shiftCalendarMonth(-1);
      refreshMeta();
      return;
    }
    if (view === 'Week') {
      const week = weekDaysContaining(selectedDay);
      const first = week.find((d) => d > 0) ?? selectedDay;
      if (first <= 7) {
        shiftCalendarMonth(-1);
        refreshMeta();
        setSelectedDay(getCalendarDaysInMonth());
        return;
      }
      setSelectedDay(Math.max(1, first - 7));
      return;
    }
    if (selectedDay <= 1) {
      shiftCalendarMonth(-1);
      refreshMeta();
      setSelectedDay(getCalendarDaysInMonth());
      return;
    }
    setSelectedDay((d) => Math.max(1, d - 1));
  };

  const goNext = () => {
    const max = getCalendarDaysInMonth();
    if (view === 'Month') {
      shiftCalendarMonth(1);
      refreshMeta();
      return;
    }
    if (view === 'Week') {
      const week = weekDaysContaining(selectedDay);
      const last = [...week].reverse().find((d) => d > 0) ?? selectedDay;
      if (last + 7 > max) {
        shiftCalendarMonth(1);
        refreshMeta();
        setSelectedDay(1);
        return;
      }
      setSelectedDay(Math.min(max, last + 7));
      return;
    }
    if (selectedDay >= max) {
      shiftCalendarMonth(1);
      refreshMeta();
      setSelectedDay(1);
      return;
    }
    setSelectedDay((d) => Math.min(max, d + 1));
  };

  const toggleType = (type: CalendarEventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return next;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const resetFilters = () => setActiveTypes(new Set(ALL_EVENT_TYPES));

  const showLegend = useMemo(() => view === 'Month' || view === 'Week', [view]);

  const sideToolbar = (
    <CalendarSideToolbar
      onToday={goToday}
      onPrev={goPrev}
      onNext={goNext}
      monthLabel={monthLabel}
      activeTypes={activeTypes}
      onToggleType={toggleType}
      onResetFilters={resetFilters}
    />
  );

  return (
    <div className="flex flex-col gap-3 pb-3 sm:gap-4">
      <AppHeader title="Calendar" subtitle="View and manage your scheduled meetings" />

      {loading ? (
        <CalendarPageSkeleton />
      ) : view === 'Day' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CalendarViewSwitcher view={view} onViewChange={setView} />
            {sideToolbar}
          </div>
          <CalendarSidePanel
            key={`day-${revision}-${monthLabel}`}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            activeTypes={activeTypes}
            variant="day"
          />
        </>
      ) : (
        <div className={cn(layoutGrid, 'items-start gap-3')}>
          <div className="min-w-0 space-y-3">
            <CalendarViewSwitcher view={view} onViewChange={setView} />

            {view === 'Month' ? (
              <CalendarMonthGrid
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                activeTypes={activeTypes}
                revision={revision}
              />
            ) : (
              <CalendarWeekGrid
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                activeTypes={activeTypes}
                revision={revision}
              />
            )}

            {showLegend ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
                {(Object.keys(EVENT_STYLES) as CalendarEventType[]).map((key) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${EVENT_STYLES[key].dot}`} />
                    <span className="text-[11px] text-[#6F7B8C]">{EVENT_STYLES[key].label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2.5">
            {sideToolbar}
            <CalendarSidePanel
              key={`side-${revision}-${monthLabel}`}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              activeTypes={activeTypes}
              variant="side"
            />
          </div>
        </div>
      )}
    </div>
  );
}
