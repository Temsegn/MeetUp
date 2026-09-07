import { apiFetch, getAccessToken, ApiError } from '../auth/auth.service';

export interface Recording {
  id: string;
  recordingId: string;
  roomId: string;
  title: string;
  description: string;
  storageKey?: string;
  durationSeconds: number;
  bytes: number;
  views: number;
  status: 'processing' | 'ready' | 'failed';
  participants?: Array<{
    userId?: string;
    name?: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  }>;
  createdAt: string;
}

export interface RecordingStats {
  total: number;
  totalDurationSeconds: number;
  storageBytes: number;
  filesShared: number;
  trends: {
    total: number;
    duration: number;
    storage: number;
    filesShared: number;
  };
}

function workspaceHeader(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

export const recordingsService = {
  async list(
    workspaceId: string | null | undefined,
    params: { page?: number; limit?: number; meetingId?: string } = {},
  ): Promise<{ recordings: Recording[]; total: number; page: number; limit: number }> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.meetingId) qs.set('meetingId', params.meetingId);
    const query = qs.toString() ? `?${qs}` : '';
    return apiFetch(`/recordings${query}`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  async stats(workspaceId: string | null | undefined): Promise<RecordingStats> {
    return apiFetch('/recordings/stats', {
      headers: workspaceHeader(workspaceId),
    });
  },

  async get(workspaceId: string | null | undefined, id: string): Promise<Recording> {
    return apiFetch(`/recordings/${id}`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  async delete(workspaceId: string | null | undefined, id: string): Promise<void> {
    await apiFetch(`/recordings/${id}`, {
      method: 'DELETE',
      headers: workspaceHeader(workspaceId),
    });
  },

  async rename(
    workspaceId: string | null | undefined,
    id: string,
    title: string,
  ): Promise<Recording> {
    return apiFetch<Recording>(`/recordings/${id}`, {
      method: 'PATCH',
      headers: workspaceHeader(workspaceId),
      body: JSON.stringify({ title: title.trim() }),
    });
  },

  async getStreamBlobUrl(
    workspaceId: string | null | undefined,
    id: string,
    opts?: { download?: boolean },
  ): Promise<string> {
    const headers: Record<string, string> = { ...workspaceHeader(workspaceId) };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const qs = opts?.download ? '?download=1' : '';
    const res = await fetch(`${API_URL}/recordings/${id}/stream${qs}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw new ApiError('Failed to load recording stream.', res.status);
    }

    const blob = await res.blob();
    const mime = res.headers.get('content-type') || 'video/mp4';
    const typed = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
    return URL.createObjectURL(typed);
  },

  async download(
    workspaceId: string | null | undefined,
    id: string,
    filename = 'recording.mp4',
  ): Promise<void> {
    const url = await this.getStreamBlobUrl(workspaceId, id, { download: true });
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
