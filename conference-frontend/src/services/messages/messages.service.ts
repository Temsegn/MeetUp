import { apiFetch, getAccessToken } from '../auth/auth.service';

export type MessageAttachment = {
  name: string;
  storageKey?: string;
  thumbKey?: string;
  sizeBytes: number;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  url?: string;
  thumbUrl?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  clientId?: string;
  kind: 'text' | 'voice' | 'system' | 'call' | string;
  text: string;
  attachments: MessageAttachment[];
  replyToId?: string | null;
  mentions: string[];
  reactions: Array<{ emoji: string; userIds: string[] }>;
  deliveredTo: string[];
  readBy: string[];
  editedAt?: string | null;
  deletedAt?: string | null;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  call?: {
    callType: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'cancelled';
    durationSec?: number;
    startedAt?: string;
    endedAt?: string;
  } | null;
  forwardedFromId?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** Optimistic UI flag */
  pending?: boolean;
  failed?: boolean;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  memberIds: string[];
  lastMessageAt: string;
  preview: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  peerOnline?: boolean;
  peerJobTitle?: string;
  peerDepartment?: string;
  /** Unread messages from others (not yet read by current user). */
  unread?: number;
};

export type SharedProfile = {
  peer: {
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl: string | null;
    avatarColor?: string | null;
    jobTitle?: string;
    department?: string;
    online?: boolean;
    about?: string | null;
  } | null;
  media: Array<{
    name: string;
    mimeType?: string;
    url?: string;
    kind: 'image' | 'video' | 'audio' | 'file';
    createdAt: string;
  }>;
  mediaTotal: number;
  links: Array<{ title: string; url: string }>;
  meetings: Array<{ title: string; meta: string; roomId?: string; href?: string }>;
};

function workspaceHeader(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
const blobCache = new Map<string, string>();

export async function resolveMediaUrl(
  relativeUrl: string | undefined,
  workspaceId?: string | null,
): Promise<string | null> {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('blob:') || relativeUrl.startsWith('data:')) return relativeUrl;
  if (relativeUrl.startsWith('http')) return relativeUrl;

  const cacheKey = `${workspaceId ?? ''}:${relativeUrl}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  const token = getAccessToken();
  const res = await fetch(`${API_URL}${relativeUrl}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...workspaceHeader(workspaceId),
    },
    credentials: 'include',
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobCache.set(cacheKey, url);
  return url;
}

const CHUNK = 384 * 1024;

export const messagesService = {
  async listConversations(workspaceId: string | null | undefined): Promise<Conversation[]> {
    const data = await apiFetch<{ conversations: Conversation[] }>('/messages/conversations', {
      headers: workspaceHeader(workspaceId),
    });
    return data.conversations;
  },

  async getMessages(
    workspaceId: string | null | undefined,
    conversationId: string,
    params: { limit?: number; before?: string; after?: string } = {},
  ): Promise<ChatMessage[]> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.before) qs.set('before', params.before);
    if (params.after) qs.set('after', params.after);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<{ messages: ChatMessage[] }>(
      `/messages/conversations/${conversationId}/messages${query}`,
      { headers: workspaceHeader(workspaceId) },
    );
    return data.messages;
  },

  async getShared(
    workspaceId: string | null | undefined,
    conversationId: string,
  ): Promise<SharedProfile> {
    return apiFetch(`/messages/conversations/${conversationId}/shared`, {
      headers: workspaceHeader(workspaceId),
    });
  },

  async search(
    workspaceId: string | null | undefined,
    q: string,
    conversationId?: string,
  ): Promise<ChatMessage[]> {
    const qs = new URLSearchParams({ q });
    if (conversationId) qs.set('conversationId', conversationId);
    const data = await apiFetch<{ messages: ChatMessage[] }>(`/messages/search?${qs}`, {
      headers: workspaceHeader(workspaceId),
    });
    return data.messages;
  },

  async sendMessage(
    workspaceId: string | null | undefined,
    conversationId: string,
    body: {
      text?: string;
      clientId?: string;
      replyToId?: string | null;
      mentions?: string[];
      kind?: 'text' | 'voice';
      attachments?: MessageAttachment[];
    },
  ): Promise<ChatMessage> {
    return apiFetch(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body,
      headers: workspaceHeader(workspaceId),
    });
  },

  async editMessage(
    workspaceId: string | null | undefined,
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<ChatMessage> {
    return apiFetch(`/messages/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      body: { text },
      headers: workspaceHeader(workspaceId),
    });
  },

  async deleteMessage(
    workspaceId: string | null | undefined,
    conversationId: string,
    messageId: string,
  ): Promise<ChatMessage> {
    return apiFetch(`/messages/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: workspaceHeader(workspaceId),
    });
  },

  async react(
    workspaceId: string | null | undefined,
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<ChatMessage> {
    return apiFetch(`/messages/conversations/${conversationId}/messages/${messageId}/react`, {
      method: 'POST',
      body: { emoji },
      headers: workspaceHeader(workspaceId),
    });
  },

  async pin(
    workspaceId: string | null | undefined,
    conversationId: string,
    messageId: string,
    pinned: boolean,
  ): Promise<ChatMessage> {
    return apiFetch(`/messages/conversations/${conversationId}/messages/${messageId}/pin`, {
      method: 'POST',
      body: { pinned },
      headers: workspaceHeader(workspaceId),
    });
  },

  async markRead(
    workspaceId: string | null | undefined,
    conversationId: string,
    messageIds: string[],
  ): Promise<void> {
    await apiFetch(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      body: { messageIds },
      headers: workspaceHeader(workspaceId),
    });
  },

  async createConversation(
    workspaceId: string | null | undefined,
    input: { type?: 'direct' | 'group'; name?: string; memberIds?: string[] },
  ): Promise<{ id: string; type: string; name?: string }> {
    return apiFetch('/messages/conversations', {
      method: 'POST',
      body: input,
      headers: workspaceHeader(workspaceId),
    });
  },

  /** Chunked resumable upload (base64 chunks over JSON). */
  async uploadFile(
    workspaceId: string | null | undefined,
    conversationId: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<MessageAttachment> {
    const init = await apiFetch<{ uploadId: string; chunkSize: number }>('/messages/uploads/init', {
      method: 'POST',
      body: {
        conversationId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        totalBytes: file.size,
      },
      headers: workspaceHeader(workspaceId),
    });

    let offset = 0;
    const chunkSize = Math.min(init.chunkSize || CHUNK, CHUNK);
    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const buf = await slice.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const dataBase64 = btoa(binary);

      const res = await apiFetch<{ received: number; complete: boolean }>(
        `/messages/uploads/${init.uploadId}/chunk`,
        {
          method: 'POST',
          body: { offset, dataBase64 },
          headers: workspaceHeader(workspaceId),
        },
      );
      offset = res.received;
      onProgress?.(Math.round((offset / file.size) * 100));
    }

    return apiFetch(`/messages/uploads/${init.uploadId}/complete`, {
      method: 'POST',
      body: {},
      headers: workspaceHeader(workspaceId),
    });
  },
};
