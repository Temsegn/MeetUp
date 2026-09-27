import {
  Hand,
  MessageSquare,
  Mic,
  MonitorUp,
  MoreHorizontal,
  Pencil,
  PhoneOff,
  Users,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LP_CARD } from '../landing-ui';

const CONTROLS = [
  { id: 'mic', label: 'Mic', Icon: Mic },
  { id: 'camera', label: 'Camera', Icon: Video, active: true },
  { id: 'hand', label: 'Raise Hand', Icon: Hand },
  { id: 'share', label: 'Screen', Icon: MonitorUp },
  { id: 'people', label: 'Participants', Icon: Users, active: true },
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'board', label: 'Whiteboard', Icon: Pencil },
  { id: 'more', label: 'More', Icon: MoreHorizontal },
] as const;

/** Decorative clone of the live meeting stage + ConferenceControlBar. */
export function MeetingRoomPreview() {
  return (
    <div className={`${LP_CARD} overflow-hidden`}>
      <div className="border-b border-[#E8ECF1] bg-white px-4 py-2.5">
        <p className="text-[13px] font-bold tracking-tight text-[#151D2B]">Live room</p>
        <p className="text-[11px] text-[#6F7B8C]">Waiting room on · Host controls</p>
      </div>
      <div className="grid gap-2 bg-[#F5F7FA] p-3 sm:grid-cols-2 sm:p-4">
        <Tile name="You" meta="Host" accent />
        <Tile name="Guest" meta="Waiting for admit" waiting />
      </div>
      <div className="bg-[#F5F7FA] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto rounded-[18px] border border-[#E0E7EE] bg-white p-2 shadow-[0_1px_2px_rgba(55,72,99,0.04)] sm:rounded-[22px] sm:p-3">
          <div className="flex items-center gap-0.5">
            {CONTROLS.map((item) => {
              const Icon = item.Icon;
              const active = 'active' in item && item.active;
              return (
                <span key={item.id} className="flex w-11 shrink-0 flex-col items-center gap-1 py-1 sm:w-[64px]">
                  <span
                    className={cn(
                      'inline-flex size-10 items-center justify-center rounded-full',
                      active ? 'bg-[#E5F1FF] text-[#076BEE]' : 'bg-[#F0F5FA] text-[#334155]',
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="hidden text-[10px] text-[#667383] sm:block">{item.label}</span>
                </span>
              );
            })}
          </div>
          <span className="flex w-11 shrink-0 flex-col items-center gap-1 py-1 sm:w-[64px]">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
              <PhoneOff className="size-5" strokeWidth={2} />
            </span>
            <span className="hidden text-[10px] text-[#667383] sm:block">Leave</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Tile({
  name,
  meta,
  accent,
  waiting,
}: {
  name: string;
  meta: string;
  accent?: boolean;
  waiting?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-[140px] flex-col justify-end overflow-hidden rounded-[14px] p-3 sm:min-h-[180px]',
        waiting ? 'bg-[#E8ECF1]' : 'bg-[#151D2B]',
      )}
    >
      <div
        className={cn(
          'absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-[58%] items-center justify-center rounded-full text-[16px] font-bold',
          waiting ? 'bg-white text-[#6F7B8C]' : 'bg-[#016BE6] text-white',
        )}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="relative flex items-center justify-between">
        <div>
          <p className={cn('text-[13px] font-semibold', waiting ? 'text-[#151D2B]' : 'text-white')}>{name}</p>
          <p className={cn('text-[11px]', waiting ? 'text-[#6F7B8C]' : 'text-white/70')}>{meta}</p>
        </div>
        {accent ? (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/15 text-white">
            <Mic className="size-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
