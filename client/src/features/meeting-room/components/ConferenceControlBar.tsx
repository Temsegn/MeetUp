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

function LabeledControl({ item }: { item: ControlItem }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled}
      className="flex w-10 shrink-0 flex-col items-center gap-0.5 py-0.5 disabled:opacity-40 sm:w-12 lg:w-14 xl:w-16"
      aria-label={item.label}
      title={item.label}
    >
      <span
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-full transition-colors sm:size-10 lg:size-11',
          item.active
            ? item.danger || item.recording
              ? 'bg-[#FEE2E2] text-[#DC2626]'
              : 'bg-[#E5F1FF] text-[#076BEE]'
            : 'bg-[#F0F5FA] text-[#334155] hover:bg-[#E8EEF5]',
        )}
      >
        <Icon
          className={cn('size-4 sm:size-[18px] lg:size-5', item.recording && 'fill-current')}
          strokeWidth={2}
        />
      </span>
      <span className="hidden max-w-full truncate text-[10px] tracking-[0.02em] text-[#667383] lg:block lg:text-[11px]">
        {item.label}
      </span>
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

  const primaryMobile: ControlItem[] = [
    {
      id: 'mute',
      label: 'Mic',
      icon: props.muted ? MicOff : Mic,
      active: props.muted,
      danger: props.muted,
      onClick: props.onToggleMute,
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: props.cameraOff ? VideoOff : Video,
      active: props.cameraOff,
      danger: props.cameraOff,
      onClick: props.onToggleCamera,
    },
    {
      id: 'share',
      label: 'Screen',
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

  const moreItems: ControlItem[] = [
    {
      id: 'people',
      label: 'Participants',
      icon: Users,
      active: props.participantsOpen,
      onClick: props.onToggleParticipants,
    },
    {
      id: 'hand',
      label: 'Raise Hand',
      icon: Hand,
      active: props.handRaised,
      onClick: props.onToggleHand,
    },
    {
      id: 'whiteboard',
      label: 'Whiteboard',
      icon: Pencil,
      active: props.whiteboardOpen,
      onClick: props.onToggleWhiteboard,
    },
    {
      id: 'reactions',
      label: 'Reactions',
      icon: Smile,
      active: reactionsOpen,
      onClick: () => setReactionsOpen((v) => !v),
    },
  ];

  if (props.canRecord) {
    moreItems.unshift({
      id: 'record',
      label: props.recording ? 'Stop Rec' : 'Record',
      icon: Circle,
      active: props.recording,
      recording: props.recording,
      disabled: props.recordingBusy || !props.onToggleRecording,
      onClick: props.onToggleRecording,
    });
  }

  // Desktop (lg+): every control visible; mobile keeps compact primary + More.
  const desktopPrimary: ControlItem[] = [
    ...primaryMobile,
    {
      id: 'people',
      label: 'People',
      icon: Users,
      active: props.participantsOpen,
      onClick: props.onToggleParticipants,
    },
    {
      id: 'hand',
      label: 'Hand',
      icon: Hand,
      active: props.handRaised,
      onClick: props.onToggleHand,
    },
    {
      id: 'whiteboard',
      label: 'Board',
      icon: Pencil,
      active: props.whiteboardOpen,
      onClick: props.onToggleWhiteboard,
    },
  ];

  if (props.canRecord) {
    desktopPrimary.push({
      id: 'record',
      label: props.recording ? 'Stop' : 'Record',
      icon: Circle,
      active: props.recording,
      recording: props.recording,
      disabled: props.recordingBusy || !props.onToggleRecording,
      onClick: props.onToggleRecording,
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-full min-w-0 items-center justify-between gap-1 rounded-2xl border border-[#E8ECF1] bg-white/95 px-1.5 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:gap-2 sm:rounded-[22px] sm:px-3 sm:py-2 lg:max-w-5xl">
      {/* Mobile / tablet compact bar */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0 overflow-hidden lg:hidden">
        {primaryMobile.map((item) => (
          <LabeledControl key={item.id} item={item} />
        ))}

        <div className="relative shrink-0" ref={moreRef}>
          <LabeledControl
            item={{
              id: 'more',
              label: 'More',
              icon: MoreHorizontal,
              active: moreOpen,
              onClick: () => setMoreOpen((v) => !v),
            }}
          />
          {moreOpen ? (
            <div className="absolute bottom-[calc(100%+10px)] right-0 z-50 max-h-[60vh] w-[min(220px,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-2xl border border-[#E8ECF1] bg-white py-1 shadow-xl">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      item.onClick?.();
                      if (item.id !== 'reactions') setMoreOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC] disabled:opacity-40',
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

      {/* Desktop — all controls visible */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto scrollbar-none lg:flex">
        {desktopPrimary.map((item) => (
          <LabeledControl key={item.id} item={item} />
        ))}
        <LabeledControl
          item={{
            id: 'reactions',
            label: 'React',
            icon: Smile,
            active: reactionsOpen,
            onClick: () => setReactionsOpen((v) => !v),
          }}
        />
      </div>

      {reactionsOpen ? (
        <div
          ref={reactionsRef}
          className="absolute bottom-[calc(100%+10px)] left-1/2 z-50 w-[min(280px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-[#E8ECF1] bg-white p-2.5 shadow-xl"
        >
          <p className="mb-1.5 px-1 text-center text-[10px] font-medium text-[#6F7B8C]">
            Send as {props.userName ?? 'You'}
          </p>
          <div className="flex flex-wrap justify-center gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  props.onSendReaction(emoji);
                  setReactionsOpen(false);
                  setMoreOpen(false);
                }}
                className="flex size-9 items-center justify-center rounded-xl text-lg hover:bg-[#F8FAFC] sm:size-10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={props.onLeave}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#E8ECF1] bg-white px-2 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:h-10 sm:gap-1.5 sm:rounded-2xl sm:px-3 lg:h-11 lg:px-4 lg:text-[13px]"
          aria-label="Leave meeting"
          title="Leave meeting"
        >
          <PhoneOff className="size-4 sm:size-[18px]" strokeWidth={2} />
          <span className="hidden sm:inline">Leave</span>
        </button>

        {props.canEndMeeting ? (
          <button
            type="button"
            onClick={props.onEndCall}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-[#DF1E39] px-2 text-[12px] font-semibold text-white hover:bg-[#C91830] sm:h-10 sm:gap-1.5 sm:rounded-2xl sm:px-3 lg:h-11 lg:px-4 lg:text-[13px]"
            aria-label="End meeting for everyone"
            title="End meeting for everyone"
          >
            <PhoneOff className="size-4 sm:size-[18px]" strokeWidth={2} />
            <span className="hidden sm:inline">End</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
