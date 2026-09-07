import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Paperclip, Send, Smile, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { ChatMessage } from '../../../services/messages/messages.service';
import { connectDmSocket, DM_EVENTS } from '../../../services/messages/dm-socket';

const EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🙏', '🔥', '💯', '😎', '🤝'];

type Props = {
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  onClearReply?: () => void;
  /** When set, composer edits this message instead of sending a new one. */
  editing?: ChatMessage | null;
  onClearEdit?: () => void;
  onSaveEdit?: (messageId: string, text: string) => void;
  uploadProgress?: number | null;
  onSend: (payload: {
    text: string;
    files: File[];
    voice?: { blob: Blob; durationMs: number };
  }) => void;
  onTyping?: (typing: boolean) => void;
  conversationId?: string | null;
};

export function ChatComposer({
  disabled,
  replyTo,
  onClearReply,
  editing,
  onClearEdit,
  onSaveEdit,
  uploadProgress,
  onSend,
  onTyping,
  conversationId,
}: Props) {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const typingOnRef = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(editing.text ?? '');
      setFiles([]);
      onClearReply?.();
    }
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId) return;
      const socket = connectDmSocket();
      socket?.emit(DM_EVENTS.TYPING, { conversationId, typing });
      onTyping?.(typing);
      typingOnRef.current = typing;
    },
    [conversationId, onTyping],
  );

  const onChangeDraft = (value: string) => {
    setDraft(value);
    if (!typingOnRef.current) emitTyping(true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => emitTyping(false), 1200);
  };

  useEffect(
    () => () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typingOnRef.current) emitTyping(false);
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stop();
    },
    [emitTyping],
  );

  const addFiles = (list: FileList | File[]) => {
    const next = [...files, ...Array.from(list)].slice(0, 5);
    setFiles(next);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const durationMs = recordMs;
        setRecording(false);
        setRecordMs(0);
        if (blob.size > 0 && durationMs > 400) {
          onSend({ text: '', files: [], voice: { blob, durationMs } });
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordMs(0);
      recordTimerRef.current = window.setInterval(() => setRecordMs((v) => v + 200), 200);
    } catch {
      /* mic denied */
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const submit = () => {
    const text = draft.trim();
    if (editing) {
      if (!text || !onSaveEdit) return;
      onSaveEdit(editing.id, text);
      setDraft('');
      setEmojiOpen(false);
      onClearEdit?.();
      emitTyping(false);
      return;
    }
    if (!text && files.length === 0) return;
    onSend({ text, files });
    setDraft('');
    setFiles([]);
    setEmojiOpen(false);
    emitTyping(false);
  };

  return (
    <footer
      className={cn(
        'shrink-0 border-t border-[#F1F4F8] p-2.5',
        dragOver && !editing && 'bg-[#E8F1FF]/40',
        editing && 'bg-[#F5F9FF]',
      )}
      onDragOver={(e) => {
        if (editing) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (editing) return;
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
      }}
    >
      {editing ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#016BE6]/25 bg-white px-2.5 py-1.5 text-[11px] text-[#016BE6]">
          <span className="min-w-0 flex-1 font-semibold">Editing message</span>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onClearEdit?.();
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {!editing && replyTo ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] text-[#64748B]">
          <span className="min-w-0 flex-1 truncate">
            Replying to: {replyTo.text || replyTo.attachments[0]?.name || 'message'}
          </span>
          <button type="button" onClick={onClearReply} aria-label="Cancel reply">
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {!editing && files.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[10px] text-[#016BE6]"
            >
              {f.name}
              <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {uploadProgress != null ? (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#E8ECF1]">
          <div className="h-full bg-[#016BE6] transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      ) : null}

      {recording ? (
        <div className="mb-2 flex items-center gap-2 text-[12px] text-red-500">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          Recording… {(recordMs / 1000).toFixed(1)}s
          <button
            type="button"
            onClick={stopRecording}
            className="ml-auto rounded-full bg-red-500 px-3 py-1 text-[11px] font-semibold text-white"
          >
            Send voice
          </button>
        </div>
      ) : null}

      <div className="relative flex items-center gap-2">
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
            editing ? 'border-[#016BE6]' : 'border-[#E8ECF1]',
          )}
        >
          {!editing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="shrink-0 text-[#94A3B8] hover:text-[#475569]"
              aria-label="Attach file"
            >
              <Paperclip className="size-3.5" />
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            type="text"
            value={draft}
            disabled={disabled || recording}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape' && editing) {
                setDraft('');
                onClearEdit?.();
              }
            }}
            placeholder={editing ? 'Edit your message…' : dragOver ? 'Drop files to attach…' : 'Type a message…'}
            className="min-w-0 flex-1 bg-transparent py-0.5 text-[12px] text-[#151D2B] outline-none placeholder:text-[#94A3B8]"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEmojiOpen((v) => !v)}
            className="shrink-0 text-[#94A3B8] hover:text-[#475569]"
            aria-label="Emoji"
          >
            <Smile className="size-3.5" />
          </button>
          {!editing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => (recording ? stopRecording() : void startRecording())}
              className={cn(
                'shrink-0',
                recording ? 'text-red-500' : 'text-[#94A3B8] hover:text-[#475569]',
              )}
              aria-label="Voice message"
            >
              <Mic className="size-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled || recording}
          onClick={submit}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#016BE6] text-white hover:bg-[#0056EF] disabled:opacity-50"
          aria-label={editing ? 'Save edit' : 'Send'}
        >
          <Send className="size-3.5" />
        </button>

        {emojiOpen ? (
          <div className="absolute bottom-11 right-12 z-10 grid grid-cols-5 gap-1 rounded-xl border border-[#E8ECF1] bg-white p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="rounded p-1 text-[16px] hover:bg-[#F1F5F9]"
                onClick={() => {
                  setDraft((d) => d + e);
                  setEmojiOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
