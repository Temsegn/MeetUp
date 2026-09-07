import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Users,
  Video,
  Volume2,
} from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { cn } from '../../../lib/cn';
import {
  AI_INSIGHTS_TABS,
  DEMO_AI_MEETING,
  type AiInsightsTab,
} from '../data/ai-insights.data';
import { TranscriptTabPanel } from '../components/TranscriptTabPanel';
import { ActionItemsTabPanel } from '../components/ActionItemsTabPanel';

const CARD =
  'rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

/** AI Meeting Insights — Figma 138:8663 / 138:9231, sized to match Reports / app chrome. */
export function AiInsightsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AiInsightsTab>('AI Summary');
  const [query, setQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('All');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const meeting = DEMO_AI_MEETING;

  const speakers = useMemo(
    () => ['All', ...new Set(meeting.transcript.map((t) => t.name))],
    [meeting.transcript],
  );

  const transcript = useMemo(() => {
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

  const copySummary = async () => {
    const body = `${meeting.summary}\n\nKey Highlights:\n${meeting.highlights.map((h) => `• ${h}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-3 sm:gap-4">
      {/* Shared top chrome for AI Summary + Transcript (and all tabs) */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate('/app/reports');
          }}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[#6F7B8C] hover:text-[#151D2B]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back
        </button>

        <AppHeader
          title="AI Meeting Insights"
          subtitle="Track, analyze and gain insights from your meetings with the power of AI."
          primaryAction={
            <button
              type="button"
              className="inline-flex h-9 max-w-full items-center gap-2 rounded-[14px] border border-[#E1E7EE] bg-white px-3 text-[12px] font-medium text-[#151D2B] shadow-sm hover:bg-[#F8FAFC]"
              aria-label="Meeting date and time"
            >
              <CalendarDays className="size-4 shrink-0 text-[#1E293B]" strokeWidth={1.9} />
              <span className="truncate">{meeting.dateLabel}</span>
              <ChevronDown className="size-3.5 shrink-0 text-[#64748B]" />
            </button>
          }
        />
      </div>

      {/* Meeting summary strip — shared above all tabs */}
      <section className={cn(CARD, 'flex flex-wrap items-center gap-3.5 p-3.5 sm:p-4')}>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#EDECFF]">
          <Video className="size-5 text-[#7C3AED]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-[#151D2B] sm:text-[16px]">
            {meeting.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6F7B8C] sm:text-[12px]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              {meeting.dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 shrink-0" />
              {meeting.duration}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              {meeting.participants} Participants
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3.5 text-[12px] font-semibold text-[#151D2B] hover:bg-[#F8FAFC]"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3.5 text-[12px] font-semibold text-[#151D2B] hover:bg-[#F8FAFC]"
          >
            <Download className="size-3.5" />
            Download
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[14px] bg-[#016BE6] px-3.5 text-[12px] font-semibold text-white hover:bg-[#0056EF]"
          >
            <Video className="size-3.5" />
            View Recording
          </button>
        </div>
      </section>

      {/* Tabs — shared; content switches below */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#E8ECF1]">
        {AI_INSIGHTS_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
              tab === t
                ? 'border-[#016BE6] text-[#016BE6]'
                : 'border-transparent text-[#6F7B8C] hover:text-[#151D2B]',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Transcript' ? (
        <TranscriptTabPanel meeting={meeting} />
      ) : tab === 'Action Items' ? (
        <ActionItemsTabPanel meeting={meeting} />
      ) : tab === 'AI Summary' ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.9fr)]">
          <div className="flex min-w-0 flex-col gap-3">
              <section className={cn(CARD, 'flex flex-col p-3.5 sm:p-4')}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto text-[13px] font-semibold text-[#151D2B]">Transcript</h3>
                  <div className="relative min-w-[180px] flex-1 sm:max-w-[240px]">
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
                </div>

                <ul className="mt-3.5 space-y-3.5">
                  {transcript.map((line) => (
                    <li key={line.id} className="flex gap-2.5">
                      <div className="relative shrink-0">
                        <UserAvatar
                          name={line.name}
                          avatarUrl={line.avatarUrl}
                          avatarColor={line.avatarColor}
                          size="md"
                        />
                        {line.online ? (
                          <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#03A14A]" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-bold text-[#016BE6]">{line.name}</span>
                          {line.role ? (
                            <span className="rounded-md bg-[#EBF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1B3478]">
                              {line.role}
                            </span>
                          ) : null}
                          <span className="text-[11px] font-semibold text-[#8A94A6]">{line.time}</span>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#475569]">{line.text}</p>
                      </div>
                    </li>
                  ))}
                  {transcript.length === 0 ? (
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
                  <button type="button" className="text-[#6F7B8C] hover:text-[#151D2B]" aria-label="Volume">
                    <Volume2 className="size-4" />
                  </button>
                  <span className="text-[11px] font-semibold text-[#6F7B8C]">1x</span>
                </div>
              </section>

              <section className={cn(CARD, 'p-3.5 sm:p-4')}>
                <div className="mb-3 flex items-center gap-2">
                  <CheckSquare className="size-4 text-[#016BE6]" />
                  <h3 className="text-[13px] font-semibold text-[#151D2B]">Action Items</h3>
                </div>
                <ul>
                  {meeting.actionItems.slice(0, 4).map((item, i) => (
                    <li
                      key={item.id}
                      className={cn(
                        'flex flex-wrap items-center gap-2.5 py-2.5',
                        i < Math.min(4, meeting.actionItems.length) - 1 && 'border-b border-[#F1F4F8]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))
                        }
                        className={cn(
                          'size-4 shrink-0 rounded-full border-2',
                          checked[item.id]
                            ? 'border-[#016BE6] bg-[#016BE6]'
                            : 'border-[#E1E7EE] bg-white',
                        )}
                        aria-label={checked[item.id] ? 'Mark incomplete' : 'Mark complete'}
                      />
                      <p
                        className={cn(
                          'min-w-0 flex-1 text-[12px] text-[#334155]',
                          checked[item.id] && 'line-through opacity-60',
                        )}
                      >
                        {item.text}
                      </p>
                      <span className="rounded-md bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#1B3478]">
                        {item.assignee}
                      </span>
                      <span className="w-14 text-right text-[11px] text-[#8A94A6]">{item.due}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTab('Action Items')}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#016BE6] hover:underline"
                  >
                    View all action items
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </section>
          </div>

            <div className="flex min-w-0 flex-col gap-3">
              <section className={cn(CARD, 'p-3.5 sm:p-4')}>
                <div className="mb-2.5 flex items-center gap-2">
                  <Sparkles className="size-4 text-[#7C3AED]" />
                  <h3 className="text-[13px] font-semibold text-[#151D2B]">AI Summary</h3>
                </div>
                <p className="text-[12px] leading-relaxed text-[#475569]">{meeting.summary}</p>
                <h4 className="mt-3.5 text-[12px] font-bold text-[#151D2B]">Key Highlights</h4>
                <ul className="mt-2 space-y-2">
                  {meeting.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-[12px] leading-relaxed text-[#475569]">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#64748B]/50" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void copySummary()}
                  className="mt-3.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[14px] border border-[#E1E7EE] text-[12px] font-semibold text-[#151D2B] hover:bg-[#F8FAFC]"
                >
                  <Copy className="size-3.5" />
                  Copy Summary
                </button>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F1F4F8] pt-3">
                  <span className="text-[11px] text-[#8A94A6]">Was this summary helpful?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFeedback('up')}
                      className={cn(
                        'rounded-lg p-1.5 hover:bg-[#F0FDF4]',
                        feedback === 'up' ? 'text-[#16A34A]' : 'text-[#8A94A6]',
                      )}
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback('down')}
                      className={cn(
                        'rounded-lg p-1.5 hover:bg-[#FEF2F2]',
                        feedback === 'down' ? 'text-[#DC2626]' : 'text-[#8A94A6]',
                      )}
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="size-3.5" />
                    </button>
                  </div>
                </div>
              </section>

              <section className={cn(CARD, 'p-3.5 sm:p-4')}>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="size-4 text-[#016BE6]" />
                  <h3 className="text-[13px] font-semibold text-[#151D2B]">Topics</h3>
                </div>
                <ul className="space-y-2.5">
                  {meeting.topics.map((t) => (
                    <li key={t.label}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-[#334155]">{t.label}</span>
                        <span className="text-[11px] font-semibold text-[#6F7B8C]">{t.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                          className="h-full rounded-full bg-[#016BE6]"
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={cn(CARD, 'p-3.5 sm:p-4')}>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-[#7C3AED]" />
                  <h3 className="text-[13px] font-semibold text-[#151D2B]">Sentiment</h3>
                </div>
                <ul className="space-y-2.5">
                  {meeting.sentiment.map((s) => (
                    <li key={s.label} className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 text-[12px] font-medium text-[#334155]">{s.label}</span>
                      <span className="text-[12px] font-semibold text-[#151D2B]">{s.pct}%</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={cn(CARD, 'p-3.5 sm:p-4')}>
                <div className="mb-2.5 flex items-center gap-2">
                  <Sparkles className="size-4 text-[#7C3AED]" />
                  <h3 className="text-[13px] font-semibold text-[#151D2B]">AI Insights</h3>
                </div>
                <p className="text-[12px] leading-relaxed text-[#475569]">{meeting.insight}</p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTab('Insights')}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#016BE6] hover:underline"
                  >
                    View all insights
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </section>
            </div>
        </div>
      ) : (
        <TabPlaceholder tab={tab} meeting={meeting} checked={checked} setChecked={setChecked} />
      )}
    </div>
  );
}

function TabPlaceholder({
  tab,
  meeting,
  checked,
  setChecked,
}: {
  tab: AiInsightsTab;
  meeting: typeof DEMO_AI_MEETING;
  checked: Record<string, boolean>;
  setChecked: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  if (tab === 'Topics') {
    return (
      <section className={cn(CARD, 'max-w-xl p-3.5 sm:p-4')}>
        <div className="mb-3 flex items-center gap-2">
          <Target className="size-4 text-[#016BE6]" />
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Topics</h3>
        </div>
        <ul className="space-y-2.5">
          {meeting.topics.map((t) => (
            <li key={t.label}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[#334155]">{t.label}</span>
                <span className="text-[11px] font-semibold text-[#6F7B8C]">{t.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${t.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (tab === 'Sentiment') {
    return (
      <section className={cn(CARD, 'max-w-md p-3.5 sm:p-4')}>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-[#7C3AED]" />
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Sentiment</h3>
        </div>
        <ul className="space-y-2.5">
          {meeting.sentiment.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-[12px] font-medium text-[#334155]">{s.label}</span>
              <span className="text-[12px] font-semibold text-[#151D2B]">{s.pct}%</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (tab === 'Insights') {
    return (
      <section className={cn(CARD, 'max-w-2xl p-3.5 sm:p-4')}>
        <div className="mb-2.5 flex items-center gap-2">
          <Sparkles className="size-4 text-[#7C3AED]" />
          <h3 className="text-[13px] font-semibold text-[#151D2B]">AI Insights</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-[#475569]">{meeting.insight}</p>
      </section>
    );
  }

  return (
    <section className={cn(CARD, 'p-6 text-center')}>
      <Sparkles className="mx-auto mb-2 size-6 text-[#7C3AED]" />
      <h3 className="text-[13px] font-semibold text-[#151D2B]">{tab}</h3>
      <p className="mt-1 text-[12px] text-[#8A94A6]">
        This AI view is coming soon for this meeting.
      </p>
    </section>
  );
}
