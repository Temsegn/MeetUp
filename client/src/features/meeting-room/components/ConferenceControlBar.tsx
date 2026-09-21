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
      className="flex w-11 shrink-0 flex-col items-center gap-1 py-1 disabled:opacity-40 sm:w-[72px] sm:gap-1.5 md:w-[84px]"
      aria-label={item.label}
      title={item.label}
    >
      <span
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-full transition-colors sm:size-11 md:size-[49px]',
          item.active
            ? item.danger || item.recording
              ? 'bg-[#FEE2E2] text-[#DC2626]'
              : 'bg-[#E5F1FF] text-[#076BEE]'
            : 'bg-[#F0F5FA] text-[#334155] hover:bg-[#E8EEF5]',
        )}
      >
        <Icon
          className={cn('size-5 sm:size-[22px]', item.recording && 'fill-current')}
          strokeWidth={2}
        />
      </span>
      <span className="hidden max-w-full truncate text-[11px] tracking-[0.02em] text-[#667383] sm:block sm:text-[12px]">
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

  const primary: ControlItem[] = [
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
      id: 'hand',
      label: 'Raise Hand',
      icon: Hand,
      active: props.handRaised,
      onClick: props.onToggleHand,
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
      id: 'people',
      label: 'Participants',
      icon: Users,
      active: props.participantsOpen,
      onClick: props.onToggleParticipants,
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

  const endLabel = props.canEndMeeting ? 'End Call' : 'Leave';
  const endAction = props.canEndMeeting ? props.onEndCall : props.onLeave;

  return (
    <div className="mx-auto flex w-full max-w-[830px] items-center justify-between gap-1 overflow-x-auto scrollbar-none rounded-[18px] border border-[#E0E7EE] bg-white p-2 shadow-[0_1px_2px_rgba(55,72,99,0.04)] sm:gap-3 sm:overflow-visible sm:rounded-[22px] sm:p-3.5">
      <div className="flex min-w-0 flex-1 items-center justify-start gap-0.5 sm:flex-wrap sm:justify-center md:justify-start">
        {primary.map((item) => (
          <LabeledControl key={item.id} item={item} />
        ))}

        <div className="relative" ref={moreRef}>
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
            <div className="absolute bottom-[calc(100%+8px)] right-0 z-50 min-w-[190px] overflow-hidden rounded-xl border border-[#E8ECF1] bg-white py-1 shadow-lg">
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
          {reactionsOpen ? (
            <div
              ref={reactionsRef}
              className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#E8ECF1] bg-white p-2 shadow-lg"
            >
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
                      setMoreOpen(false);
                    }}
                    className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-[#F8FAFC]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={endAction}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[16px] bg-[#DF1E39] px-3 text-[13px] font-semibold text-white hover:bg-[#C91830] sm:h-12 sm:rounded-[18px] sm:px-6 sm:text-[14px] md:h-[52px] md:px-7"
        aria-label={endLabel}
        title={props.canEndMeeting ? 'End meeting for everyone' : 'Leave meeting'}
      >
        <PhoneOff className="size-[18px]" strokeWidth={2} />
        <span className="hidden sm:inline">{endLabel}</span>
      </button>
    </div>
  );
}
