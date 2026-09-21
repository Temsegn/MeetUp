import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { ParticipantRowSkeleton } from './DashboardSkeletons';
import { DASHBOARD_CARD_RADIUS_CLASS } from './dashboardListStyles';

function formatMinutes(mins: number) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Unique users ranked by meetings joined + total hours (one row per person).
 */
export function TopParticipantsCard() {
  const { summary, loading } = useDashboardSummary('week');
  const people = (summary?.topParticipants ?? []).filter((p) => p.meetingCount >= 1);

  return (
    <SectionCard
      className={DASHBOARD_CARD_RADIUS_CLASS}
      title="Top Participants"
      action={
        <Link
          to="/app/settings/members"
          className="flex items-center gap-0.5 text-[11px] font-semibold text-[#006DEC] hover:underline"
        >
          View all <ArrowUpRight className="size-2.5" />
        </Link>
      }
    >
      {loading ? (
        <ul className="space-y-3.5" aria-busy="true" aria-label="Loading participants">
          {Array.from({ length: 5 }, (_, i) => (
            <ParticipantRowSkeleton key={i} />
          ))}
        </ul>
      ) : people.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[#8A94A6]">
          No participants have joined meetings yet.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {people.map((p) => (
            <li key={p.userId} className="flex items-center gap-2.5">
              <UserAvatar
                name={p.name}
                avatarUrl={p.avatarUrl}
                avatarColor={p.avatarColor}
                size="md"
              />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#151D2B]">
                {p.name}
              </p>
              <span className="shrink-0 text-[11px] text-[#8A94A6]">
                {p.meetingCount} meeting{p.meetingCount === 1 ? '' : 's'}
              </span>
              <span className="w-[58px] shrink-0 text-right text-[12px] font-medium tabular-nums text-[#151D2B]">
                {formatMinutes(p.totalMinutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
