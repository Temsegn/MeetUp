import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock3, Timer, Users } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { KPI_CARD_RADIUS_CLASS } from '../../dashboard/components/dashboardListStyles';

const TONE = {
  blue: { badge: 'bg-[#E2F0FF] text-[#016BE6]', stroke: '#5BA3F5', fill: '#5BA3F5', icon: CalendarDays },
  purple: { badge: 'bg-[#EDEBFF] text-[#7C3AED]', stroke: '#A78BFA', fill: '#A78BFA', icon: Users },
  green: { badge: 'bg-[#DAF7E3] text-[#00A45C]', stroke: '#4ADE80', fill: '#4ADE80', icon: Clock3 },
  orange: { badge: 'bg-[#FFECD8] text-[#EA580C]', stroke: '#FB923C', fill: '#FB923C', icon: Timer },
};


function Sparkline({ path, stroke, fill }: { path: string; stroke: string; fill: string }) {
  const id = `rpt-${stroke.replace('#', '')}-${path.length}`;
  return (
    <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.28" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100 40 L0 40 Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type CardChange = { change: string; positive: boolean };

type Props = {
  totalMeetings: string;
  participants: string;
  totalTime: string;
  avgDuration: string;
  compareLabel?: string;
  changes?: {
    totalMeetings?: CardChange | null;
    participants?: CardChange | null;
    totalTime?: CardChange | null;
    avgDuration?: CardChange | null;
  };
  sparklines?: {
    meetings?: string;
    participants?: string;
    minutes?: string;
    avg?: string;
  };
};

/** Figma KPI strip — Total Meetings / Total Participants / Total Meeting Time / Average Duration */
export function ReportStatCards({
  totalMeetings,
  participants,
  totalTime,
  avgDuration,
  compareLabel = 'vs prior period',
  changes,
  sparklines,
}: Props) {
  const cards = [
    {
      label: 'Total Meetings',
      value: totalMeetings,
      tone: 'blue' as const,
      delta: changes?.totalMeetings ?? null,
      spark: sparklines?.meetings,
    },
    {
      label: 'Total Participants',
      value: participants,
      tone: 'purple' as const,
      delta: changes?.participants ?? null,
      spark: sparklines?.participants,
    },
    {
      label: 'Total Meeting Time',
      value: totalTime,
      tone: 'green' as const,
      delta: changes?.totalTime ?? null,
      spark: sparklines?.minutes,
    },
    {
      label: 'Average Duration',
      value: avgDuration,
      tone: 'orange' as const,
      delta: changes?.avgDuration ?? null,
      spark: sparklines?.avg,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((s, i) => {
        const tone = TONE[s.tone];
        const Icon = tone.icon;
        return (
          <article
            key={s.label}
            className={cn(
              KPI_CARD_RADIUS_CLASS,
              'flex min-h-[108px] flex-col border border-[#E8ECF1] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('flex size-7 items-center justify-center rounded-full', tone.badge)}>
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <p className="truncate text-[12px] font-semibold text-[#151D2B]">{s.label}</p>
            </div>
            <div className="mt-2.5 flex flex-1 items-end gap-2">
              <div className="min-w-0 shrink-0">
                <p className="text-[24px] font-bold leading-none tracking-tight text-[#151D2B]">
                  {s.value}
                </p>
                {s.delta ? (
                  <div className="mt-1.5 flex items-center gap-0.5">
                    {s.delta.positive ? (
                      <ArrowUpRight className="size-3.5 text-[#16A34A]" />
                    ) : (
                      <ArrowDownRight className="size-3.5 text-[#DC2626]" />
                    )}
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        s.delta.positive ? 'text-[#16A34A]' : 'text-[#DC2626]',
                      )}
                    >
                      {s.delta.change}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[10px] text-[#8A94A6]">{compareLabel}</p>
                )}
              </div>
              <div className="mb-0.5 h-9 min-w-0 flex-1">
                <Sparkline
                  path={
                    s.spark ??
                    'M0 28 C12 22, 20 34, 32 24 C44 14, 52 30, 64 18 C76 8, 88 22, 100 14'
                  }
                  stroke={tone.stroke}
                  fill={tone.fill}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
