import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Copy,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { MESSAGES_BY_CONV, type ChatMessage, type Conversation } from '../data/messages.data';

type Props = {
  conversation: Conversation | null;
  showDetail: boolean;
  onToggleDetail: () => void;
  onBack?: () => void;
  className?: string;
};

export function ChatView({
  conversation,
  showDetail,
  onToggleDetail,
  onBack,
  className,
}: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages: ChatMessage[] = conversation
    ? (MESSAGES_BY_CONV[conversation.id] ?? [])
    : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation?.id, messages.length]);

  if (!conversation) {
    return (
      <section
        className={cn(
          'flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-[#E8ECF1] bg-white p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
          className,
        )}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#E8F1FF] text-[#016BE6]">
          <MessageSquare className="size-5" />
        </div>
        <h3 className="text-[14px] font-semibold text-[#151D2B]">Select a conversation</h3>
        <p className="mt-1 max-w-[240px] text-[12px] text-[#6F7B8C]">
          Choose a chat from the list to view messages and contact details.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F1F4F8] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-md p-1 text-[#6F7B8C] hover:bg-[#F1F5F9] lg:hidden"
              aria-label="Back to list"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <div className="relative shrink-0">
            <UserAvatar name={conversation.name} avatarUrl={conversation.avatar} size="md" />
            {conversation.online ? (
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-[#151D2B]">
              {conversation.name}
            </h3>
            <div className="flex items-center gap-1">
              {conversation.online ? (
                <>
                  <span className="size-1.5 rounded-full bg-[#22C55E]" />
                  <span className="text-[11px] text-[#6F7B8C]">Online</span>
                </>
              ) : (
                <span className="text-[11px] text-[#94A3B8]">Offline</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded-md p-1.5 text-[#6F7B8C] hover:bg-[#F1F5F9]"
            aria-label="Video call"
          >
            <Video className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-[#6F7B8C] hover:bg-[#F1F5F9]"
            aria-label="Audio call"
          >
            <Phone className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToggleDetail}
            className={cn(
              'rounded-md p-1.5 hover:bg-[#F1F5F9]',
              showDetail ? 'bg-[#E8F1FF] text-[#016BE6]' : 'text-[#6F7B8C]',
            )}
            aria-label={showDetail ? 'Hide contact details' : 'Show contact details'}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-[#8A94A6]">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.date ? (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">
                    {msg.date}
                  </span>
                </div>
              ) : null}

              <div className={cn('flex', msg.sender === 'me' ? 'justify-end' : 'justify-start')}>
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line',
                      msg.sender === 'me'
                        ? 'rounded-br-md bg-[#E8F1FF] text-[#151D2B]'
                        : 'rounded-bl-md bg-[#F1F5F9] text-[#151D2B]',
                    )}
                  >
                    {msg.text}
                    {msg.attachment ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#E8ECF1] bg-white p-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#EF4444]">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-[#151D2B]">
                            {msg.attachment.name}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">{msg.attachment.size}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 flex items-center gap-1',
                      msg.sender === 'me' ? 'justify-end' : '',
                    )}
                  >
                    <span className="text-[10px] text-[#94A3B8]">{msg.time}</span>
                    {msg.sender === 'me' ? (
                      <span className="text-[10px] text-[#016BE6]">✓✓</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {msg.dateBreakAfter ? (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">
                    {msg.dateBreakAfter}
                  </span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <footer className="shrink-0 border-t border-[#F1F4F8] p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[#E8ECF1] bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <button type="button" className="shrink-0 text-[#94A3B8] hover:text-[#475569]" aria-label="Attach">
              <Paperclip className="size-3.5" />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="min-w-0 flex-1 bg-transparent py-0.5 text-[12px] text-[#151D2B] outline-none placeholder:text-[#94A3B8]"
            />
            <button type="button" className="shrink-0 text-[#94A3B8] hover:text-[#475569]" aria-label="Emoji">
              <Smile className="size-3.5" />
            </button>
            <button type="button" className="shrink-0 text-[#94A3B8] hover:text-[#475569]" aria-label="Copy">
              <Copy className="size-3.5" />
            </button>
            <button type="button" className="shrink-0 text-[#94A3B8] hover:text-[#475569]" aria-label="File">
              <FileText className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#016BE6] text-white hover:bg-[#0056EF]"
            aria-label="Send"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </footer>
    </section>
  );
}
