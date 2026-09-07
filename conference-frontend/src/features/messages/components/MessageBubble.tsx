import { memo, useEffect, useState } from 'react';
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Mic,
  Phone,
  PhoneMissed,
  Pin,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  resolveMediaUrl,
  type ChatMessage,
} from '../../../services/messages/messages.service';
import { isEmojiOnlyMessage } from '../utils/emoji';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type Props = {
  message: ChatMessage;
  mine: boolean;
  peerIds: string[];
  workspaceId?: string | null;
  replyPreview?: string | null;
  onReply?: (m: ChatMessage) => void;
  onReact?: (m: ChatMessage, emoji: string) => void;
  onEdit?: (m: ChatMessage) => void;
  onDelete?: (m: ChatMessage) => void;
  onPin?: (m: ChatMessage) => void;
};

function ReadReceipt({
  message,
  peerIds,
}: {
  message: ChatMessage;
  peerIds: string[];
}) {
  if (message.pending) return <Check className="size-3.5 text-[#94A3B8]" />;
  if (message.failed) return <span className="text-[10px] text-red-500">!</span>;
  const read = peerIds.some((id) => message.readBy.includes(id));
  const delivered = peerIds.some((id) => message.deliveredTo.includes(id));
  if (read) return <CheckCheck className="size-3.5 text-[#016BE6]" />;
  if (delivered) return <CheckCheck className="size-3.5 text-[#A8B0BC]" />;
  return <Check className="size-3.5 text-[#A8B0BC]" />;
}

function MediaBlock({
  message,
  workspaceId,
  bare = false,
}: {
  message: ChatMessage;
  workspaceId?: string | null;
  bare?: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const a of message.attachments) {
        const key = a.storageKey ?? a.url ?? a.name;
        const resolved = await resolveMediaUrl(a.url ?? a.thumbUrl, workspaceId);
        if (resolved && !cancelled) next[key] = resolved;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [message.attachments, workspaceId]);

  if (!message.attachments.length) return null;

  return (
    <div className="mb-1.5 space-y-1.5">
      {message.attachments.map((a) => {
        const key = a.storageKey ?? a.url ?? a.name;
        const src = urls[key];
        const mime = a.mimeType ?? '';
        if (mime.startsWith('image/') && src) {
          return (
            <a key={key} href={src} target="_blank" rel="noreferrer" className="block">
              <img
                src={src}
                alt={a.name}
                loading="lazy"
                className={cn(
                  'max-h-56 max-w-full object-cover',
                  bare ? 'rounded-2xl' : 'rounded-xl',
                )}
              />
            </a>
          );
        }
        if (mime.startsWith('video/') && src) {
          return (
            <video
              key={key}
              src={src}
              controls
              preload="metadata"
              className="max-h-56 max-w-full rounded-xl"
            />
          );
        }
        if ((mime.startsWith('audio/') || message.kind === 'voice') && src) {
          return (
            <div key={key} className="flex min-w-[200px] items-center gap-2">
              <Mic className="size-3.5 shrink-0 opacity-70" />
              <audio src={src} controls preload="metadata" className="h-8 w-full max-w-[220px]" />
            </div>
          );
        }
        return (
          <a
            key={key}
            href={src ?? '#'}
            download={a.name}
            className="flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-2 text-[11px]"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
            <Download className="size-3.5 shrink-0 opacity-60" />
          </a>
        );
      })}
    </div>
  );
}

function CallBubble({ message }: { message: ChatMessage }) {
  const call = message.call;
  if (!call) return null;
  const missed = call.status === 'missed' || call.status === 'rejected';
  const Icon = call.callType === 'video' ? Video : missed ? PhoneMissed : Phone;
  const label =
    call.status === 'missed'
      ? 'Missed call'
      : call.status === 'rejected'
        ? 'Declined call'
        : call.status === 'cancelled'
          ? 'Cancelled call'
          : call.callType === 'video'
            ? 'Video call'
            : 'Voice call';
  const dur =
    call.durationSec && call.status === 'completed'
      ? ` · ${Math.floor(call.durationSec / 60)}:${String(call.durationSec % 60).padStart(2, '0')}`
      : '';
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <Icon className={cn('size-3.5', missed ? 'text-red-500' : 'text-[#016BE6]')} />
      <span>
        {label}
        {dur}
      </span>
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  peerIds,
  workspaceId,
  replyPreview,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
}: Props) {
  const deleted = Boolean(message.deletedAt);
  if (deleted) return null;

  const emojiOnly =
    message.kind !== 'call' &&
    !message.attachments?.length &&
    isEmojiOnlyMessage(message.text ?? '');

  const imageOnly =
    message.kind !== 'call' &&
    !message.text?.trim() &&
    (message.attachments?.length ?? 0) > 0 &&
    message.attachments.every((a) => (a.mimeType ?? '').startsWith('image/'));

  return (
    <div className={cn('group flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] sm:max-w-[72%]', (emojiOnly || imageOnly) && 'max-w-[min(85%,320px)]')}>
        {emojiOnly ? (
          <div
            className={cn(
              'select-none px-1 py-0.5 text-center leading-none',
              message.pending && 'opacity-70',
            )}
          >
            <span
              className="inline-block origin-bottom animate-[msgEmojiPop_0.55s_cubic-bezier(0.22,1.4,0.36,1)_both] text-[2.75rem] sm:text-[3.25rem]"
              aria-label={message.text.trim()}
            >
              {message.text.trim()}
            </span>
          </div>
        ) : imageOnly ? (
          <div className={cn('overflow-hidden rounded-2xl', message.pending && 'opacity-70')}>
            <MediaBlock message={message} workspaceId={workspaceId} bare />
          </div>
        ) : (
        <div
          className={cn(
            'relative rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
            mine
              ? 'rounded-br-md bg-[#016BE6] text-white'
              : 'rounded-bl-md bg-[#EEF2F7] text-[#151D2B]',
            message.pending && 'opacity-70',
            message.failed && 'ring-1 ring-red-400',
          )}
        >
          {message.pinnedAt ? (
            <div
              className={cn(
                'mb-1 flex items-center gap-1 text-[10px]',
                mine ? 'text-white/80' : 'text-[#016BE6]',
              )}
            >
              <Pin className="size-3" /> Pinned
            </div>
          ) : null}
          {replyPreview ? (
            <div
              className={cn(
                'mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px]',
                mine ? 'border-white/50 bg-white/15 text-white/90' : 'border-[#016BE6] bg-white text-[#64748B]',
              )}
            >
              {replyPreview}
            </div>
          ) : null}
          {message.forwardedFromId ? (
            <p className={cn('mb-1 text-[10px]', mine ? 'text-white/70' : 'text-[#94A3B8]')}>
              Forwarded
            </p>
          ) : null}
          {message.kind === 'call' ? (
            <CallBubble message={message} />
          ) : (
            <>
              <MediaBlock message={message} workspaceId={workspaceId} />
              {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
            </>
          )}
          {message.reactions?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {message.reactions.map((r) =>
                r.userIds.length ? (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onReact?.(message, r.emoji)}
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[11px]',
                      mine ? 'bg-white/20' : 'bg-white',
                    )}
                  >
                    {r.emoji} {r.userIds.length}
                  </button>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
        )}

        <div
          className={cn(
            'mt-0.5 flex items-center gap-1 px-0.5',
            mine ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="text-[10px] text-[#94A3B8]">
            {new Date(message.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {message.editedAt ? ' · edited' : ''}
          </span>
          {mine ? <ReadReceipt message={message} peerIds={peerIds} /> : null}
        </div>

        {message.kind !== 'call' ? (
          <div
            className={cn(
              'mt-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
              mine ? 'justify-end' : 'justify-start',
            )}
          >
            {QUICK_REACTIONS.slice(0, 3).map((e) => (
              <button
                key={e}
                type="button"
                className="rounded px-1 text-[11px] hover:bg-[#F1F5F9]"
                onClick={() => onReact?.(message, e)}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              className="rounded px-1 text-[10px] text-[#64748B] hover:bg-[#F1F5F9]"
              onClick={() => onReply?.(message)}
            >
              Reply
            </button>
            {mine ? (
              <button
                type="button"
                className="rounded px-1 text-[10px] text-[#64748B] hover:bg-[#F1F5F9]"
                onClick={() => onEdit?.(message)}
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              className="rounded px-1 text-[10px] text-[#64748B] hover:bg-[#F1F5F9]"
              onClick={() => onPin?.(message)}
            >
              Pin
            </button>
            {mine ? (
              <button
                type="button"
                className="rounded px-1 text-[10px] text-red-500 hover:bg-red-50"
                onClick={() => onDelete?.(message)}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
