import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Accepts a bare meeting ID or any Samtal meeting link
 * (…/join/<id>, …/app/meeting/<id>) and returns the room ID.
 */
function parseMeetingId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromPath = raw.match(/\/(?:join|meeting)\/([^/?#\s]+)/i);
  let candidate = fromPath ? fromPath[1] : raw;
  try {
    candidate = decodeURIComponent(candidate).trim();
  } catch {
    return null; // malformed %-escape
  }
  return /^[A-Za-z0-9_-]{3,128}$/.test(candidate) ? candidate : null;
}

export function JoinMeetingDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setError(null);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = parseMeetingId(value);
    if (!roomId) {
      setError('Enter a meeting ID or paste a meeting link.');
      return;
    }
    onClose();
    navigate(`/app/meeting/${encodeURIComponent(roomId)}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-meeting-title"
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id="join-meeting-title" className="text-[15px] font-bold text-[#151D2B]">
              Join with ID
            </h2>
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
              Enter the meeting ID or paste the invitation link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#334155]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <label className="block text-[11px] font-semibold text-[#475569]" htmlFor="join-meeting-id">
          Meeting ID or link
        </label>
        <input
          id="join-meeting-id"
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. abc-defg-hij"
          className="mt-1 h-10 w-full rounded-xl border border-[#E1E7EE] bg-white px-3 text-[16px] outline-none focus:border-[#016BE6] sm:text-[13px]"
        />
        {error ? (
          <p role="alert" className="mt-1.5 text-[11px] text-[#DC2626]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0159C7]"
        >
          <LogIn className="size-4" />
          Join meeting
        </button>
      </form>
    </div>
  );
}
