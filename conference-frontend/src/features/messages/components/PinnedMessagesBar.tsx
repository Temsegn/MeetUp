import { Pin, X } from 'lucide-react';
import type { ChatMessage } from '../../../services/messages/messages.service';
import { cn } from '../../../lib/cn';

type Props = {
  messages: ChatMessage[];
  onUnpin?: (m: ChatMessage) => void;
  className?: string;
};

export function PinnedMessagesBar({ messages, onUnpin, className }: Props) {
  const pinned = messages
    .filter((m) => m.pinnedAt && !m.deletedAt)
    .sort((a, b) => new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime())
    .slice(0, 3);

  if (!pinned.length) return null;

  return (
    <div
      className={cn(
        'shrink-0 border-b border-[#E8F1FF] bg-gradient-to-r from-[#F5F9FF] to-white px-3 py-2',
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#016BE6]">
        <Pin className="size-3" />
        Pinned
      </div>
      <ul className="space-y-1">
        {pinned.map((m) => (
          <li
            key={m.id}
            className="flex items-start gap-2 rounded-lg border border-[#E8F1FF] bg-white/90 px-2.5 py-1.5 shadow-[0_1px_2px_rgba(1,107,230,0.06)]"
          >
            <p className="min-w-0 flex-1 truncate text-[12px] text-[#151D2B]">
              {m.text?.trim() ||
                (m.attachments[0]?.name ? `📎 ${m.attachments[0].name}` : 'Pinned message')}
            </p>
            {onUnpin ? (
              <button
                type="button"
                onClick={() => onUnpin(m)}
                className="shrink-0 rounded p-0.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B]"
                aria-label="Unpin"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
