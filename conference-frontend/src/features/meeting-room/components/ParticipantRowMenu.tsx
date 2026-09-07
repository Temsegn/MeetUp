import { useEffect, useRef, useState } from 'react';
import { Ban, Camera, CameraOff, MessageSquareOff, Mic, MicOff, MonitorUp, MoreVertical } from 'lucide-react';
import { cn } from '../../../lib/cn';

export type ParticipantModerationAction =
  | 'mute'
  | 'unmute'
  | 'camera-off'
  | 'camera-on'
  | 'disable-chat'
  | 'enable-chat'
  | 'kick'
  | 'request-control';

type Props = {
  participantName: string;
  muted?: boolean;
  isHostViewer?: boolean;
  isYou?: boolean;
  remoteControlPending?: boolean;
  onModerate?: (action: ParticipantModerationAction) => void;
};

export function ParticipantRowMenu({
  participantName,
  muted,
  isHostViewer,
  isYou,
  remoteControlPending,
  onModerate,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (isYou || !onModerate) return null;

  const items: { id: ParticipantModerationAction; label: string; icon: typeof Mic; danger?: boolean }[] = [];

  if (isHostViewer) {
    items.push(
      muted
        ? { id: 'unmute', label: 'Ask to unmute', icon: Mic }
        : { id: 'mute', label: 'Mute microphone', icon: MicOff },
      { id: 'camera-off', label: 'Turn off camera', icon: CameraOff },
      { id: 'camera-on', label: 'Ask to turn on camera', icon: Camera },
      { id: 'disable-chat', label: 'Disable chat', icon: MessageSquareOff },
      { id: 'enable-chat', label: 'Enable chat', icon: MessageSquareOff },
      { id: 'kick', label: 'Remove from meeting', icon: Ban, danger: true },
    );
  }

  items.push({
    id: 'request-control',
    label: remoteControlPending ? 'Request pending…' : 'Request remote control',
    icon: MonitorUp,
  });

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label={`Actions for ${participantName}`}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#151D2B]"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-[#E8ECF1] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.id === 'request-control' && remoteControlPending}
                onClick={() => {
                  onModerate(item.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-[#F8FAFC] disabled:opacity-50',
                  item.danger ? 'text-[#DC2626]' : 'text-[#151D2B]',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
