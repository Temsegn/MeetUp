import { cn } from '../../../lib/cn';
import {
  EVENT_STYLES,
  eventsForDay,
  weekDaysContaining,
  weekdayLabel,
  type CalendarEventType,
} from '../data/calendar.data';

type Props = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  activeTypes: Set<CalendarEventType>;
  revision?: number;
};

export function CalendarWeekGrid({ selectedDay, onSelectDay, activeTypes, revision = 0 }: Props) {
  void revision;
  const days = weekDaysContaining(selectedDay);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-7 border-b border-[#F1F4F8]">
        {days.map((day, i) => (
          <div
            key={i}
            className="py-1.5 text-center text-[9px] font-semibold tracking-wide text-[#8A94A6] sm:text-[10px]"
          >
            {day ? weekdayLabel(day) : '—'}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const events = day ? eventsForDay(day, activeTypes) : [];
          const isSelected = day === selectedDay;

          return (
            <button
              key={i}
              type="button"
              disabled={!day}
              onClick={() => day && onSelectDay(day)}
              className={cn(
                'relative flex h-[16rem] flex-col items-stretch border-r border-[#F1F4F8] p-1.5 text-left last:border-r-0 sm:h-[17rem] sm:p-2',
                day ? 'hover:bg-[#F8FAFC]' : 'bg-[#FAFBFC]',
                isSelected && 'bg-[#F0F6FF]',
              )}
            >
              {day ? (
                <>
                  <span
                    className={cn(
                      'mb-1.5 flex size-6 shrink-0 items-center justify-center self-start rounded-full text-[12px] font-semibold tabular-nums',
                      isSelected ? 'bg-[#016BE6] text-white' : 'text-[#334155]',
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                    {events.slice(0, 3).map((ev) => {
                      const style = EVENT_STYLES[ev.type];
                      return (
                        <div
                          key={ev.id}
                          className={cn('shrink-0 rounded-md px-1.5 py-1.5', style.chip)}
                        >
                          <div className="flex items-center gap-1">
                            <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} />
                            <span className="text-[10px] font-medium text-[#6F7B8C]">{ev.time}</span>
                          </div>
                          <p className="mt-0.5 truncate pl-2.5 text-[11px] font-semibold leading-snug text-[#151D2B]">
                            {ev.title}
                          </p>
                        </div>
                      );
                    })}
                    {events.length > 3 ? (
                      <p className="px-0.5 text-[10px] font-medium text-[#94A3B8]">
                        +{events.length - 3} more
                      </p>
                    ) : null}
                    {events.length === 0 ? (
                      <p className="pt-8 text-center text-[10px] tabular-nums text-[#CBD5E1]">0</p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
