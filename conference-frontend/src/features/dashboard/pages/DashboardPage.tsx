import { useAuth } from '../../../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { DashboardStatCards } from '../components/DashboardStatCards';
import { UpcomingMeetingsCard } from '../components/UpcomingMeetingsCard';
import { RecentRecordingsCard } from '../components/RecentRecordingsCard';
import { MeetingInsightsCard } from '../components/MeetingInsightsCard';
import { TopParticipantsCard } from '../components/TopParticipantsCard';
import { CalendarCard } from '../components/CalendarCard';
import { ActivityFeedCard } from '../components/ActivityFeedCard';
import { QuickActionsCard } from '../components/QuickActionsCard';
import { useDashboardSummary } from '../hooks/useDashboardSummary';

/**
 * Dashboard — Figma layout:
 * left: stats → upcoming + recordings → insights + top participants
 * right: calendar → activity feed → quick actions
 */
export function DashboardPage() {
  const { user } = useAuth();
  const { summary, loading: summaryLoading } = useDashboardSummary();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="pr-1">
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}! Here's what's happening today.`}
        className="mb-5"
      />

      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-3">
          <DashboardStatCards
            loading={summaryLoading}
            upcomingMeetings={summary?.upcomingMeetings ?? 0}
            completedMeetings={summary?.completedMeetings ?? 0}
            totalParticipants={summary?.totalParticipants ?? 0}
            totalRecordings={summary?.totalRecordings ?? 0}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <UpcomingMeetingsCard />
            <RecentRecordingsCard />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MeetingInsightsCard />
            <TopParticipantsCard />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <CalendarCard />
          <ActivityFeedCard />
          <QuickActionsCard loading={summaryLoading} />
        </div>
      </div>
    </div>
  );
}
