import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { cn } from '../../../lib/cn';
import {
  useDashboardSummary,
  type DashboardPeriod,
} from '../hooks/useDashboardSummary';
import { InsightsBodySkeleton } from './DashboardSkeletons';
import { DASHBOARD_CARD_RADIUS_CLASS } from './dashboardListStyles';

const PERIODS = ['Today', 'This Week', 'This Month', 'This Year'] as const;
type PeriodLabel = (typeof PERIODS)[number];

const PERIOD_API: Record<PeriodLabel, DashboardPeriod> = {
  Today: 'today',
  'This Week': 'week',
  'This Month': 'month',
  'This Year': 'year',
};

const PERIOD_COMPARE: Record<PeriodLabel, string> = {
  Today: 'vs yesterday',
  'This Week': 'vs last week',
  'This Month': 'vs last month',
  'This Year': 'vs last year',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chart geometry */
const CHART_W = 280;
const CHART_H = 110;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 8;
const PLOT_TOP = PAD_T;
const PLOT_BOTTOM = CHART_H - PAD_B;
const PLOT_LEFT = PAD_L;
const PLOT_RIGHT = CHART_W - PAD_R;

function formatMinutes(mins: number) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHourLabel(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? 'a' : 'p';
  return `${h}${suffix}`;
}

/** Y ticks: 0, 2, 5, 10 scaled up when data exceeds 10h. */
function hourAxisTicks(maxHours: number): number[] {
  const base = [0, 2, 5, 10];
  if (maxHours <= 10) return base;
  const factor = Math.max(2, Math.ceil(maxHours / 10));
  return base.map((t) => t * factor);
}

function smoothLine(coords: Array<{ x: number; y: number }>): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M${coords[0].x} ${coords[0].y}`;
  let d = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function MeetingInsightsCard() {
  const [period, setPeriod] = useState<PeriodLabel>('This Week');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { summary, loading } = useDashboardSummary(PERIOD_API[period]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const trend = summary?.participantMinutesTrend ?? [];
  const totalMins = trend.reduce((s, r) => s + (r.participantMinutes || 0), 0);
  const avgMins = trend.length > 0 ? Math.round(totalMins / Math.max(trend.length, 1)) : 0;
  const participants = summary?.totalParticipants ?? 0;
  const completedChange = summary?.trends?.completed ?? 0;
  const avgChange = summary?.trends?.completed ?? 0; // reuse until dedicated avg trend exists
  const participantsChange = summary?.trends?.participants ?? 0;
  const compareLabel = PERIOD_COMPARE[period];

  const metrics = [
    {
      label: 'Total Meeting Time',
      value: formatMinutes(totalMins),
      change: `${Math.abs(completedChange)}%`,
      up: completedChange >= 0,
      icon: Clock,
      iconClass: 'bg-[#E2F0FF] text-[#016BE6]',
    },
    {
      label: 'Average Meeting Duration',
      value: formatMinutes(avgMins),
      change: `${Math.abs(avgChange)}%`,
      up: avgChange >= 0,
      icon: Clock,
      iconClass: 'bg-[#EDEBFF] text-[#7C3AED]',
    },
    {
      label: 'Participants',
      value: String(participants),
      change: `${Math.abs(participantsChange)}%`,
      up: participantsChange >= 0,
      icon: Users,
      iconClass: 'bg-[#E2F0FF] text-[#016BE6]',
    },
  ];

  const chart = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    let points: { label: string; minutes: number }[] = [];

    if (period === 'Today') {
      // X = time of day (hours). Backend sends _id as "00".."23"
      const byHour = new Map<number, number>();
      for (const row of trend) {
        const key = row.date;
        let hour = Number.NaN;
        if (/^\d{2}$/.test(key)) hour = parseInt(key, 10);
        else {
          const m = key.match(/^\d{4}-\d{2}-\d{2}T(\d{2})/);
          if (m) hour = parseInt(m[1], 10);
        }
        if (!Number.isNaN(hour)) {
          byHour.set(hour, (byHour.get(hour) ?? 0) + (row.participantMinutes || 0));
        }
      }
      // Show every hour for the line; label every 3 hours on X
      points = Array.from({ length: 24 }, (_, h) => ({
        label: h % 3 === 0 ? formatHourLabel(h) : '',
        minutes: byHour.get(h) ?? 0,
      }));
    } else if (period === 'This Week') {
      const byDate = new Map(trend.map((row) => [row.date.slice(0, 10), row.participantMinutes || 0]));
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      points = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return { label: DAYS[d.getDay()], minutes: byDate.get(dateKey(d)) ?? 0 };
      });
    } else if (period === 'This Month') {
      const byDate = new Map(trend.map((row) => [row.date.slice(0, 10), row.participantMinutes || 0]));
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const labelDays = new Set(
        [1, 5, 10, 15, 20, 25, 30].filter((d) => d <= daysInMonth).concat(daysInMonth),
      );
      points = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dt = new Date(now.getFullYear(), now.getMonth(), day, 12);
        return {
          label: labelDays.has(day) ? String(day) : '',
          minutes: byDate.get(dateKey(dt)) ?? 0,
        };
      });
    } else {
      // This Year — months on X
      const byMonth = new Array(12).fill(0);
      for (const row of trend) {
        const key = row.date;
        if (/^\d{4}-\d{2}$/.test(key)) {
          const monthIdx = parseInt(key.slice(5, 7), 10) - 1;
          if (monthIdx >= 0 && monthIdx < 12) byMonth[monthIdx] += row.participantMinutes || 0;
        } else {
          const d = new Date(key.length === 10 ? `${key}T12:00:00` : key);
          if (!Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear()) {
            byMonth[d.getMonth()] += row.participantMinutes || 0;
          }
        }
      }
      points = MONTHS.map((label, i) => ({ label, minutes: byMonth[i] }));
    }

    const maxMins = Math.max(...points.map((p) => p.minutes), 0);
    const maxHoursRaw = maxMins / 60;
    const ticks = hourAxisTicks(maxHoursRaw);
    const scaleMaxHours = ticks[ticks.length - 1] || 10;
    const scaleMaxMins = scaleMaxHours * 60;
    const allZero = maxMins <= 0;
    const n = Math.max(points.length - 1, 1);

    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? (PLOT_LEFT + PLOT_RIGHT) / 2
          : PLOT_LEFT + (i * (PLOT_RIGHT - PLOT_LEFT)) / n;
      const y = allZero
        ? PLOT_BOTTOM
        : PLOT_BOTTOM - (p.minutes / scaleMaxMins) * (PLOT_BOTTOM - PLOT_TOP);
      return { x, y };
    });

    const line = smoothLine(coords);
    const last = coords[coords.length - 1];
    const first = coords[0];
    const area =
      coords.length > 1
        ? `${line} L${last.x.toFixed(1)} ${PLOT_BOTTOM} L${first.x.toFixed(1)} ${PLOT_BOTTOM} Z`
        : '';

    // Grid lines at each Y tick (top → bottom = high → 0)
    const gridYs = ticks
      .slice()
      .reverse()
      .map((h) => ({
        hours: h,
        y: PLOT_BOTTOM - (h / scaleMaxHours) * (PLOT_BOTTOM - PLOT_TOP),
      }));

    return {
      line,
      area,
      labels: points.map((p) => p.label),
      allZero,
      single: points.length === 1,
      coords,
      gridYs,
      yTicks: ticks.slice().reverse(), // top to bottom for label column
    };
  }, [trend, period]);

  return (
    <SectionCard
      className={DASHBOARD_CARD_RADIUS_CLASS}
      title="Meeting Insights"
      headerClassName="mb-0 pb-4"
      action={
        <div className="flex items-center gap-2">
          <Link
            to="/app/reports"
            className="flex items-center gap-0.5 text-[11px] font-semibold text-[#006DEC] hover:underline"
          >
            View analytics <ArrowUpRight className="size-2.5" />
          </Link>

          <div ref={rootRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-md bg-[#F1F5F9] px-2 py-1 text-[10px] font-medium text-[#334155]"
            >
              {period}
              <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
            </button>

            {open ? (
              <div
                id={menuId}
                role="listbox"
                className="absolute right-0 z-40 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-[#E8ECF1] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              >
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="option"
                    aria-selected={p === period}
                    className={cn(
                      'flex w-full px-3 py-1.5 text-left text-[11px] font-medium hover:bg-[#F5F7FA]',
                      p === period ? 'text-[#006DEC]' : 'text-[#151D2B]',
                    )}
                    onClick={() => {
                      setPeriod(p);
                      setOpen(false);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      {loading ? (
        <div aria-busy="true" aria-label="Loading insights">
          <InsightsBodySkeleton />
        </div>
      ) : (
        <>
          {/* Metric row — line below header, vertical dividers between columns */}
          <div className="grid grid-cols-3 divide-x divide-[#EEF1F5] border-t border-[#EEF1F5] pt-3">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-[10px] leading-tight text-[#8A94A6]">{m.label}</p>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md ${m.iconClass}`}
                    >
                      <Icon className="size-3" strokeWidth={2} />
                    </span>
                  </div>
                  <p className="text-[20px] font-bold leading-none tracking-tight tabular-nums text-[#151D2B]">
                    {m.value}
                  </p>
                  <p
                    className={`mt-1.5 text-[10px] font-medium ${m.up ? 'text-[#00A45C]' : 'text-[#DF1E39]'}`}
                  >
                    <span className="mr-0.5">{m.up ? '↑' : '↓'}</span>
                    {m.up ? '+' : '-'}
                    {m.change}{' '}
                    <span className="font-normal text-[#8A94A6]">{compareLabel}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Chart — clear gap under metrics */}
          <div className="mt-7 flex gap-2 pb-1">
            {/* Y-axis: Hours label above ticks so it never overlaps 0/2/5/10 */}
            <div className="flex w-8 shrink-0 flex-col">
              <span className="mb-1 h-3 text-[9px] font-medium leading-3 text-[#8A94A6]">Hours</span>
              <div className="relative" style={{ height: CHART_H }}>
                {chart.yTicks.map((h) => {
                  const scaleMax = chart.yTicks[0] || 10;
                  const y = PLOT_BOTTOM - (h / scaleMax) * (PLOT_BOTTOM - PLOT_TOP);
                  return (
                    <span
                      key={h}
                      className="absolute right-0 -translate-y-1/2 text-[9px] tabular-nums leading-none text-[#8A94A6]"
                      style={{ top: y }}
                    >
                      {h}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {/* Match Y-axis "Hours" row so plot lines up with ticks */}
              <div className="mb-1 h-3" aria-hidden />
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                className="block w-full"
                style={{ height: CHART_H }}
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <linearGradient id="dashInsightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#016BE6" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#016BE6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chart.gridYs.map((g) => (
                  <line
                    key={g.hours}
                    x1={PLOT_LEFT}
                    y1={g.y}
                    x2={PLOT_RIGHT}
                    y2={g.y}
                    stroke="#EEF1F5"
                    strokeWidth="1"
                  />
                ))}
                {chart.allZero ? (
                  <line
                    x1={PLOT_LEFT}
                    y1={PLOT_BOTTOM}
                    x2={PLOT_RIGHT}
                    y2={PLOT_BOTTOM}
                    stroke="#016BE6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : chart.single ? (
                  <circle cx={chart.coords[0].x} cy={chart.coords[0].y} r="4" fill="#016BE6" />
                ) : (
                  <>
                    <path d={chart.area} fill="url(#dashInsightFill)" />
                    <path
                      d={chart.line}
                      fill="none"
                      stroke="#016BE6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
              <div className="mt-2 flex justify-between px-1">
                {chart.labels.map((d, i) => (
                  <span
                    key={`${d || 'x'}-${i}`}
                    className="min-w-0 flex-1 text-center text-[9px] text-[#8A94A6]"
                  >
                    {d || '\u00a0'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}
