export type CalendarEventType = 'sync' | 'client' | 'presentation' | 'review' | 'other';

export type CalendarEvent = {
  id: string;
  day: number;
  title: string;
  time: string;
  type: CalendarEventType;
  duration?: string;
  avatars?: number;
  roomId?: string;
  meetingId?: string;
  hostName?: string;
  hostAvatarUrl?: string | null;
  hostAvatarColor?: string | null;
};

export type DayMeeting = {
  id: string;
  time: string;
  title: string;
  duration: string;
  type: CalendarEventType;
  avatars: number;
  roomId?: string;
  meetingId?: string;
  hostName?: string;
  hostAvatarUrl?: string | null;
  hostAvatarColor?: string | null;
};

export type UpcomingMeeting = {
  id: string;
  dayLabel: string;
  time: string;
  title: string;
  avatars: number;
  avatarUrls?: string[];
  roomId?: string;
  meetingId?: string;
  hostName?: string;
  hostAvatarUrl?: string | null;
  hostAvatarColor?: string | null;
};

/** Demo participant photos (same as dashboard) */
export const DEMO_AVATARS = [
  '/dashboard/avatar-1.jpg',
  '/dashboard/avatar-2.jpg',
  '/dashboard/avatar-3.jpg',
  '/dashboard/avatar-4.jpg',
  '/dashboard/avatar-5.jpg',
  '/dashboard/avatar-6.jpg',
] as const;

export function avatarUrlsForCount(count: number, offset = 0): string[] {
  const n = Math.max(0, count);
  return Array.from({ length: Math.min(n, 3) }, (_, i) =>
    DEMO_AVATARS[(offset + i) % DEMO_AVATARS.length],
  );
}

export const EVENT_STYLES: Record<
  CalendarEventType,
  { chip: string; bar: string; dot: string; label: string }
> = {
  sync: {
    chip: 'bg-[#EAF2FF]',
    bar: 'border-[#E8ECF1] bg-white',
    dot: 'bg-[#016BE6]',
    label: 'Team Sync',
  },
  client: {
    chip: 'bg-[#FFF4E5]',
    bar: 'border-[#E8ECF1] bg-white',
    dot: 'bg-[#F59E0B]',
    label: 'Client Meeting',
  },
  presentation: {
    chip: 'bg-[#E8F8EF]',
    bar: 'border-[#E8ECF1] bg-white',
    dot: 'bg-[#22C55E]',
    label: 'Presentation',
  },
  review: {
    chip: 'bg-[#FEECEC]',
    bar: 'border-[#E8ECF1] bg-white',
    dot: 'bg-[#EF4444]',
    label: 'Review',
  },
  other: {
    chip: 'bg-[#F5EDFF]',
    bar: 'border-[#E8ECF1] bg-white',
    dot: 'bg-[#A855F7]',
    label: 'Other',
  },
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_STYLES) as CalendarEventType[];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Mutable calendar cursor — grids/panels read these helpers. */
let cursor = new Date();
cursor.setDate(1);
cursor.setHours(12, 0, 0, 0);

/** Live events for the active month (empty = show zeros / empty Figma cells). */
let liveEvents: CalendarEvent[] = [];
let upcomingMeetings: UpcomingMeeting[] = [];

function refreshCursorMeta() {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOffset = new Date(y, m, 1).getDay();
  return { y, m, daysInMonth, startOffset };
}

export function getCalendarMonthLabel(): string {
  return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function getCalendarYear(): number {
  return cursor.getFullYear();
}

export function getCalendarMonthIndex(): number {
  return cursor.getMonth();
}

export function getCalendarDaysInMonth(): number {
  return refreshCursorMeta().daysInMonth;
}

export function getCalendarStartOffset(): number {
  return refreshCursorMeta().startOffset;
}

export function getDefaultSelectedDay(): number {
  const now = new Date();
  if (now.getFullYear() === cursor.getFullYear() && now.getMonth() === cursor.getMonth()) {
    return now.getDate();
  }
  return 1;
}

/** Back-compat — prefer getters; these are initial snapshots only. */
export const CALENDAR_MONTH_LABEL = getCalendarMonthLabel();
export const CALENDAR_YEAR = getCalendarYear();
export const CALENDAR_MONTH_INDEX = getCalendarMonthIndex();
export const CALENDAR_DAYS_IN_MONTH = getCalendarDaysInMonth();
export const CALENDAR_START_OFFSET = getCalendarStartOffset();
export const DEFAULT_SELECTED_DAY = getDefaultSelectedDay();

export function setCalendarCursor(year: number, monthIndex: number) {
  cursor = new Date(year, monthIndex, 1, 12, 0, 0, 0);
}

export function shiftCalendarMonth(delta: number) {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1, 12, 0, 0, 0);
}

export function setLiveCalendarEvents(events: CalendarEvent[]) {
  liveEvents = events;
}

export function setUpcomingMeetings(rows: UpcomingMeeting[]) {
  upcomingMeetings = rows;
}

export function getUpcomingMeetings(): UpcomingMeeting[] {
  return upcomingMeetings;
}

/** Empty seed — UI shows 0 when no API data */
export const CALENDAR_EVENTS: CalendarEvent[] = [];
/** @deprecated use getUpcomingMeetings() */
export const UPCOMING_MEETINGS: UpcomingMeeting[] = [];

export function weekdayIndex(day: number): number {
  const { y, m } = refreshCursorMeta();
  return new Date(y, m, day, 12, 0, 0, 0).getDay();
}

export function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[weekdayIndex(day)];
}

/** Full Sun–Sat week containing `day` (may clip at month edges) */
export function weekDaysContaining(day: number): number[] {
  const daysInMonth = getCalendarDaysInMonth();
  const idx = weekdayIndex(day);
  const sunday = day - idx;
  return Array.from({ length: 7 }, (_, i) => {
    const d = sunday + i;
    return d >= 1 && d <= daysInMonth ? d : 0;
  });
}

export function eventsForDay(
  day: number,
  types?: Set<CalendarEventType> | CalendarEventType[],
): CalendarEvent[] {
  const allowed = types
    ? types instanceof Set
      ? types
      : new Set(types)
    : null;
  return liveEvents.filter(
    (e) => e.day === day && (!allowed || allowed.has(e.type)),
  );
}

export function meetingsForDay(
  day: number,
  types?: Set<CalendarEventType> | CalendarEventType[],
): DayMeeting[] {
  return eventsForDay(day, types).map((e) => ({
    id: e.id,
    time: e.time,
    title: e.title,
    duration: e.duration ?? '60 min',
    type: e.type,
    avatars: e.avatars ?? 0,
    roomId: e.roomId,
    meetingId: e.meetingId,
    hostName: e.hostName,
    hostAvatarUrl: e.hostAvatarUrl,
    hostAvatarColor: e.hostAvatarColor,
  }));
}

export function formatDayLabel(day: number): string {
  const { y, m } = refreshCursorMeta();
  return new Date(y, m, day, 12, 0, 0, 0).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function mapApiEventType(type?: string, title?: string): CalendarEventType {
  const t = `${type ?? ''} ${title ?? ''}`.toLowerCase();
  if (t.includes('client')) return 'client';
  if (t.includes('review')) return 'review';
  if (t.includes('present') || t.includes('demo')) return 'presentation';
  if (t.includes('sync') || t.includes('standup') || t.includes('weekly')) return 'sync';
  return 'other';
}

export function apiEventToCalendarEvent(ev: {
  id: string;
  roomId: string;
  title: string;
  scheduledAt?: string;
  duration?: number;
  type?: string;
  participantCount?: number;
  createdByName?: string;
  createdByAvatarUrl?: string | null;
  createdByAvatarColor?: string | null;
}): CalendarEvent | null {
  if (!ev.scheduledAt) return null;
  const dt = new Date(ev.scheduledAt);
  if (
    dt.getFullYear() !== cursor.getFullYear() ||
    dt.getMonth() !== cursor.getMonth()
  ) {
    return null;
  }
  return {
    id: ev.id,
    day: dt.getDate(),
    title: ev.title || 'Meeting',
    time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    type: mapApiEventType(ev.type, ev.title),
    duration: `${ev.duration ?? 30} min`,
    avatars: Math.max(0, ev.participantCount ?? 0),
    roomId: ev.roomId,
    meetingId: ev.id,
    hostName: ev.createdByName,
    hostAvatarUrl: ev.createdByAvatarUrl ?? null,
    hostAvatarColor: ev.createdByAvatarColor ?? null,
  };
}
