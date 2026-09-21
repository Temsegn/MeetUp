import { useEffect, useRef, useState, FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { useChat } from '../../collaboration/hooks/useChat';

type Props = {
  roomId: string;
  peerId: string;
  userId: string;
  userName: string;
  chatDisabled?: boolean;
  onClose: () => void;
  /** When set, messages are sent via this callback instead of local chat (e.g. remote control). */
  onSendOverride?: (text: string) => void;
  /** Banner when chatting as another participant. */
  actingAsName?: string | null;
};

export function MeetingChatPanel({
  roomId,
  peerId,
  userId,
  userName,
  chatDisabled = false,
  onClose,
  onSendOverride,
  actingAsName,
}: Props) {
  const { messages, sendMessage } = useChat(roomId, peerId, { userId, userName });
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (chatDisabled) return;
    const text = draft.trim();
    if (!text) return;
    if (onSendOverride) onSendOverride(text);
    else sendMessage(text);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white" data-meeting-chat>
      <div className="flex items-center justify-between border-b border-[#F1F4F8] px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Meeting chat</h3>
          {actingAsName ? (
            <p className="truncate text-[10px] font-medium text-[#016BE6]">
              Sending as {actingAsName}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#64748B] hover:bg-[#F8FAFC]" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="text-[12px] text-[#8A94A6]">No messages yet. Say hello to the room.</p>
        ) : (
          messages.map((msg) => {
            const mine =
              Boolean(userId && String(msg.senderId) === String(userId)) ||
              Boolean(userName && msg.senderName === userName && msg.id.startsWith('local-'));
            return (
              <div key={msg.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  data-meeting-chat-message
                  data-chat-mine={mine ? '1' : '0'}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] ${
                    mine ? 'rounded-br-md bg-[#E8F1FF] text-[#151D2B]' : 'rounded-bl-md bg-[#F1F5F9] text-[#151D2B]'
                  }`}
                >
                  <p className="mb-0.5 text-[10px] font-semibold text-[#016BE6]">
                    {mine ? 'You' : msg.senderName}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      {chatDisabled ? (
        <p className="border-t border-[#F1F4F8] px-3 py-2 text-[11px] text-[#B45309]">Chat has been disabled by the host.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-[#F1F4F8] p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={actingAsName ? `Message as ${actingAsName}…` : 'Type a message…'}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#E1E7EE] bg-white px-3 py-2 text-[16px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6] sm:min-h-0 sm:text-[13px]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#016BE6] text-white hover:bg-[#0056EF] disabled:opacity-40 sm:size-9"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}
