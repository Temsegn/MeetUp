import { apiFetch } from '../auth/auth.service';
import type { MeetingTypeKey } from '../../features/reports/data/reports.data';

export type ReportMeetingType = 'instant' | 'scheduled';

export interface ReportTrendDelta {
  change: string;
  positive: boolean;
}

export interface ReportsOverview {
  range: number;
  types?: ReportMeetingType[];
  totalParticipantMinutes: number;
  uniqueParticipants: number;
  totalMeetings: number;
  totalRecordings: number;
  filesShared: number;
  byDay: { date: string; participantMinutes: number; meetings: number }[];
  heatmap: number[][];
  engagement: {
    attendance: number[];
    camera: number[];
  };
  trends: {
    meetings: ReportTrendDelta;
    participants: ReportTrendDelta;
    minutes: ReportTrendDelta;
    avgDuration: ReportTrendDelta;
    recordings: ReportTrendDelta;
  };
  topParticipants: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    meetingCount: number;
    totalMinutes: number;
    pct: number;
  }[];
  meetings: {
    id: string;
    title: string;
    type: ReportMeetingType;
    startedAt: string;
    durationMinutes: number;
    participants: number;
    attendance: number;
  }[];
  recordings: {
    id: string;
    title: string;
    type: ReportMeetingType;
    createdAt: string;
    duration: string;
    views: number;
  }[];
  insights: string[];
}

export const reportsService = {
  async getOverview(
    workspaceId: string | null | undefined,
    range = 30,
    types?: MeetingTypeKey[],
  ): Promise<ReportsOverview> {
    const header: Record<string, string> = workspaceId ? { 'X-Workspace-Id': workspaceId } : {};
    const params = new URLSearchParams({ range: String(range) });
    if (types?.length === 1) {
      params.set('types', types[0]);
    }
    return apiFetch<ReportsOverview>(`/reports/overview?${params.toString()}`, {
      headers: header,
    });
  },
};
