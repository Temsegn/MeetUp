import { apiFetch } from '../auth/auth.service';

export type WorkspaceTeamStatus = 'active' | 'inactive' | 'pending';

export type WorkspaceTeam = {
  id: string;
  workspaceId: string;
  name: string;
  teamId: string;
  description: string;
  department: string;
  visibility: 'workspace' | 'private';
  leadUserId: string | null;
  leadName: string;
  leadEmail: string;
  leadAvatarUrl: string | null;
  leadAvatarColor: string | null;
  memberIds: string[];
  memberCount: number;
  settings: {
    membersCanInvite: boolean;
    requireJoinApproval: boolean;
    notifyOnChanges: boolean;
    canCreateMeetings: boolean;
  };
  status: WorkspaceTeamStatus;
  accent: string;
  createdBy: string;
  createdAt: string;
};

export type CreateTeamInput = {
  name: string;
  teamId: string;
  description?: string;
  department?: string;
  visibility?: 'workspace' | 'private';
  leadUserId?: string | null;
  memberIds?: string[];
  settings?: Partial<WorkspaceTeam['settings']>;
};

function workspaceHeader(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

export const teamsService = {
  async list(
    workspaceId: string | null | undefined,
    params: { q?: string; status?: string } = {},
  ): Promise<WorkspaceTeam[]> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status && params.status !== 'all' && params.status !== 'All Status') {
      qs.set('status', params.status.toLowerCase());
    }
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<{ teams: WorkspaceTeam[] }>(`/workspace-teams${query}`, {
      headers: workspaceHeader(workspaceId),
    });
    return data.teams;
  },

  async create(
    workspaceId: string | null | undefined,
    input: CreateTeamInput,
  ): Promise<WorkspaceTeam> {
    return apiFetch<WorkspaceTeam>('/workspace-teams', {
      method: 'POST',
      body: input,
      headers: workspaceHeader(workspaceId),
    });
  },
};
