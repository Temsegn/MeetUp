import { useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  Highlighter,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { cn } from '../../../lib/cn';
import { DEMO_AI_MEETING, type TranscriptLine } from '../data/ai-insights.data';

const CARD =
  'rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

type Props = {
  meeting?: typeof DEMO_AI_MEETING;
};

/** Transcript tab — Figma 138:9231, app-sized. */
export function TranscriptTabPanel({ meeting = DEMO_AI_MEETING }: Props) {
  const [query, setQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('All');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [activeId, setActiveId] = useState(
    () => meeting.transcript[meeting.transcript.length - 1]?.id ?? '',
  );
  const [playing, setPlaying] = useState(false);
  const [bookmarks, setBookmarks] = useState(meeting.bookmarks);

  const speakers = useMemo(
    () => ['All', ...new Set(meeting.transcript.map((t) => t.name))],
    [meeting.transcript],
  );

  const lines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meeting.transcript.filter((line) => {
      if (speakerFilter !== 'All' && line.name !== speakerFilter) return false;
      if (!q) return true;
      return (
        line.text.toLowerCase().includes(q) ||
        line.name.toLowerCase().includes(q)
      );
    });
  }, [meeting.transcript, query, speakerFilter]);

  const addBookmark = () => {
    const active = meeting.transcript.find((l) => l.id === activeId);
    if (!active) return;
    const text = active.text.slice(0, 42).trim() + (active.text.length > 42 ? '…' : '');
    setBookmarks((prev) => [
      ...prev,
      { id: `b-${Date.now()}`, time: active.time, text },
    ]);
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)]">
      <section className={cn(CARD, 'flex flex-col p-3.5 sm:p-4')}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1 sm:max-w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in transcript"
              className="h-9 w-full rounded-[14px] border border-[#E1E7EE] bg-white pr-3 pl-8 text-[12px] text-[#151D2B] outline-none placeholder:text-[#8A94A6] focus:border-[#016BE6]"
            />
          </div>
          <label className="relative inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3 text-[12px] font-medium text-[#151D2B]">
            <span className="sr-only">Speakers</span>
            <select
              value={speakerFilter}
              onChange={(e) => setSpeakerFilter(e.target.value)}
              className="appearance-none bg-transparent pr-5 text-[12px] font-medium outline-none"
            >
              {speakers.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'Speakers' : s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-[#6F7B8C]" />
          </label>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-[#151D2B]">Show timestamps</span>
            <button
              type="button"
              role="switch"
              aria-checked={showTimestamps}
              onClick={() => setShowTimestamps((v) => !v)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                showTimestamps ? 'bg-[#016BE6]' : 'bg-[#CBD5E1]',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-[20px] rounded-full bg-white transition-transform',
                  showTimestamps ? 'left-[22px]' : 'left-0.5',
                )}
              />
            </button>
          </div>
        </div>

        <ul className="mt-3.5 space-y-1">
          {lines.map((line) => (
            <TranscriptRow
              key={line.id}
              line={line}
              active={line.id === activeId}
              showTimestamp={showTimestamps}
              onSelect={() => setActiveId(line.id)}
            />
          ))}
          {lines.length === 0 ? (
            <li className="py-8 text-center text-[12px] text-[#8A94A6]">
              No transcript lines match your filters.
            </li>
          ) : null}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#F1F4F8] pt-3.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#016BE6] text-white hover:bg-[#0056EF]"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 fill-white" />}
          </button>
          <button
            type="button"
            className="text-[#6F7B8C] hover:text-[#151D2B]"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="size-4" />
          </button>
          <span className="text-[11px] font-semibold text-[#6F7B8C]">00:00</span>
          <div className="relative h-1.5 min-w-[120px] flex-1 rounded-full bg-[#EBF2FF]">
            <div className="absolute inset-y-0 left-0 w-[12%] rounded-full bg-[#016BE6]" />
            <div className="absolute top-1/2 left-[12%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#016BE6]" />
          </div>
          <span className="text-[11px] font-semibold text-[#6F7B8C]">{meeting.duration}</span>
          <button type="button" className="text-[#6F7B8C] hover:text-[#151D2B]" aria-label="Loop">
            <Repeat className="size-4" />
          </button>
          <span className="text-[11px] font-semibold text-[#6F7B8C]">1x</span>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-3">
        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-[#016BE6]" />
            <h3 className="text-[13px] font-semibold text-[#151D2B]">Speakers</h3>
          </div>
          <ul className="space-y-3">
            {meeting.speakerShares.map((s) => (
              <li key={s.name} className="flex items-center gap-2.5">
                <UserAvatar
                  name={s.name}
                  avatarUrl={s.avatarUrl}
                  avatarColor={s.avatarColor}
                  size="sm"
                />
                <span className="w-[100px] shrink-0 truncate text-[12px] font-medium text-[#016BE6]">
                  {s.name}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EFF4F9]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.pct}%`, backgroundColor: s.barColor }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[11px] font-medium text-[#6F7B8C]">
                  {s.pct}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <div className="mb-3 flex items-center gap-2">
            <Highlighter className="size-4 text-[#016BE6]" />
            <h3 className="text-[13px] font-semibold text-[#151D2B]">Highlights</h3>
          </div>
          <ul className="space-y-2.5">
            {meeting.transcriptHighlights.map((h) => (
              <li key={h.id} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#016BE6]" />
                <span className="shrink-0 rounded-md bg-[#EAF0FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D44B9]">
                  {h.time}
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-[#334155]">
                  {h.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bookmark className="size-4 text-[#016BE6]" />
              <h3 className="text-[13px] font-semibold text-[#151D2B]">Bookmarks</h3>
            </div>
            <button
              type="button"
              onClick={addBookmark}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#016BE6] hover:underline"
            >
              <Plus className="size-3.5" />
              Add Bookmark
            </button>
          </div>
          <ul className="space-y-2.5">
            {bookmarks.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <Bookmark className="size-3.5 shrink-0 fill-[#016BE6] text-[#016BE6]" />
                <span className="shrink-0 rounded-md bg-[#EAF0FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D44B9]">
                  {b.time}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#334155]">{b.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3.5 py-3 text-[12px] text-[#1E40AF]">
          Tip: Use ↑ / ↓ to navigate between highlights.
        </div>
      </div>
    </div>
  );
}

function TranscriptRow({
  line,
  active,
  showTimestamp,
  onSelect,
}: {
  line: TranscriptLine;
  active: boolean;
  showTimestamp: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full gap-2.5 rounded-[14px] p-2.5 text-left transition-colors',
          active ? 'bg-[rgba(234,240,254,0.7)]' : 'hover:bg-[#F8FAFC]',
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar
            name={line.name}
            avatarUrl={line.avatarUrl}
            avatarColor={line.avatarColor}
            size="md"
          />
          {line.online ? (
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#00B393]" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-[#016BE6]">{line.name}</span>
            {line.role ? (
              <span className="rounded-md bg-[#EAF0FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D44B9]">
                {line.role}
              </span>
            ) : null}
            {showTimestamp ? (
              <span className="text-[11px] text-[#8A94A6]">{line.time}</span>
            ) : null}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[#475569]">{line.text}</p>
        </div>
      </button>
    </li>
  );
}
