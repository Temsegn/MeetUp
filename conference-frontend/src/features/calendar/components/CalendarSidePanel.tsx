import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import {
  EVENT_STYLES,
  formatDayLabel,
  getDefaultSelectedDay,
  getUpcomingMeetings,
  meetingsForDay,
  weekDaysContaining,
  weekdayLabel,
  type CalendarEventType,
} from '../data/calendar.data';

type Props = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  activeTypes: Set<CalendarEventType>;
  /** Day view uses a fuller schedule layout */
  variant?: 'side' | 'day';
};

function AvatarStack({
  count,
  name,
  avatarUrl,
  avatarColor,
  size = 'sm',
}: {
  count: number;
  name?: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: 'sm' | 'xs';
}) {
  if (count <= 0) {
    return <span className="text-[10px] tabular-nums font-semibold text-[#94A3B8]">0</span>;
  }

  return (
    <div className="flex items-center">
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        avatarColor={avatarColor}
        size={size === 'xs' ? 'xs' : 'sm'}
        ring
      />
      {count > 1 ? (
        <span className="ml-1 text-[10px] font-semibold text-[#6F7B8C]">+{count - 1}</span>
      ) : null}
    </div>
  );
}

export function CalendarSidePanel({
  selectedDay,
  onSelectDay,
  activeTypes,
  variant = 'side',
}: Props) {
  const navigate = useNavigate();
  const meetings = meetingsForDay(selectedDay, activeTypes);
  const weekDays = weekDaysContaining(selectedDay);
  const dateLabel = formatDayLabel(selectedDay);
  const upcoming = getUpcomingMeetings();
  const isDay = variant === 'day';

  const joinMeeting = (roomId?: string, meetingId?: string) => {
    if (meetingId) {
      navigate(`/app/meetings/${meetingId}`);
      return;
    }
    if (roomId) {
      navigate(`/app/meeting/${roomId}`);
      return;
    }
    navigate('/app/meetings');
  };

  return (
    <aside
      className={cn(
        'flex w-full flex-col',
        isDay ? 'mx-auto max-w-[520px] gap-4' : 'gap-2.5',
      )}
    >
      <section
        className={cn(
          'rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
          isDay ? 'p-4 sm:p-5' : 'p-3',
        )}
      >
        <div className={cn('flex items-center justify-between gap-2', isDay ? 'mb-3' : 'mb-2')}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectDay(Math.max(1, selectedDay - 1))}
              className="rounded-md p-0.5 text-[#6F7B8C] hover:bg-[#F1F5F9]"
              aria-label="Previous day"
            >
              <ChevronLeft className={isDay ? 'size-4' : 'size-3.5'} />
            </button>
            <h3
              className={cn(
                'font-bold text-[#151D2B]',
                isDay ? 'text-[15px]' : 'text-[12px]',
              )}
            >
              {dateLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectDay(getDefaultSelectedDay())}
            className={cn(
              'font-semibold text-[#016BE6] hover:underline',
              isDay ? 'text-[12px]' : 'text-[11px]',
            )}
          >
            Today
          </button>
        </div>

        <div className={cn('grid grid-cols-7 gap-0.5', isDay ? 'mb-4' : 'mb-2.5')}>
          {weekDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="py-0.5" />;
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className="flex flex-col items-center gap-0.5 py-0.5"
              >
                <span
                  className={cn(
                    'font-medium',
                    isDay ? 'text-[10px]' : 'text-[9px]',
                    isSelected ? 'text-[#016BE6]' : 'text-[#94A3B8]',
                  )}
                >
                  {weekdayLabel(day)}
                </span>
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full font-semibold',
                    isDay ? 'size-8 text-[12px]' : 'size-7 text-[11px]',
                    isSelected
                      ? 'bg-[#016BE6] text-white'
                      : 'text-[#151D2B] hover:bg-[#F1F5F9]',
                  )}
                >
                  {day}
                </span>
                {isSelected ? (
                  <span className="size-1 rounded-full bg-[#016BE6]" />
                ) : (
                  <span className="size-1" />
                )}
              </button>
            );
          })}
        </div>

        {meetings.length === 0 ? (
          <p
            className={cn(
              'text-center tabular-nums text-[#6F7B8C]',
              isDay ? 'py-8 text-[13px]' : 'py-4 text-[11px]',
            )}
          >
            0 meetings
          </p>
        ) : (
          <ul className={isDay ? 'space-y-3' : 'space-y-2'}>
            {meetings.map((m) => {
              const style = EVENT_STYLES[m.type];
              return (
                <li
                  key={m.id}
                  className={cn(
                    'rounded-xl border border-[#E8ECF1] bg-white',
                    isDay ? 'px-3.5 py-3' : 'rounded-lg px-2.5 py-2',
                  )}
                >
                  {isDay ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cn('size-2 shrink-0 rounded-full', style.dot)} />
                          <span className="text-[12px] font-medium text-[#6F7B8C]">{m.time}</span>
                          <span className="truncate text-[13px] font-semibold text-[#151D2B]">
                            {m.title}
                          </span>
                        </div>
                        <span className="shrink-0 text-[12px] text-[#94A3B8]">{m.duration}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <AvatarStack
                          count={m.avatars}
                          name={m.hostName}
                          avatarUrl={m.hostAvatarUrl}
                          avatarColor={m.hostAvatarColor}
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => joinMeeting(m.roomId, m.meetingId)}
                            className="rounded-lg bg-[#016BE6] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0056EF]"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', style.dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="text-[10px] font-medium text-[#6F7B8C]">{m.time}</p>
                          <span className="shrink-0 text-[10px] text-[#94A3B8]">{m.duration}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-[#151D2B]">
                          {m.title}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-1.5">
                          <AvatarStack
                            count={m.avatars}
                            name={m.hostName}
                            avatarUrl={m.hostAvatarUrl}
                            avatarColor={m.hostAvatarColor}
                            size="xs"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => joinMeeting(m.roomId, m.meetingId)}
                              className="rounded-md bg-[#016BE6] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#0056EF]"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 text-[#94A3B8] hover:bg-[#F1F5F9]"
                              aria-label="More options"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className={cn(
          'rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
          isDay ? 'p-4 sm:p-5' : 'p-3',
        )}
      >
        <div className={cn('flex items-center justify-between', isDay ? 'mb-3' : 'mb-2')}>
          <h3
            className={cn('font-bold text-[#151D2B]', isDay ? 'text-[14px]' : 'text-[12px]')}
          >
            Upcoming Meetings
          </h3>
          <span
            className={cn(
              'tabular-nums font-semibold text-[#6F7B8C]',
              isDay ? 'text-[11px]' : 'text-[10px]',
            )}
          >
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p
            className={cn(
              'text-center tabular-nums text-[#6F7B8C]',
              isDay ? 'py-6 text-[13px]' : 'py-3 text-[11px]',
            )}
          >
            0
          </p>
        ) : (
          <ul className={isDay ? 'space-y-3.5' : 'space-y-2.5'}>
            {upcoming.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'grid items-start gap-2',
                  isDay
                    ? 'grid-cols-[6.5rem_minmax(0,1fr)]'
                    : 'grid-cols-[5.5rem_minmax(0,1fr)]',
                )}
              >
                <div>
                  <p
                    className={cn(
                      'font-medium text-[#6F7B8C]',
                      isDay ? 'text-[11px]' : 'text-[10px]',
                    )}
                  >
                    {m.dayLabel}
                  </p>
                  <p className={cn('mt-0.5 text-[#94A3B8]', isDay ? 'text-[11px]' : 'text-[10px]')}>
                    {m.time}
                  </p>
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'font-semibold leading-snug text-[#151D2B]',
                      isDay ? 'text-[12px]' : 'line-clamp-2 text-[11px]',
                    )}
                  >
                    {m.title}
                  </p>
                  <div className="mt-1">
                    <AvatarStack
                      count={m.avatars}
                      name={m.hostName}
                      avatarUrl={m.hostAvatarUrl}
                      avatarColor={m.hostAvatarColor}
                      size={isDay ? 'sm' : 'xs'}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => navigate('/app/meetings')}
          className={cn(
            'inline-flex w-full items-center justify-center gap-1.5 border border-[#016BE6] font-semibold text-[#016BE6] hover:bg-[#E8F1FF]',
            isDay
              ? 'mt-4 h-10 rounded-xl text-[13px]'
              : 'mt-3 h-8 rounded-lg text-[11px]',
          )}
        >
          <CalendarPlus className={isDay ? 'size-4' : 'size-3.5'} />
          Schedule a Meeting
        </button>
      </section>
    </aside>
  );
}
