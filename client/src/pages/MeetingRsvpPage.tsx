import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, HelpCircle, Loader2, X } from 'lucide-react';
import { API_URL } from '../lib/apiUrl';
import { cn } from '../lib/cn';
import type { RsvpResponse } from '../services/meetings/meetings.service';

type RsvpData = {
  email: string;
  meeting: {
    title: string;
    hostName: string;
    scheduledAt: string | null;
    duration: number | null;
    timezone: string | null;
    status: string;
    roomId: string;
  };
  response: RsvpResponse | null;
  respondedAt: string | null;
};

const OPTIONS: Array<{
  value: RsvpResponse;
  label: string;
  icon: typeof Check;
  active: string;
}> = [
  { value: 'accepted', label: 'Yes', icon: Check, active: 'border-[#16A34A] bg-[#F0FDF4] text-[#15803D]' },
  { value: 'tentative', label: 'Maybe', icon: HelpCircle, active: 'border-[#64748B] bg-[#F8FAFC] text-[#334155]' },
  { value: 'declined', label: 'No', icon: X, active: 'border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C]' },
];

const CONFIRMED: Record<RsvpResponse, string> = {
  accepted: "You're going. The host can see your answer.",
  tentative: "You said maybe. The host can see your answer.",
  declined: "You declined. The host can see your answer.",
};

function isResponse(v: string | null): v is RsvpResponse {
  return v === 'accepted' || v === 'tentative' || v === 'declined';
}

function formatWhen(iso: string | null, duration: number | null, tz: string | null): string {
  if (!iso) return 'Starts when the host opens it';
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  let text: string;
  try {
    text = start.toLocaleString(undefined, { ...opts, timeZone: tz || undefined, timeZoneName: 'short' });
  } catch {
    text = start.toLocaleString(undefined, opts);
  }
  return duration ? `${text} · ${duration} min` : text;
}

/**
 * Public page behind the Yes / Maybe / No links in invitation emails.
 * The answer is only saved on click — email security scanners open links
 * automatically, so a plain GET must never record a response.
 */
export function MeetingRsvpPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const suggested = params.get('r');
  const [data, setData] = useState<RsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<RsvpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const endpoint = `${API_URL}/meetings/rsvp/${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint, { credentials: 'omit' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'This invitation link is not valid.');
        if (!cancelled) setData(body as RsvpData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load invitation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const answer = async (response: RsvpResponse) => {
    setSaving(response);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save your answer.');
      setData(body as RsvpData);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answer.');
    } finally {
      setSaving(null);
    }
  };

  const cancelled = data?.meeting.status === 'cancelled';
  const ended = data?.meeting.status === 'ended';
  const current = data?.response ?? null;
  const highlight = current ?? (isResponse(suggested) ? suggested : null);

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[#016BE6]">
          <CalendarCheck className="size-5" />
          <span className="text-[13px] font-semibold">Samtal meeting invitation</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-[13px] text-[#64748B]">
            <Loader2 className="size-4 animate-spin" /> Loading invitation…
          </div>
        ) : !data ? (
          <p role="alert" className="rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[13px] text-[#B91C1C]">
            {error ?? 'This invitation link is not valid.'}
          </p>
        ) : (
          <>
            <h1 className="text-[19px] font-bold leading-snug text-[#151D2B]">{data.meeting.title}</h1>
            <p className="mt-1 text-[13px] text-[#64748B]">Hosted by {data.meeting.hostName}</p>
            <p className="mt-0.5 text-[13px] text-[#334155]">
              {formatWhen(data.meeting.scheduledAt, data.meeting.duration, data.meeting.timezone)}
            </p>
            <p className="mt-3 text-[12px] text-[#8A94A6]">
              Answering for <span className="font-semibold text-[#475569]">{data.email}</span>
            </p>

            {cancelled ? (
              <p className="mt-5 rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[13px] text-[#B91C1C]">
                This meeting was cancelled.
              </p>
            ) : (
              <>
                <p className="mt-5 text-[14px] font-semibold text-[#151D2B]">
                  {current && !justSaved
                    ? 'Your answer — change it any time:'
                    : isResponse(suggested) && !current
                      ? 'Confirm your answer:'
                      : 'Will you attend?'}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Your answer">
                  {OPTIONS.map(({ value, label, icon: Icon, active }) => {
                    const on = highlight === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={saving !== null}
                        aria-pressed={current === value}
                        onClick={() => void answer(value)}
                        className={cn(
                          'flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 text-[13px] font-semibold transition disabled:opacity-60',
                          on ? active : 'border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
                          on && !current && 'ring-2 ring-offset-1 ring-[#016BE6]/30',
                        )}
                      >
                        {saving === value ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
                {current && justSaved ? (
                  <p role="status" className="mt-3 text-[13px] text-[#15803D]">
                    {CONFIRMED[current]}
                  </p>
                ) : null}
              </>
            )}

            {error ? (
              <p role="alert" className="mt-3 text-[12px] text-[#DC2626]">
                {error}
              </p>
            ) : null}

            {!cancelled && !ended ? (
              <Link
                to={`/join/${encodeURIComponent(data.meeting.roomId)}?email=${encodeURIComponent(data.email)}`}
                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0159C7]"
              >
                Open meeting
              </Link>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
