import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';

const outlineBtn =
  'inline-flex h-11 w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[0.9375rem] font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BE6]';

function parseRoomId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const asUrl = trimmed.includes('://') ? new URL(trimmed) : null;
    if (asUrl) {
      const m = asUrl.pathname.match(/\/join\/([^/]+)/i);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  } catch {
    /* not a URL */
  }
  const pathMatch = trimmed.match(/\/join\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  return trimmed.replace(/^\/+/, '');
}

/** Replaces social OAuth on auth forms — join a meeting by room ID or invite link. */
export const JoinMeetingButton: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const goJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = parseRoomId(value);
    if (!roomId) {
      setError('Enter a meeting ID or invite link.');
      return;
    }
    setError('');
    navigate(`/join/${encodeURIComponent(roomId)}`);
  };

  return (
    <div className="flex shrink-0 flex-col">
      <div
        className="my-5 flex items-center gap-3 text-[0.8125rem] text-[#94A3B8] before:h-px before:flex-1 before:bg-[#E2E8F0] after:h-px after:flex-1 after:bg-[#E2E8F0]"
        role="separator"
      >
        <span>or</span>
      </div>

      {!open ? (
        <button type="button" className={outlineBtn} onClick={() => setOpen(true)}>
          <Video size={18} className="text-[#016BE6]" aria-hidden />
          Join Meeting
        </button>
      ) : (
        <form onSubmit={goJoin} className="flex flex-col gap-2">
          <label htmlFor="auth-join-room" className="sr-only">
            Meeting ID or invite link
          </label>
          <input
            id="auth-join-room"
            type="text"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            placeholder="Meeting ID or invite link"
            className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[0.9375rem] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/20"
          />
          {error ? (
            <p className="m-0 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError('');
              }}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[0.875rem] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#016BE6] text-[0.875rem] font-semibold text-white hover:bg-[#0059C4]"
            >
              <Video size={16} aria-hidden />
              Join
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
