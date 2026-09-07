import { apiFetch } from '../auth/auth.service';

export type WorkspaceRoomStatus = 'active' | 'inactive' | 'pending';

export type WorkspaceRoom = {
  id: string;
  workspaceId: string;
  name: string;
  roomId: string;
  description: string;
  capacity: number;
  roomType: string;
  department: string;
  tags: string[];
  imageUrl: string | null;
  memberIds: string[];
  memberCount: number;
  settings: {
    allowRecording: boolean;
    allowChat: boolean;
    screenSharing: boolean;
    fileSharing: boolean;
    waitingRoom: boolean;
    roomApproval: boolean;
  };
  status: WorkspaceRoomStatus;
  accent: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdByAvatarUrl: string | null;
  createdByAvatarColor: string | null;
  createdAt: string;
};

export type CreateRoomInput = {
  name: string;
  roomId: string;
  description?: string;
  capacity: number;
  roomType?: string;
  department?: string;
  tags?: string[];
  memberIds?: string[];
  settings?: Partial<WorkspaceRoom['settings']>;
};

function workspaceHeader(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

export const roomsService = {
  async list(
    workspaceId: string | null | undefined,
    params: { q?: string; status?: string } = {},
  ): Promise<WorkspaceRoom[]> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status && params.status !== 'all' && params.status !== 'All Status') {
      qs.set('status', params.status.toLowerCase());
    }
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<{ rooms: WorkspaceRoom[] }>(`/workspace-rooms${query}`, {
      headers: workspaceHeader(workspaceId),
    });
    return data.rooms;
  },

  async create(
    workspaceId: string | null | undefined,
    input: CreateRoomInput,
  ): Promise<WorkspaceRoom> {
    return apiFetch<WorkspaceRoom>('/workspace-rooms', {
      method: 'POST',
      body: input,
      headers: workspaceHeader(workspaceId),
    });
  },
};
