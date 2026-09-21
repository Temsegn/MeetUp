export const REPORT_TABS = [
  'Overview',
  'Meetings',
  'Participants',
  'Engagement',
  'Recordings',
] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

export type DateRangeKey = 'today' | 'last_7' | 'last_30' | 'last_90';

export const DATE_RANGES: {
  key: DateRangeKey;
  label: string;
  short: string;
  compare: string;
  days: number;
}[] = [
  {
    key: 'today',
    label: 'Today',
    short: 'Today',
    compare: 'vs yesterday',
    days: 1,
  },
  {
    key: 'last_7',
    label: 'Last 7 days',
    short: '7 days',
    compare: 'vs prior 7 days',
    days: 7,
  },
  {
    key: 'last_30',
    label: 'Last 30 days',
    short: '30 days',
    compare: 'vs prior 30 days',
    days: 30,
  },
  {
    key: 'last_90',
    label: 'Last 90 days',
    short: '90 days',
    compare: 'vs prior 90 days',
    days: 90,
  },
];

export type MeetingTypeKey = 'instant' | 'scheduled';

export const MEETING_TYPE_OPTIONS: {
  key: MeetingTypeKey | 'all';
  label: string;
}[] = [
  { key: 'all', label: 'All types' },
  { key: 'instant', label: 'Instant Meeting' },
  { key: 'scheduled', label: 'Scheduled Meeting' },
];

export type ReportFilters = {
  dateRange: DateRangeKey;
  meetingTypes: Set<MeetingTypeKey>;
};

export const DEFAULT_FILTERS: ReportFilters = {
  dateRange: 'last_30',
  meetingTypes: new Set(['instant', 'scheduled']),
};

export type ReportMeeting = {
  id: string;
  title: string;
  type: MeetingTypeKey;
  date: string;
  dateLabel: string;
  duration: string;
  participants: number;
  attendance: number;
  cameraOn: number;
};

export type ReportRecording = {
  id: string;
  title: string;
  type: MeetingTypeKey;
  date: string;
  dateLabel: string;
  duration: string;
  views: number;
};

export function formatMeetingMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function typeLabel(type: MeetingTypeKey): string {
  return MEETING_TYPE_OPTIONS.find((o) => o.key === type)?.label ?? type;
}

export function typeColor(type: MeetingTypeKey): string {
  const map: Record<MeetingTypeKey, string> = {
    instant: '#016BE6',
    scheduled: '#7C3AED',
  };
  return map[type];
}

export function meetingsByTypeBreakdown(meetings: ReportMeeting[]) {
  const keys: MeetingTypeKey[] = ['instant', 'scheduled'];
  const total = meetings.length || 1;
  return keys
    .map((key) => {
      const count = meetings.filter((m) => m.type === key).length;
      return {
        key,
        label: typeLabel(key),
        count,
        value: Math.round((count / total) * 100),
        color: typeColor(key),
      };
    })
    .filter((d) => d.count > 0);
}

export const ENGAGEMENT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const HEATMAP_TIMES = ['12 AM', '6 AM', '12 PM', '6 PM'] as const;

export const HEATMAP_DATA = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

/** Scale engagement from filtered meetings by day of week */
export function engagementFromMeetings(meetings: ReportMeeting[]) {
  const byDow = Array.from({ length: 7 }, () => ({ att: [] as number[], cam: [] as number[] }));
  for (const m of meetings) {
    const dow = new Date(m.date + 'T12:00:00').getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    byDow[idx].att.push(m.attendance);
    byDow[idx].cam.push(m.cameraOn);
  }
  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  return {
    attendance: byDow.map((d) => avg(d.att)),
    camera: byDow.map((d) => avg(d.cam)),
  };
}

/** Soft upward sparkline like dashboard cards — higher values rise up, gentle curves. */
export function sparklinePath(values: number[]): string {
  const fallback = 'M0 28 C12 22, 20 34, 32 24 C44 14, 52 30, 64 18 C76 8, 88 22, 100 14';
  if (values.length === 0 || values.every((v) => v <= 0)) return fallback;

  // Keep at least 5 points so the curve stays soft (like other pages)
  let vals = values.map((v) => Math.max(0, v));
  if (vals.length === 1) {
    const v = vals[0];
    vals = [v * 0.45, v * 0.55, v * 0.7, v * 0.85, v];
  } else if (vals.length === 2) {
    const [a, b] = vals;
    vals = [a, a * 0.7 + b * 0.3, a * 0.4 + b * 0.6, a * 0.15 + b * 0.85, b];
  } else if (vals.length < 5) {
    const out: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const idx = t * (vals.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(vals.length - 1, lo + 1);
      const f = idx - lo;
      out.push(vals[lo] * (1 - f) + vals[hi] * f);
    }
    vals = out;
  } else if (vals.length > 8) {
    // Downsample to ~7 points for a smoother path
    const out: number[] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const idx = t * (vals.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(vals.length - 1, lo + 1);
      const f = idx - lo;
      out.push(vals[lo] * (1 - f) + vals[hi] * f);
    }
    vals = out;
  }

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  // Widen the band so spikes stay gentle (not steep)
  const span = Math.max(max - min, max * 0.5, 1);
  const mid = (min + max) / 2;
  const padMin = mid - span * 0.75;
  const padMax = mid + span * 0.75;
  const range = padMax - padMin || 1;

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * 100;
    // Higher values → lower SVG y (line rises upward)
    const y = 30 - ((v - padMin) / range) * 20;
    return { x, y: Math.min(32, Math.max(8, y)) };
  });

  // Smooth cubic segments (dashboard-style C curves)
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
