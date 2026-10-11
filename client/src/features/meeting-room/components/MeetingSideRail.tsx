import { MessageSquare, Users } from 'lucide-react';
import { cn } from '../../../lib/cn';

type Props = {
  participantsOpen: boolean;
  chatOpen: boolean;
  participantCount: number;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
};

/**
 * Collapsed meeting side menu for logged-in users (mobile + desktop).
 * Expands into panels / sheets via parent.
 */
export function MeetingSideRail({
  participantsOpen,
  chatOpen,
  participantCount,
  onToggleParticipants,
  onToggleChat,
}: Props) {
  return (
    <div
      className="flex h-full w-11 shrink-0 flex-col items-center gap-1.5 rounded-xl border border-[#E8ECF1] bg-white py-2 shadow-sm sm:w-12 sm:gap-2 sm:py-3"
      role="navigation"
      aria-label="Meeting menu"
    >
      <button
        type="button"
        onClick={onToggleParticipants}
        className={cn(
          'relative inline-flex size-8 items-center justify-center rounded-xl transition-colors sm:size-9',
          participantsOpen
            ? 'bg-[#E5F1FF] text-[#016BE6]'
            : 'text-[#475569] hover:bg-[#F1F5F9]',
        )}
        aria-label="Participants"
        title="Participants"
        aria-pressed={participantsOpen}
      >
        <Users className="size-4" strokeWidth={2} />
        {participantCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#016BE6] px-1 text-[9px] font-bold text-white">
            {participantCount > 99 ? '99+' : participantCount}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onToggleChat}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-xl transition-colors sm:size-9',
          chatOpen ? 'bg-[#E5F1FF] text-[#016BE6]' : 'text-[#475569] hover:bg-[#F1F5F9]',
        )}
        aria-label="Chat"
        title="Chat"
        aria-pressed={chatOpen}
      >
        <MessageSquare className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
