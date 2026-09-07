import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ListFilter } from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  DATE_RANGES,
  MEETING_TYPE_OPTIONS,
  type DateRangeKey,
  type MeetingTypeKey,
  type ReportFilters,
} from '../data/reports.data';

type Props = {
  filters: ReportFilters;
  rangeDays: number;
  onDateRangeChange: (key: DateRangeKey) => void;
  onToggleType: (key: MeetingTypeKey) => void;
  onSelectAllTypes: () => void;
  onResetTypes: () => void;
  className?: string;
};

function formatDateRangeLabel(days: number): string {
  const end = new Date();
  if (days <= 1) {
    return end.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function ReportsToolbar({
  filters,
  rangeDays,
  onDateRangeChange,
  onToggleType,
  onSelectAllTypes,
  onResetTypes,
  className,
}: Props) {
  const [dateOpen, setDateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const range = DATE_RANGES.find((r) => r.key === filters.dateRange)!;
  const typesActive = filters.meetingTypes.size < MEETING_TYPE_OPTIONS.filter((o) => o.key !== 'all').length;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dateRef.current && !dateRef.current.contains(t)) setDateOpen(false);
      if (filtersRef.current && !filtersRef.current.contains(t)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative" ref={dateRef}>
        <button
          type="button"
          onClick={() => {
            setDateOpen((o) => !o);
            setFiltersOpen(false);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#475569] shadow-sm hover:bg-[#F8FAFC]"
        >
          <CalendarDays className="size-4 text-[#6F7B8C]" />
          <span className="hidden sm:inline">{formatDateRangeLabel(rangeDays)}</span>
          <span className="sm:hidden">{range.short}</span>
          <ChevronDown className="size-3.5 text-[#94A3B8]" />
        </button>
        {dateOpen ? (
          <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-[#E8ECF1] bg-white p-1.5 shadow-lg">
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  onDateRangeChange(r.key);
                  setDateOpen(false);
                }}
                className={cn(
                  'flex w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-medium',
                  filters.dateRange === r.key
                    ? 'bg-[#E8F1FF] text-[#016BE6]'
                    : 'text-[#334155] hover:bg-[#F8FAFC]',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative" ref={filtersRef}>
        <button
          type="button"
          onClick={() => {
            setFiltersOpen((o) => !o);
            setDateOpen(false);
          }}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-[12px] font-semibold shadow-sm hover:bg-[#F8FAFC]',
            typesActive
              ? 'border-[#016BE6] text-[#016BE6]'
              : 'border-[#E1E7EE] text-[#475569]',
          )}
        >
          <ListFilter className="size-4" />
          Filters
          {typesActive ? (
            <span className="rounded-full bg-[#016BE6] px-1.5 text-[9px] font-bold text-white">
              {filters.meetingTypes.size}
            </span>
          ) : null}
        </button>
        {filtersOpen ? (
          <div className="absolute right-0 z-30 mt-1.5 w-52 rounded-xl border border-[#E8ECF1] bg-white p-2.5 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold text-[#151D2B]">Meeting type</span>
              <button
                type="button"
                onClick={onResetTypes}
                className="text-[10px] font-semibold text-[#016BE6] hover:underline"
              >
                Reset
              </button>
            </div>
            <ul className="space-y-1">
              <li>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#F8FAFC]">
                  <input
                    type="checkbox"
                    checked={
                      filters.meetingTypes.size >=
                      MEETING_TYPE_OPTIONS.filter((o) => o.key !== 'all').length
                    }
                    onChange={onSelectAllTypes}
                    className="size-3.5 rounded border-[#CBD5E1] text-[#016BE6] focus:ring-[#016BE6]"
                  />
                  <span className="text-[11px] font-medium text-[#334155]">All types</span>
                </label>
              </li>
              {MEETING_TYPE_OPTIONS.filter((o) => o.key !== 'all').map((opt) => {
                const key = opt.key as MeetingTypeKey;
                const checked = filters.meetingTypes.has(key);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleType(key)}
                        className="size-3.5 rounded border-[#CBD5E1] text-[#016BE6] focus:ring-[#016BE6]"
                      />
                      <span className="text-[11px] text-[#334155]">{opt.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
