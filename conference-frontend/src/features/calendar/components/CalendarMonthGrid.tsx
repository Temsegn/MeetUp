import { cn } from '../../../lib/cn';
import {
  EVENT_STYLES,
  eventsForDay,
  getCalendarDaysInMonth,
  getCalendarMonthIndex,
  getCalendarStartOffset,
  getCalendarYear,
  type CalendarEventType,
} from '../data/calendar.data';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Max events shown stacked per cell */
const MAX_VISIBLE = 3;
/**
 * Fixed cell height — fits day number + up to 3 clear event cards
 * (time + title each) without crowding or tiny text.
 */
const CELL_H = 'h-[11.5rem] sm:h-[12rem]';

type Cell =
  | { kind: 'prev'; day: number }
  | { kind: 'current'; day: number }
  | { kind: 'next'; day: number };

type Props = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  activeTypes: Set<CalendarEventType>;
  /** Bump to re-read live events after API load */
  revision?: number;
};

function buildCells(): Cell[] {
  const daysInMonth = getCalendarDaysInMonth();
  const startOffset = getCalendarStartOffset();
  const y = getCalendarYear();
  const m = getCalendarMonthIndex();
  const prevMonthLast = new Date(y, m, 0).getDate();
  const total = 42;
  return Array.from({ length: total }, (_, i) => {
    const n = i - startOffset + 1;
    if (n < 1) {
      return { kind: 'prev', day: prevMonthLast - startOffset + i + 1 };
    }
    if (n > daysInMonth) {
      return { kind: 'next', day: n - daysInMonth };
    }
    return { kind: 'current', day: n };
  });
}

export function CalendarMonthGrid({ selectedDay, onSelectDay, activeTypes, revision = 0 }: Props) {
  void revision;
  const cells = buildCells();

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-7 border-b border-[#F1F4F8]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-semibold tracking-wide text-[#8A94A6]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isCurrent = cell.kind === 'current';
          const events = isCurrent ? eventsForDay(cell.day, activeTypes) : [];
          const isSelected = isCurrent && cell.day === selectedDay;
          const visible = events.slice(0, MAX_VISIBLE);
          const extra = events.length - MAX_VISIBLE;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isCurrent}
              onClick={() => isCurrent && onSelectDay(cell.day)}
              className={cn(
                'relative flex flex-col items-stretch overflow-hidden border-r border-b border-[#F1F4F8] p-1.5 text-left sm:p-2',
                CELL_H,
                isCurrent ? 'hover:bg-[#F8FAFC]' : 'bg-[#FAFBFC]',
                idx % 7 === 6 && 'border-r-0',
              )}
            >
              <span
                className={cn(
                  'mb-1 flex size-6 shrink-0 items-center justify-center self-start rounded-full text-[12px] font-semibold tabular-nums',
                  !isCurrent && 'text-[#CBD5E1]',
                  isCurrent && !isSelected && 'text-[#334155]',
                  isSelected && 'bg-[#016BE6] text-white',
                )}
              >
                {cell.day}
              </span>
              {isCurrent ? (
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  {visible.map((ev) => {
                    const style = EVENT_STYLES[ev.type];
                    return (
                      <div key={ev.id} className={cn('shrink-0 rounded-md px-1.5 py-1', style.chip)}>
                        <div className="flex items-center gap-1">
                          <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} />
                          <span className="text-[9px] font-medium text-[#6F7B8C]">{ev.time}</span>
                        </div>
                        <p className="mt-0.5 truncate pl-2.5 text-[10px] font-semibold leading-snug text-[#151D2B]">
                          {ev.title}
                        </p>
                      </div>
                    );
                  })}
                  {extra > 0 ? (
                    <p className="px-0.5 text-[9px] font-medium text-[#94A3B8]">+{extra} more</p>
                  ) : null}
                  {events.length === 0 ? (
                    <p className="pt-6 text-center text-[10px] tabular-nums text-[#CBD5E1]">0</p>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
