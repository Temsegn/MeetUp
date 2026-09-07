import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  ALL_EVENT_TYPES,
  EVENT_STYLES,
  type CalendarEventType,
} from '../data/calendar.data';

export type CalendarView = 'Month' | 'Week' | 'Day';

/** Compact control button — shared height for a straight row */
const btn =
  'inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-[#E1E7EE] bg-white text-[10px] font-semibold leading-none text-[#475569] shadow-sm hover:bg-[#F8FAFC]';

type ViewSwitcherProps = {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
};

/** Month / Week / Day — white bg only on active */
export function CalendarViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {(['Month', 'Week', 'Day'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onViewChange(v)}
          className={cn(
            'h-7 rounded-md px-2.5 text-[10px] font-semibold transition-colors',
            view === v
              ? 'border border-[#E1E7EE] bg-white text-[#151D2B] shadow-sm'
              : 'border border-transparent bg-transparent text-[#6F7B8C] hover:bg-[#F1F5F9] hover:text-[#334155]',
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

type DateNavProps = {
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  monthLabel: string;
};

type FiltersProps = {
  activeTypes: Set<CalendarEventType>;
  onToggleType: (type: CalendarEventType) => void;
  onResetFilters: () => void;
};

/**
 * Single straight row: Today · ‹ › · May 2024 · Filters
 * Compact so it fits above the meeting list without wrapping.
 */
export function CalendarSideToolbar({
  onToday,
  onPrev,
  onNext,
  monthLabel,
  activeTypes,
  onToggleType,
  onResetFilters,
}: DateNavProps & FiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtersActive = activeTypes.size < ALL_EVENT_TYPES.length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="flex h-7 w-full flex-nowrap items-center gap-1">
      <button type="button" onClick={onToday} className={cn(btn, 'px-2')}>
        Today
      </button>
      <button type="button" onClick={onPrev} className={cn(btn, 'size-7')} aria-label="Previous">
        <ChevronLeft className="size-3" />
      </button>
      <button type="button" onClick={onNext} className={cn(btn, 'size-7')} aria-label="Next">
        <ChevronRight className="size-3" />
      </button>
      <button type="button" className={cn(btn, 'min-w-0 gap-1 px-1.5 text-[#151D2B]')}>
        <CalendarDays className="size-3 shrink-0 text-[#6F7B8C]" />
        <span className="truncate">{monthLabel}</span>
        <ChevronDown className="size-2.5 shrink-0 text-[#94A3B8]" />
      </button>

      <div className="relative ml-auto shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            btn,
            'gap-1 px-2',
            filtersActive && 'border-[#016BE6] text-[#016BE6]',
          )}
        >
          <SlidersHorizontal className="size-3" />
          Filters
          {filtersActive ? (
            <span className="rounded-full bg-[#016BE6] px-1 text-[8px] font-bold text-white">
              {activeTypes.size}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-xl border border-[#E8ECF1] bg-white p-2.5 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold text-[#151D2B]">Meeting type</span>
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[10px] font-semibold text-[#016BE6] hover:underline"
              >
                Reset
              </button>
            </div>
            <ul className="space-y-1">
              {ALL_EVENT_TYPES.map((type) => {
                const checked = activeTypes.has(type);
                return (
                  <li key={type}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleType(type)}
                        className="size-3.5 rounded border-[#CBD5E1] text-[#016BE6] focus:ring-[#016BE6]"
                      />
                      <span className={`size-2 rounded-full ${EVENT_STYLES[type].dot}`} />
                      <span className="text-[11px] text-[#334155]">{EVENT_STYLES[type].label}</span>
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
