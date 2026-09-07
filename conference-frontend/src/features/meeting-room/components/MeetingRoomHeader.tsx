import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

type Props = {
  title: string;
  roomId: string;
  participantCount: number;
  isHost?: boolean;
  onLeave: () => void;
};

export function MeetingRoomHeader({
  title,
  roomId,
  participantCount,
  isHost,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative flex items-center justify-between gap-2 rounded-lg border border-[#E8ECF1] bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[13px] font-semibold text-[#151D2B]">{title}</h1>
          {isHost ? (
            <span className="shrink-0 rounded bg-[#E8F1FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#016BE6]">
              Host
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-[#8A94A6]">
          <button
            type="button"
            onClick={() => void copyId()}
            className="inline-flex max-w-[55%] items-center gap-1 truncate font-mono hover:text-[#016BE6]"
            title="Click to copy meeting id"
          >
            <span className="truncate">{roomId}</span>
            {copied ? <Check className="size-3 text-[#059669]" /> : <Copy className="size-3" />}
          </button>
          <span>·</span>
          <span>{participantCount} in call</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#DC2626] bg-white text-[#DC2626] hover:bg-[#FEF2F2]"
        aria-label="Leave meeting"
        title="Leave"
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
