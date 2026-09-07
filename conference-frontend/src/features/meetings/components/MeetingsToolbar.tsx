import { ListFilter, Search } from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  type MeetingListFilters,
  type MeetingStatusFilter,
} from '../data/meetings.data';

const STATUS_TABS: {
  key: MeetingStatusFilter;
  label: string;
  dot?: string;
}[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live', dot: 'bg-[#22C55E]' },
  { key: 'upcoming', label: 'Upcoming', dot: 'bg-[#F97316]' },
  { key: 'ended', label: 'Ended', dot: 'bg-[#64748B]' },
  { key: 'cancelled', label: 'Cancelled', dot: 'bg-[#EF4444]' },
];

type Props = {
  filters: MeetingListFilters;
  onChange: (next: MeetingListFilters) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
};

export function MeetingsToolbar({
  filters,
  onChange,
  filtersOpen,
  onToggleFilters,
}: Props) {
  const filtersActive = Boolean(filters.date || filters.time);

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-fit max-w-full flex-wrap items-center gap-2">
        <label className="flex h-9 w-[220px] max-w-full items-center gap-2 rounded-xl border border-[#E1E7EE] bg-white px-3 shadow-sm sm:w-[260px]">
          <Search className="size-3.5 shrink-0 text-[#94A3B8]" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search by title or host..."
            className="w-full bg-transparent text-[12px] text-[#151D2B] outline-none placeholder:text-[#94A3B8]"
          />
        </label>

        <button
          type="button"
          onClick={onToggleFilters}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[12px] font-semibold shadow-sm',
            filtersOpen || filtersActive
              ? 'border-[#016BE6] bg-[#E8F1FE] text-[#016BE6]'
              : 'border-[#E1E7EE] bg-white text-[#334155] hover:bg-[#F8FAFC]',
          )}
        >
          <ListFilter className="size-3.5" />
          Filters
        </button>
      </div>

      <div className="flex w-fit max-w-full flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange({ ...filters, status: tab.key })}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[12px] font-semibold transition-colors',
              filters.status === tab.key
                ? 'border-[#016BE6] bg-[#016BE6] text-white shadow-sm'
                : 'border-[#E1E7EE] bg-white text-[#6F7B8C] hover:border-[#CBD5E1] hover:text-[#334155]',
            )}
          >
            {tab.dot ? (
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  tab.dot,
                  filters.status === tab.key && 'ring-2 ring-white/40',
                )}
              />
            ) : null}
            {tab.label}
          </button>
        ))}
      </div>

      {filtersOpen ? (
        <div className="flex w-full flex-wrap items-end gap-3 rounded-xl border border-[#E8ECF1] bg-white p-3 shadow-sm">
          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
              Date
            </span>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => onChange({ ...filters, date: e.target.value })}
              className="h-9 w-full rounded-xl border border-[#E1E7EE] bg-white px-2.5 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
            />
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
              Time
            </span>
            <input
              type="time"
              value={filters.time}
              onChange={(e) => onChange({ ...filters, time: e.target.value })}
              className="h-9 w-full rounded-xl border border-[#E1E7EE] bg-white px-2.5 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...filters, date: '', time: '' })}
            className="h-9 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#016BE6] hover:bg-[#F8FAFC]"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
