import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '../../../services/messages/messages.service';
import { MessageBubble } from './MessageBubble';
import { cn } from '../../../lib/cn';

type Props = {
  messages: ChatMessage[];
  currentUserId?: string;
  peerIds: string[];
  workspaceId?: string | null;
  conversationId?: string | null;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onReply?: (m: ChatMessage) => void;
  onReact?: (m: ChatMessage, emoji: string) => void;
  onEdit?: (m: ChatMessage) => void;
  onDelete?: (m: ChatMessage) => void;
  onPin?: (m: ChatMessage) => void;
  className?: string;
};

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return 'Today';
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function scrollParentToBottom(
  el: HTMLDivElement | null,
  virtualizer: { scrollToIndex: (i: number, opts?: { align?: string }) => void; getTotalSize: () => number },
  lastIndex: number,
) {
  if (!el || lastIndex < 0) return;
  virtualizer.scrollToIndex(lastIndex, { align: 'end' });
  el.scrollTop = Math.max(0, virtualizer.getTotalSize() - el.clientHeight + 48);
  el.scrollTop = el.scrollHeight;
}

export function VirtualizedMessageList({
  messages,
  currentUserId,
  peerIds,
  workspaceId,
  conversationId,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  className,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const stickBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const prevConvRef = useRef<string | null | undefined>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  const rows = useMemo(() => {
    let lastDay = '';
    return messages.map((msg) => {
      const day = new Date(msg.createdAt).toDateString();
      const showBreak = day !== lastDay;
      lastDay = day;
      return { msg, dateLabel: showBreak ? dateLabel(msg.createdAt) : null };
    });
  }, [messages]);

  const replyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) {
      if (m.deletedAt) map.set(m.id, 'Deleted message');
      else if (m.text) map.set(m.id, m.text.slice(0, 120));
      else if (m.attachments[0]) map.set(m.id, m.attachments[0].name);
    }
    return map;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 16,
  });

  const jumpToLatest = useCallback(() => {
    const last = rows.length - 1;
    if (last < 0) return;
    stickBottomRef.current = true;
    const run = () => scrollParentToBottom(parentRef.current, virtualizer, last);
    run();
    requestAnimationFrame(run);
    window.setTimeout(run, 40);
    window.setTimeout(run, 120);
    window.setTimeout(run, 280);
  }, [rows.length, virtualizer]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickBottomRef.current = dist < 120;
    if (el.scrollTop < 80 && hasMore && !loadingOlder) onLoadOlder?.();
  }, [hasMore, loadingOlder, onLoadOlder]);

  // Always land on the latest message when opening / switching conversations
  useLayoutEffect(() => {
    if (!conversationId) return;
    const switched = prevConvRef.current !== conversationId;
    if (switched) {
      prevConvRef.current = conversationId;
      prevLenRef.current = 0;
      lastMsgIdRef.current = null;
      stickBottomRef.current = true;
    }
    if (rows.length === 0) return;
    const lastId = messages[messages.length - 1]?.id ?? null;
    const loadedFresh = switched || prevLenRef.current === 0 || lastMsgIdRef.current !== lastId;
    if (switched || loadedFresh) {
      jumpToLatest();
    }
    prevLenRef.current = messages.length;
    lastMsgIdRef.current = lastId;
  }, [conversationId, messages, rows.length, jumpToLatest]);

  // Keep pinned to bottom while new messages arrive (if user hasn't scrolled up)
  useEffect(() => {
    if (!stickBottomRef.current) return;
    if (rows.length === 0) return;
    jumpToLatest();
  }, [messages[messages.length - 1]?.id, jumpToLatest, rows.length]);

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={cn(
        'scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3',
        className,
      )}
    >
      {loadingOlder ? (
        <p className="mb-2 text-center text-[11px] text-[#94A3B8]">Loading earlier messages…</p>
      ) : null}
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]!;
          const mine = row.msg.senderId === currentUserId;
          return (
            <div
              key={row.msg.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${item.start}px)`,
              }}
              className="pb-3"
            >
              {row.dateLabel ? (
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">
                    {row.dateLabel}
                  </span>
                </div>
              ) : null}
              <MessageBubble
                message={row.msg}
                mine={mine}
                peerIds={peerIds}
                workspaceId={workspaceId}
                replyPreview={
                  row.msg.replyToId ? replyMap.get(row.msg.replyToId) ?? 'Message' : null
                }
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
              />
            </div>
          );
        })}
      </div>
      {messages.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#8A94A6]">No messages yet. Say hello!</p>
      ) : null}
    </div>
  );
}
