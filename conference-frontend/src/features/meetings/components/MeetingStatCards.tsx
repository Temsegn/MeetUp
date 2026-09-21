import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock3, Radio, Users } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { MeetingStatCardSkeleton } from './MeetingsSkeletons';
import { KPI_CARD_RADIUS_CLASS } from '../../dashboard/components/dashboardListStyles';

type Props = {
  totalMeetings: string;
  totalTime: string;
  totalParticipants: string;
  liveNow: string;
  loading?: boolean;
  trends?: {
    total?: number;
    participantMinutes?: number;
    participants?: number;
  };
};

const TONE = {
  blue: { badge: 'bg-[#E2F0FF] text-[#016BE6]', stroke: '#5BA3F5', fill: '#5BA3F5' },
  green: { badge: 'bg-[#DAF7E3] text-[#00A45C]', stroke: '#4ADE80', fill: '#4ADE80' },
  purple: { badge: 'bg-[#EDEBFF] text-[#7C3AED]', stroke: '#A78BFA', fill: '#A78BFA' },
  orange: { badge: 'bg-[#FFECD8] text-[#EA580C]', stroke: '#FB923C', fill: '#FB923C' },
};

function Sparkline({ path, stroke, fill }: { path: string; stroke: string; fill: string }) {
  const id = `mtg-spark-${stroke.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 36" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.28" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100 36 L0 36 Z`} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatTrend(pct: number | undefined, fallback: string): { text: string; positive: boolean } {
  if (pct === undefined || Number.isNaN(pct)) return { text: fallback, positive: true };
  const sign = pct > 0 ? '+ ' : pct < 0 ? '− ' : '';
  return {
    text: `${sign}${Math.abs(pct)}% vs last 30 days`,
    positive: pct >= 0,
  };
}

export function MeetingStatCards({
  totalMeetings,
  totalTime,
  totalParticipants,
  liveNow,
  loading = false,
  trends,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-busy="true" aria-label="Loading stats">
        {Array.from({ length: 4 }, (_, i) => (
          <MeetingStatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Meetings',
      value: totalMeetings,
      ...formatTrend(trends?.total, 'vs last 30 days'),
      tone: 'blue' as const,
      icon: CalendarDays,
      path: 'M0 28 C12 22, 20 34, 32 24 C44 14, 52 30, 64 18 C76 8, 88 22, 100 14',
    },
    {
      label: 'Total Meeting Time',
      value: totalTime,
      ...formatTrend(trends?.participantMinutes, 'vs last 30 days'),
      tone: 'green' as const,
      icon: Clock3,
      path: 'M0 26 C14 18, 22 32, 34 20 C46 10, 54 28, 66 16 C78 6, 90 20, 100 12',
    },
    {
      label: 'Total Participants',
      value: totalParticipants,
      ...formatTrend(trends?.participants, 'vs last 30 days'),
      tone: 'purple' as const,
      icon: Users,
      path: 'M0 30 C12 24, 24 12, 36 22 C48 32, 58 14, 70 20 C82 26, 90 10, 100 16',
    },
    {
      label: 'Live Now',
      value: liveNow,
      text: 'Active sessions',
      positive: true,
      tone: 'orange' as const,
      icon: Radio,
      path: 'M0 24 C10 30, 22 12, 34 22 C46 32, 56 14, 68 18 C80 22, 90 8, 100 14',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((s) => {
        const Icon = s.icon;
        const tone = TONE[s.tone];
        return (
          <article
            key={s.label}
            className={cn(
              KPI_CARD_RADIUS_CLASS,
              'flex min-h-[112px] flex-col border border-[#E8ECF1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('flex size-7 items-center justify-center rounded-full', tone.badge)}>
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <p className="truncate text-[12px] font-semibold text-[#151D2B]">{s.label}</p>
            </div>

            <p className="mt-2.5 text-[24px] font-bold leading-none tracking-tight text-[#151D2B]">
              {s.value}
            </p>

            <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
              <p
                className={cn(
                  'flex items-center gap-0.5 text-[10px] font-medium',
                  s.tone === 'orange'
                    ? 'text-[#8A94A6]'
                    : s.positive
                      ? 'text-[#00A45C]'
                      : 'text-[#DC2626]',
                )}
              >
                {s.tone !== 'orange' ? (
                  s.positive ? (
                    <ArrowUpRight className="size-3" strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight className="size-3" strokeWidth={2.5} />
                  )
                ) : null}
                {s.text}
              </p>
              <div className="h-7 w-[72px] shrink-0">
                <Sparkline path={s.path} stroke={tone.stroke} fill={tone.fill} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
