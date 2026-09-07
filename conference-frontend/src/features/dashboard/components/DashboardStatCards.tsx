import { ArrowUpRight, CalendarDays, CheckCircle2, Film, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';
import { StatCardSkeleton } from './DashboardSkeletons';
import { DASHBOARD_STAT_RADIUS_CLASS } from './dashboardListStyles';

interface Props {
  upcomingMeetings?: number;
  completedMeetings?: number;
  totalParticipants?: number;
  totalRecordings?: number;
  loading?: boolean;
}

const TONE = {
  blue: { badge: 'bg-[#E2F0FF] text-[#016BE6]', stroke: '#5BA3F5', fill: '#5BA3F5' },
  green: { badge: 'bg-[#DAF7E3] text-[#00A45C]', stroke: '#4ADE80', fill: '#4ADE80' },
  purple: { badge: 'bg-[#EDEBFF] text-[#7C3AED]', stroke: '#A78BFA', fill: '#A78BFA' },
  orange: { badge: 'bg-[#FFECD8] text-[#EA580C]', stroke: '#FB923C', fill: '#FB923C' },
};

function Sparkline({ path, stroke, fill }: { path: string; stroke: string; fill: string }) {
  const id = `spark-${stroke.replace('#', '')}`;
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

export function DashboardStatCards({
  upcomingMeetings = 0,
  completedMeetings = 0,
  totalParticipants = 0,
  totalRecordings = 0,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-busy="true" aria-label="Loading stats">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Upcoming Meetings',
      value: String(upcomingMeetings),
      meta: 'Scheduled',
      href: '/app/meetings',
      hrefLabel: 'View all',
      tone: 'blue' as const,
      icon: CalendarDays,
      path: 'M0 28 C12 22, 20 34, 32 24 C44 14, 52 30, 64 18 C76 8, 88 22, 100 14',
    },
    {
      label: 'Completed Meetings',
      value: String(completedMeetings),
      meta: 'This week',
      href: '/app/meetings',
      hrefLabel: 'View all',
      tone: 'green' as const,
      icon: CheckCircle2,
      path: 'M0 26 C14 18, 22 32, 34 20 C46 10, 54 28, 66 16 C78 6, 90 20, 100 12',
    },
    {
      label: 'Total Participants',
      value: String(totalParticipants),
      meta: 'This week',
      href: '/app/reports',
      hrefLabel: 'View report',
      tone: 'purple' as const,
      icon: Users,
      path: 'M0 30 C12 24, 24 12, 36 22 C48 32, 58 14, 70 20 C82 26, 90 10, 100 16',
    },
    {
      label: 'Total Recordings',
      value: String(totalRecordings),
      meta: 'All time',
      href: '/app/recordings',
      hrefLabel: 'View all',
      tone: 'orange' as const,
      icon: Film,
      path: 'M0 24 C10 30, 22 12, 34 22 C46 32, 56 14, 68 18 C80 22, 90 8, 100 14',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const tone = TONE[s.tone];
        return (
          <article
            key={s.label}
            className={cn(
              DASHBOARD_STAT_RADIUS_CLASS,
              'flex min-h-[108px] flex-col border border-[#E8ECF1] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('flex size-6 items-center justify-center rounded-full', tone.badge)}>
                <Icon className="size-3" strokeWidth={2} />
              </span>
              <p className="truncate text-[11px] font-semibold text-[#151D2B]">{s.label}</p>
            </div>

            <div className="mt-2 flex flex-1 items-end gap-1.5">
              <div className="min-w-0 shrink-0">
                <p className="text-[22px] font-bold leading-none tracking-tight text-[#151D2B]">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[9px] text-[#8A94A6]">{s.meta}</p>
              </div>
              <div className="mb-0.5 h-8 min-w-0 flex-1">
                <Sparkline path={s.path} stroke={tone.stroke} fill={tone.fill} />
              </div>
            </div>

            <Link
              to={s.href}
              className="mt-2 flex items-center gap-0.5 text-[10px] font-semibold text-[#006DEC] hover:underline"
            >
              {s.hrefLabel}
              <ArrowUpRight className="size-2.5" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
