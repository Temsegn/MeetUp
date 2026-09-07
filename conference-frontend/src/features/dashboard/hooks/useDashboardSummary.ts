import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/auth/auth.service';

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year';

export interface TopParticipant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  meetingCount: number;
  totalMinutes: number;
}

export interface DashboardSummary {
  period?: DashboardPeriod;
  upcomingMeetings: number;
  completedMeetings: number;
  liveMeetings: number;
  totalRecordings: number;
  totalParticipants: number;
  totalMeetings?: number;
  billing: {
    planKey: string;
    used: number;
    included: number;
    remaining: number;
  } | null;
  participantMinutesTrend: { date: string; participantMinutes: number }[];
  topParticipants?: TopParticipant[];
  trends?: {
    completed: number;
    participants: number;
    recordings: number;
  };
}

export function useDashboardSummary(period: DashboardPeriod = 'week') {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.workspaceId;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<DashboardSummary>(`/dashboard/summary?period=${period}`, {
      headers: { 'X-Workspace-Id': workspaceId },
    })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [workspaceId, period]);

  return { summary, loading };
}
