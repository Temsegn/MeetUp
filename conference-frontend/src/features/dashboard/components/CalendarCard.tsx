import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SectionCard } from './SectionCard';
import { useMeetings } from '../../meetings/hooks/useMeetings';
import { CalendarBodySkeleton } from './DashboardSkeletons';
import { DASHBOARD_CARD_RADIUS_CLASS } from './dashboardListStyles';
import { cn } from '../../../lib/cn';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarCard({ className }: { className?: string }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
  });
  const { meetings, loading } = useMeetings({ status: 'scheduled', page: 1, limit: 100 });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const marked = useMemo(() => {
    const set = new Set<number>();
    for (const m of meetings) {
      if (!m.scheduledAt) continue;
      const dt = new Date(m.scheduledAt);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        set.add(dt.getDate());
      }
    }
    return set;
  }, [meetings, year, month]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const prevDays = Array.from({ length: startOffset }, (_, i) => prevMonthLast - startOffset + i + 1);
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailing = Math.max(0, 42 - startOffset - daysInMonth);

  return (
    <SectionCard
      className={cn(DASHBOARD_CARD_RADIUS_CLASS, className)}
      title="Calendar"
      action={
        <Link
          to="/app/calendar"
          className="flex items-center gap-0.5 text-[10px] font-semibold text-[#006DEC] hover:underline"
        >
          View full calendar <ArrowUpRight className="size-2.5" />
        </Link>
      }
    >
      {loading ? (
        <div aria-busy="true" aria-label="Loading calendar">
          <CalendarBodySkeleton />
        </div>
      ) : (
        <>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#151D2B]">{monthLabel}</span>
        <div className="flex gap-0.5">
          <button
            type="button"
            className="rounded-md p-0.5 hover:bg-[#F1F5F9]"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1, 12))}
          >
            <ChevronLeft className="size-3.5 text-[#6F7B8C]" />
          </button>
          <button
            type="button"
            className="rounded-md p-0.5 hover:bg-[#F1F5F9]"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1, 12))}
          >
            <ChevronRight className="size-3.5 text-[#6F7B8C]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DAYS.map((d) => (
          <span key={d} className="py-0.5 text-[9px] font-medium text-[#8A94A6]">
            {d}
          </span>
        ))}
        {prevDays.map((d) => (
          <span key={`p-${d}`} className="py-1.5 text-[11px] text-[#CBD5E1]">
            {d}
          </span>
        ))}
        {currentDays.map((d) => (
          <button
            key={d}
            type="button"
            className={`relative py-1.5 text-[11px] ${
              d === todayDay
                ? 'rounded-full bg-[#006DEC] font-bold text-white'
                : 'rounded-full text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            {d}
            {marked.has(d) && d !== todayDay ? (
              <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#006DEC]" />
            ) : null}
          </button>
        ))}
        {Array.from({ length: trailing }, (_, i) => (
          <span key={`n-${i}`} className="py-1.5 text-[11px] text-[#CBD5E1]">
            {i + 1}
          </span>
        ))}
      </div>
        </>
      )}
    </SectionCard>
  );
}
