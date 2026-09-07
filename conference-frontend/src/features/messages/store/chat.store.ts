import { create } from 'zustand';
import type { ChatMessage, Conversation } from '../../../services/messages/messages.service';

type TypingState = Record<string, { userId: string; name: string; until: number }>;

type ChatState = {
  conversations: Conversation[];
  messagesByConv: Record<string, ChatMessage[]>;
  presence: Record<string, boolean>;
  typing: TypingState;
  activeConversationId: string | null;
  hasMoreByConv: Record<string, boolean>;
  loadingOlder: boolean;

  setConversations: (items: Conversation[]) => void;
  upsertConversationPreview: (
    conversationId: string,
    preview: string,
    lastMessageAt: string,
    opts?: { bumpUnread?: boolean; clearUnread?: boolean },
  ) => void;
  clearUnread: (conversationId: string) => void;
  bumpUnread: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: ChatMessage[], hasMore?: boolean) => void;
  prependMessages: (conversationId: string, older: ChatMessage[], hasMore: boolean) => void;
  upsertMessage: (message: ChatMessage) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  replaceOptimistic: (clientId: string, message: ChatMessage) => void;
  markMessageFailed: (clientId: string) => void;
  applyRead: (conversationId: string, messageIds: string[], readerId: string) => void;
  applyDelivered: (conversationId: string, messageIds: string[], userId: string) => void;
  setPresence: (userId: string, online: boolean) => void;
  setTyping: (conversationId: string, userId: string, name: string, typing: boolean) => void;
  setLoadingOlder: (v: boolean) => void;
};

function mergeUnique(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) {
    const prev = map.get(m.id);
    map.set(m.id, prev ? { ...prev, ...m, pending: false, failed: false } : m);
    if (m.clientId) {
      for (const [id, cur] of map) {
        if (cur.clientId === m.clientId && id !== m.id && cur.pending) map.delete(id);
      }
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConv: {},
  presence: {},
  typing: {},
  activeConversationId: null,
  hasMoreByConv: {},
  loadingOlder: false,

  setConversations: (items) => set({ conversations: items }),

  upsertConversationPreview: (conversationId, preview, lastMessageAt, opts) =>
    set((s) => ({
      conversations: [...s.conversations]
        .map((c) => {
          if (c.id !== conversationId) return c;
          let unread = c.unread ?? 0;
          if (opts?.clearUnread) unread = 0;
          else if (opts?.bumpUnread) unread += 1;
          return { ...c, preview, lastMessageAt, unread };
        })
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        ),
    })),

  clearUnread: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread: 0 } : c,
      ),
    })),

  bumpUnread: (conversationId) =>
    set((s) => {
      const exists = s.conversations.some((c) => c.id === conversationId);
      if (!exists) {
        // Conversation not in list yet — keep a stub so the badge can show after refresh merges
        return {
          conversations: [
            {
              id: conversationId,
              type: 'direct' as const,
              name: 'New message',
              memberIds: [],
              lastMessageAt: new Date().toISOString(),
              preview: 'New message',
              unread: 1,
            },
            ...s.conversations,
          ],
        };
      }
      return {
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread: (c.unread ?? 0) + 1 } : c,
        ),
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages, hasMore = true) =>
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [conversationId]: mergeUnique([], messages),
      },
      hasMoreByConv: { ...s.hasMoreByConv, [conversationId]: hasMore },
    })),

  prependMessages: (conversationId, older, hasMore) =>
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [conversationId]: mergeUnique(older, s.messagesByConv[conversationId] ?? []),
      },
      hasMoreByConv: { ...s.hasMoreByConv, [conversationId]: hasMore },
      loadingOlder: false,
    })),

  upsertMessage: (message) => {
    const cid = message.conversationId;
    if (message.deletedAt) {
      get().removeMessage(cid, message.id);
      return;
    }
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [cid]: mergeUnique(s.messagesByConv[cid] ?? [], [message]),
      },
    }));
    const preview =
      message.text ||
      (message.kind === 'voice'
        ? '🎤 Voice message'
        : message.kind === 'call'
          ? '📞 Call'
          : message.attachments[0]?.name
            ? `📎 ${message.attachments[0].name}`
            : 'New message');
    get().upsertConversationPreview(cid, preview, message.createdAt);
  },

  removeMessage: (conversationId, messageId) =>
    set((s) => {
      const list = (s.messagesByConv[conversationId] ?? []).filter((m) => m.id !== messageId);
      const last = list[list.length - 1];
      const preview = last
        ? last.text ||
          (last.attachments[0]?.name ? `📎 ${last.attachments[0].name}` : 'Conversation')
        : '';
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: list,
        },
        conversations: s.conversations.map((c) =>
          c.id === conversationId && last
            ? { ...c, preview, lastMessageAt: last.createdAt }
            : c,
        ),
      };
    }),

  replaceOptimistic: (clientId, message) =>
    set((s) => {
      const cid = message.conversationId;
      const list = (s.messagesByConv[cid] ?? []).filter(
        (m) => !(m.pending && m.clientId === clientId),
      );
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [cid]: mergeUnique(list, [message]),
        },
      };
    }),

  markMessageFailed: (clientId) =>
    set((s) => {
      const next: Record<string, ChatMessage[]> = {};
      for (const [cid, list] of Object.entries(s.messagesByConv)) {
        next[cid] = list.map((m) =>
          m.clientId === clientId ? { ...m, pending: false, failed: true } : m,
        );
      }
      return { messagesByConv: next };
    }),

  applyRead: (conversationId, messageIds, readerId) =>
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [conversationId]: (s.messagesByConv[conversationId] ?? []).map((m) =>
          messageIds.includes(m.id) && !m.readBy.includes(readerId)
            ? {
                ...m,
                readBy: [...m.readBy, readerId],
                deliveredTo: m.deliveredTo.includes(readerId)
                  ? m.deliveredTo
                  : [...m.deliveredTo, readerId],
              }
            : m,
        ),
      },
    })),

  applyDelivered: (conversationId, messageIds, userId) =>
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [conversationId]: (s.messagesByConv[conversationId] ?? []).map((m) =>
          messageIds.includes(m.id) && !m.deliveredTo.includes(userId)
            ? { ...m, deliveredTo: [...m.deliveredTo, userId] }
            : m,
        ),
      },
    })),

  setPresence: (userId, online) =>
    set((s) => ({ presence: { ...s.presence, [userId]: online } })),

  setTyping: (conversationId, userId, name, typing) =>
    set((s) => {
      const key = `${conversationId}:${userId}`;
      if (!typing) {
        const next = { ...s.typing };
        delete next[key];
        return { typing: next };
      }
      return {
        typing: {
          ...s.typing,
          [key]: { userId, name, until: Date.now() + 3000 },
        },
      };
    }),

  setLoadingOlder: (v) => set({ loadingOlder: v }),
}));
