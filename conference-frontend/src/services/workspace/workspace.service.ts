import { apiFetch } from '../auth/auth.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

export interface WorkspaceSettings {
  waitingRoom: boolean;
  autoRecord: boolean;
  joinBeforeHost: boolean;
  muteOnEntry: boolean;
  maxMeetingDurationMinutes: number;
  language: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  email: string;
  logoUrl: string | null;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl: string | null;
  avatarColor?: string | null;
  jobTitle?: string;
  department?: string;
  createdAt: string;
}

export interface WorkspaceDirectoryMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  name: string;
  email: string;
  phone?: string;
  avatarUrl: string | null;
  avatarColor?: string | null;
  jobTitle?: string;
  department?: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  expiresAt: string;
  createdAt: string;
}

export interface CreatedInvite {
  inviteId: string;
  token: string;
  joinUrl?: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  expiresAt: string;
  emailSent: boolean;
  emailMode?: 'smtp' | 'console';
  emailError?: string | null;
  temporaryPasswordIssued: boolean;
}

export interface BillingUsage {
  periodStart: string;
  periodEnd: string;
  planKey: string;
  included: number;
  used: number;
  remaining: number;
  overage: number;
  byDay: { date: string; participantMinutes: number }[];
}

export interface PlanInfo {
  key: 'free' | 'pro' | 'enterprise';
  name: string;
  includedParticipantMinutes: number;
  overageRatePerMinute: number;
  maxMembers: number;
  maxConcurrentMeetings: number;
  recordingStorageGb: number;
  features: {
    messages: boolean;
    reports: boolean;
    waitingRoom: boolean;
    autoRecord: boolean;
  };
}

export interface BillingSubscription {
  id: string;
  workspaceId: string;
  planKey: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  participantMinutesUsed: number;
  participantMinutesIncluded: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function workspaceHeaders(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const workspaceService = {
  async listMine(): Promise<WorkspaceMembership[]> {
    const data = await apiFetch<{ workspaces: WorkspaceMembership[] }>('/workspaces');
    return data.workspaces;
  },

  async get(workspaceId: string): Promise<Workspace> {
    return apiFetch<Workspace>(`/workspaces/${workspaceId}`, {
      headers: workspaceHeaders(workspaceId),
    });
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const data = await apiFetch<{ members: WorkspaceMember[] }>(
      `/workspaces/${workspaceId}/members`,
      { headers: workspaceHeaders(workspaceId) },
    );
    return data.members;
  },

  async listDirectory(workspaceId: string): Promise<WorkspaceDirectoryMember[]> {
    const data = await apiFetch<{ members: WorkspaceDirectoryMember[] }>(
      `/workspaces/${workspaceId}/directory`,
      { headers: workspaceHeaders(workspaceId) },
    );
    return data.members;
  },

  async listInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    const data = await apiFetch<{ invites: WorkspaceInvite[] }>(
      `/workspaces/${workspaceId}/invites`,
      { headers: workspaceHeaders(workspaceId) },
    );
    return data.invites;
  },

  async invite(
    workspaceId: string,
    input: { name: string; email: string; phone?: string; role?: 'admin' | 'member' },
  ): Promise<CreatedInvite> {
    return apiFetch(`/workspaces/${workspaceId}/invites`, {
      method: 'POST',
      body: input,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async revokeInvite(workspaceId: string, inviteId: string) {
    return apiFetch(`/workspaces/${workspaceId}/invites/${inviteId}`, {
      method: 'DELETE',
      headers: workspaceHeaders(workspaceId),
    });
  },

  async updateInvite(
    workspaceId: string,
    inviteId: string,
    input: { name?: string; email?: string; phone?: string; role?: 'admin' | 'member' },
  ) {
    return apiFetch<{
      invite: WorkspaceInvite;
      emailSent: boolean;
      emailError: string | null;
      emailChanged: boolean;
    }>(`/workspaces/${workspaceId}/invites/${inviteId}`, {
      method: 'PATCH',
      body: input,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async resendInvite(workspaceId: string, inviteId: string) {
    return apiFetch<{
      email: string;
      emailSent: boolean;
      emailError: string | null;
      joinUrl?: string;
    }>(`/workspaces/${workspaceId}/invites/${inviteId}/resend`, {
      method: 'POST',
      headers: workspaceHeaders(workspaceId),
    });
  },

  async acceptInvite(token: string): Promise<{ workspaceId: string }> {
    return apiFetch('/workspaces/invites/accept', {
      method: 'POST',
      body: { token },
    });
  },

  async joinInvite(input: {
    token: string;
    name?: string;
    password: string;
    temporaryPassword?: string;
  }) {
    return apiFetch('/workspaces/invites/join', {
      method: 'POST',
      body: input,
    });
  },

  async changeRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
    return apiFetch(`/workspaces/${workspaceId}/members/${userId}/role`, {
      method: 'PATCH',
      body: { role },
      headers: workspaceHeaders(workspaceId),
    });
  },

  async updateMember(
    workspaceId: string,
    userId: string,
    patch: {
      name?: string;
      phone?: string;
      jobTitle?: string;
      department?: string;
      role?: 'admin' | 'member';
    },
  ) {
    return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      body: patch,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async setMemberStatus(workspaceId: string, userId: string, status: 'active' | 'inactive') {
    return apiFetch(`/workspaces/${workspaceId}/members/${userId}/status`, {
      method: 'PATCH',
      body: { status },
      headers: workspaceHeaders(workspaceId),
    });
  },

  async removeMember(workspaceId: string, userId: string) {
    return apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      headers: workspaceHeaders(workspaceId),
    });
  },

  async updateSettings(
    workspaceId: string,
    patch: Partial<
      WorkspaceSettings & {
        name?: string;
        slug?: string;
        email?: string;
        logoUrl?: string | null;
      }
    >,
  ) {
    return apiFetch<Workspace>(`/workspaces/${workspaceId}/settings`, {
      method: 'PATCH',
      body: patch,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async listPlans(workspaceId: string): Promise<PlanInfo[]> {
    const data = await apiFetch<{ plans: PlanInfo[] }>('/billing/plans', {
      headers: workspaceHeaders(workspaceId),
    });
    return data.plans;
  },

  async getBillingPlan(workspaceId: string): Promise<{ subscription: BillingSubscription; plan: PlanInfo | null }> {
    return apiFetch('/billing/plan', {
      headers: workspaceHeaders(workspaceId),
    });
  },

  async getBillingUsage(workspaceId: string): Promise<BillingUsage> {
    return apiFetch<BillingUsage>('/billing/usage', {
      headers: workspaceHeaders(workspaceId),
    });
  },

  async getBillingUsageByMeeting(workspaceId: string) {
    return apiFetch<{ meetings: { meetingId: string | null; title: string; participantMinutes: number; durationSeconds: number }[] }>(
      '/billing/usage/meetings',
      { headers: workspaceHeaders(workspaceId) },
    );
  },

  async changePlan(workspaceId: string, planKey: 'free' | 'pro' | 'enterprise') {
    return apiFetch<{ subscription: BillingSubscription; plan: PlanInfo }>('/billing/plan', {
      method: 'PATCH',
      body: { planKey },
      headers: workspaceHeaders(workspaceId),
    });
  },
};
