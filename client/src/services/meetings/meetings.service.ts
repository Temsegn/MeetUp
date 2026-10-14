import { apiFetch } from '../auth/auth.service';
import { API_URL } from '../../lib/apiUrl';

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  status: 'invited' | 'registered' | 'joined';
  registeredAt: string;
  joinedAt?: string | null;
}

export interface InvitationDelivery {
  email: string;
  kind: 'invite' | 'update' | 'cancel';
  sequence: number;
  status: string;
  lastError?: string | null;
  attempts: number;
}

export interface InvitationSummary {
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
  smtpConfigured: boolean;
  deliveries: InvitationDelivery[];
}

export interface Meeting {
  id: string;
  roomId: string;
  workspaceId: string | null;
  createdBy: string;
  createdByName: string;
  createdByAvatarUrl?: string | null;
  createdByAvatarColor?: string | null;
  type: 'instant' | 'scheduled';
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  title?: string;
  agenda?: string[];
  scheduledAt?: string;
  endsAt?: string | null;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  description?: string;
  calendarUid?: string;
  calendarSequence?: number;
  participantCount?: number;
  peakParticipants?: number;
  participants?: number;
  registeredParticipantCount?: number;
  participantList?: MeetingParticipant[];
  settings: { waitingRoom: boolean; autoRecord: boolean };
  guestEmails?: string[];
  joinUrl?: string;
  googleCalendarUrl?: string | null;
  outlookCalendarUrl?: string | null;
  invitations?: InvitationSummary;
  createdAt: string;
}

export interface MeetingStats {
  total: number;
  live: number;
  ended: number;
  upcoming: number;
  participantMinutes: number;
  uniqueParticipants: number;
  trends: {
    total: number;
    participantMinutes: number;
    participants: number;
  };
}

export interface CreateMeetingInput {
  type?: 'instant' | 'scheduled';
  title?: string;
  agenda?: string[];
  scheduledAt?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  description?: string;
  settings?: { waitingRoom?: boolean; autoRecord?: boolean };
  participantIds?: string[];
  guestEmails?: string[];
}

export interface PatchMeetingInput {
  title?: string;
  agenda?: string[];
  scheduledAt?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  description?: string;
  settings?: { waitingRoom?: boolean; autoRecord?: boolean };
}

function workspaceHeader(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

export const meetingsService = {
  async list(
    workspaceId: string | null | undefined,
    params: { page?: number; limit?: number; status?: string; q?: string; date?: string } = {},
  ): Promise<{ meetings: Meeting[]; total: number; page: number; limit: number }> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    if (params.date) qs.set('date', params.date);
    const query = qs.toString() ? `?${qs}` : '';
    return apiFetch(`/workspace-meetings${query}`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  async stats(workspaceId: string | null | undefined): Promise<MeetingStats> {
    return apiFetch('/workspace-meetings/stats', {
      headers: workspaceHeader(workspaceId),
    });
  },

  async get(workspaceId: string | null | undefined, id: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  async getByRoomId(workspaceId: string | null | undefined, roomId: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/by-room/${encodeURIComponent(roomId)}`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  /** Public join gate (no workspace auth) — for /join/:roomId and invite links. */
  async getJoinStatus(
    roomId: string,
    opts?: { email?: string | null },
  ): Promise<{
    roomId: string;
    title: string;
    status: string;
    joinable: boolean;
    code: string | null;
    message: string | null;
    scheduledAt: string | null;
    previousDisplayName: string | null;
    previouslyAdmitted: boolean;
  }> {
    const qs =
      opts?.email && String(opts.email).trim()
        ? `?email=${encodeURIComponent(String(opts.email).trim().toLowerCase())}`
        : '';
    const res = await fetch(
      `${API_URL}/workspace-meetings/join-status/${encodeURIComponent(roomId)}${qs}`,
      { credentials: 'include' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || 'Meeting not found');
    }
    return data as {
      roomId: string;
      title: string;
      status: string;
      joinable: boolean;
      code: string | null;
      message: string | null;
      scheduledAt: string | null;
      previousDisplayName: string | null;
      previouslyAdmitted: boolean;
    };
  },

  async end(workspaceId: string | null | undefined, id: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/end`, {
      method: 'POST',
      headers: workspaceHeader(workspaceId),
    });
  },

  async create(workspaceId: string | null | undefined, input: CreateMeetingInput): Promise<Meeting> {
    return apiFetch('/workspace-meetings', {
      method: 'POST',
      body: input,
      headers: workspaceHeader(workspaceId),
    });
  },

  async cancel(workspaceId: string | null | undefined, id: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/cancel`, {
      method: 'POST',
      headers: workspaceHeader(workspaceId),
    });
  },

  async patch(
    workspaceId: string | null | undefined,
    id: string,
    patch: PatchMeetingInput,
  ): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}`, {
      method: 'PATCH',
      body: patch,
      headers: workspaceHeader(workspaceId),
    });
  },

  async retryInvitations(workspaceId: string | null | undefined, id: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/invitations/retry`, {
      method: 'POST',
      headers: workspaceHeader(workspaceId),
    });
  },

  calendarIcsUrl(workspaceId: string | null | undefined, id: string): string {
    const base = `${API_URL}/workspace-meetings/${encodeURIComponent(id)}/calendar.ics`;
    if (!workspaceId) return base;
    return base;
  },

  async downloadCalendarIcs(workspaceId: string | null | undefined, id: string): Promise<void> {
    const res = await fetch(this.calendarIcsUrl(workspaceId, id), {
      credentials: 'include',
      headers: workspaceHeader(workspaceId),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Could not download calendar file.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invite.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async join(workspaceId: string | null | undefined, id: string): Promise<{ roomId: string }> {
    return apiFetch(`/workspace-meetings/${id}/join`, {
      method: 'POST',
      headers: workspaceHeader(workspaceId),
    });
  },

  async register(workspaceId: string | null | undefined, id: string): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/register`, {
      method: 'POST',
      headers: workspaceHeader(workspaceId),
    });
  },

  async addParticipants(
    workspaceId: string | null | undefined,
    id: string,
    input: { userIds?: string[]; guestEmails?: string[] },
  ): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/participants`, {
      method: 'POST',
      body: input,
      headers: workspaceHeader(workspaceId),
    });
  },

  async removeParticipant(
    workspaceId: string | null | undefined,
    id: string,
    userId: string,
  ): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/participants/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: workspaceHeader(workspaceId),
    });
  },

  async removeGuestEmail(
    workspaceId: string | null | undefined,
    id: string,
    email: string,
  ): Promise<Meeting> {
    return apiFetch(`/workspace-meetings/${id}/guest-emails`, {
      method: 'DELETE',
      body: { email },
      headers: workspaceHeader(workspaceId),
    });
  },

  async listNotifications(workspaceId: string | null | undefined): Promise<
    Array<{
      id: string;
      title: string;
      body: string;
      kind: string;
      href?: string;
      read: boolean;
      createdAt: string;
    }>
  > {
    const data = await apiFetch<{ notifications: Array<{
      id: string;
      title: string;
      body: string;
      kind: string;
      href?: string;
      read: boolean;
      createdAt: string;
    }> }>('/workspace-meetings/notifications/mine', {
      headers: workspaceHeader(workspaceId),
    });
    return data.notifications;
  },

  async markNotificationsRead(workspaceId: string | null | undefined, ids?: string[]): Promise<void> {
    await apiFetch('/workspace-meetings/notifications/read', {
      method: 'POST',
      body: { ids },
      headers: workspaceHeader(workspaceId),
    });
  },
};
