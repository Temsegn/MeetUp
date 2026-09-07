import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  MessageSquare,
  Users,
  Circle,
  Pencil,
  PhoneOff,
  Smile,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/cn';

const REACTIONS = ['👍', '👏', '❤️', '🎉', '😂', '😮', '🔥', '🙌'];

type ControlItem = {
  id: string;
  label: string;
  icon: typeof Mic;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  recording?: boolean;
  onClick?: () => void;
};

type Props = {
  muted: boolean;
  cameraOff: boolean;
  handRaised: boolean;
  sharing: boolean;
  recording: boolean;
  recordingBusy?: boolean;
  whiteboardOpen: boolean;
  participantsOpen: boolean;
  chatOpen: boolean;
  canEndMeeting?: boolean;
  canRecord?: boolean;
  shareDisabled?: boolean;
  shareDisabledReason?: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleHand: () => void;
  onToggleShare: () => void;
  onToggleRecording?: () => void;
  onToggleWhiteboard: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onSendReaction: (reaction: string) => void;
  onLeave: () => void;
  onEndCall: () => void;
  userName?: string;
};

function ControlIconButton({
  item,
  large,
}: {
  item: ControlItem;
  large?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-40',
        large ? 'size-12' : 'size-10 sm:size-11 lg:size-12',
        item.active
          ? item.danger || item.recording
            ? 'bg-[#FEE2E2] text-[#DC2626]'
            : 'bg-[#E8F1FF] text-[#016BE6]'
          : 'bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]',
      )}
      aria-label={item.label}
      title={item.label}
    >
      <Icon
        className={cn(
          large ? 'size-5' : 'size-4 sm:size-[18px] lg:size-5',
          item.recording && 'fill-current',
        )}
        strokeWidth={2}
      />
    </button>
  );
}

export function ConferenceControlBar(props: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
      if (!reactionsRef.current?.contains(e.target as Node)) setReactionsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const primary: ControlItem[] = [
    {
      id: 'mute',
      label: props.muted ? 'Unmute' : 'Mute',
      icon: props.muted ? MicOff : Mic,
      active: props.muted,
      danger: props.muted,
      onClick: props.onToggleMute,
    },
    {
      id: 'camera',
      label: props.cameraOff ? 'Turn on camera' : 'Turn off camera',
      icon: props.cameraOff ? VideoOff : Video,
      active: props.cameraOff,
      danger: props.cameraOff,
      onClick: props.onToggleCamera,
    },
    {
      id: 'hand',
      label: 'Raise hand',
      icon: Hand,
      active: props.handRaised,
      onClick: props.onToggleHand,
    },
    {
      id: 'share',
      label: props.sharing
        ? 'Stop sharing'
        : props.shareDisabled
          ? (props.shareDisabledReason ?? 'Someone else is sharing')
          : 'Share screen',
      icon: MonitorUp,
      active: props.sharing,
      disabled: !props.sharing && props.shareDisabled,
      onClick: props.onToggleShare,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      active: props.chatOpen,
      onClick: props.onToggleChat,
    },
  ];

  const secondary: ControlItem[] = [
    {
      id: 'people',
      label: 'Participants',
      icon: Users,
      active: props.participantsOpen,
      onClick: props.onToggleParticipants,
    },
    {
      id: 'whiteboard',
      label: 'Whiteboard',
      icon: Pencil,
      active: props.whiteboardOpen,
      onClick: props.onToggleWhiteboard,
    },
  ];

  if (props.canRecord) {
    secondary.push({
      id: 'record',
      label: props.recording ? 'Stop recording' : 'Record',
      icon: Circle,
      active: props.recording,
      recording: props.recording,
      disabled: props.recordingBusy || !props.onToggleRecording,
      onClick: props.onToggleRecording,
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#E8ECF1] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:gap-2.5 sm:px-4 sm:py-3 lg:gap-3">
      {primary.map((item) => (
        <ControlIconButton key={item.id} item={item} />
      ))}

      <div className="relative" ref={reactionsRef}>
        <ControlIconButton
          item={{
            id: 'reactions',
            label: 'Reactions',
            icon: Smile,
            active: reactionsOpen,
            onClick: () => setReactionsOpen((v) => !v),
          }}
        />
        {reactionsOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#E8ECF1] bg-white p-2 shadow-lg">
            <p className="mb-1.5 px-1 text-center text-[10px] font-medium text-[#6F7B8C]">
              Send as {props.userName ?? 'You'}
            </p>
            <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  props.onSendReaction(emoji);
                  setReactionsOpen(false);
                }}
                className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-[#F8FAFC] lg:size-10"
              >
                {emoji}
              </button>
            ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Wide screens: show all controls in one horizontal row */}
      <div className="hidden items-center gap-2 lg:flex lg:gap-3">
        {secondary.map((item) => (
          <ControlIconButton key={item.id} item={item} large />
        ))}
      </div>

      {/* Leave — outline / reverse (X), End — solid red */}
      <button
        type="button"
        onClick={props.onLeave}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-[#DC2626] bg-white px-3 text-[11px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] sm:h-11 sm:px-3.5 sm:text-[12px] lg:h-12 lg:px-4"
        aria-label="Leave meeting"
        title="Leave meeting"
      >
        <X className="size-4 lg:size-5" strokeWidth={2.5} />
        Leave
      </button>

      {props.canEndMeeting ? (
        <button
          type="button"
          onClick={props.onEndCall}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#DC2626] px-3 text-[11px] font-semibold text-white hover:bg-[#B91C1C] sm:h-11 sm:px-3.5 sm:text-[12px] lg:h-12 lg:px-4"
          aria-label="End meeting for everyone"
          title="End meeting for everyone"
        >
          <PhoneOff className="size-4 lg:size-5" strokeWidth={2} />
          End
        </button>
      ) : null}

      {/* Narrow screens: overflow menu for secondary controls only */}
      <div className="relative lg:hidden" ref={moreRef}>
        <ControlIconButton
          item={{
            id: 'more',
            label: 'More controls',
            icon: MoreHorizontal,
            active: moreOpen,
            onClick: () => setMoreOpen((v) => !v),
          }}
        />
        {moreOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] right-0 z-50 min-w-[190px] overflow-hidden rounded-xl border border-[#E8ECF1] bg-white py-1 shadow-lg">
            {secondary.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC] disabled:opacity-40',
                    item.active && 'text-[#016BE6]',
                  )}
                >
                  <Icon className={cn('size-4', item.recording && 'fill-current text-[#DC2626]')} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
