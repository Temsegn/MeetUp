import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { meetingsService } from '../services/meetings/meetings.service';
import { connectDmSocket, DM_EVENTS } from '../services/messages/dm-socket';
import type { ChatMessage } from '../services/messages/messages.service';
import { ApiError, getAccessToken } from '../services/auth/auth.service';
import { useLiveMeetingPresence } from '../features/meeting/lib/live-meeting-presence';

export type NotificationKind = 'message' | 'meeting' | 'workspace' | 'system';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  kind: NotificationKind;
  href?: string;
  read?: boolean;
};

type NotificationCenterValue = {
  unreadCount: number;
  notifications: NotificationItem[];
  markMessagesSeen: () => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  pushLocalNotification: (
    title: string,
    body: string,
    extras?: { kind?: NotificationKind; href?: string },
  ) => void;
};

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

function mapServerNote(note: {
  id: string;
  title: string;
  body: string;
  kind: string;
  href?: string;
  read: boolean;
  createdAt: string;
}): NotificationItem {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt,
    kind: (note.kind as NotificationKind) || 'meeting',
    href: note.href,
    read: Boolean(note.read),
  };
}

/** Outside a call: poll every 8s. Inside a live meeting: pause HTTP /mine spam. */
const NOTIFICATION_POLL_MS = 8_000;

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace, user } = useAuth();
  const inLiveMeeting = useLiveMeetingPresence();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  /** After SESSION_EXPIRED / hard 401 — stop hammering /mine until workspace changes. */
  const pollSuspendedRef = useRef(false);

  // Fetch ALL persisted notifications (messages, meetings, workspace, …)
  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setNotifications([]);
      pollSuspendedRef.current = false;
      return;
    }

    let cancelled = false;

    // Keep a previous suspension when the call starts/stops. Resetting here
    // restarted the 8s /auth/refresh loop on every presence change.

    // Live call: pause HTTP /mine — DM socket still delivers messages instantly.
    if (inLiveMeeting) {
      return () => {
        cancelled = true;
      };
    }

    const sync = async () => {
      if (cancelled || pollSuspendedRef.current || !getAccessToken()) return;

      try {
        const serverNotes = await meetingsService.listNotifications(activeWorkspace.workspaceId);
        if (cancelled) return;

        const fromServer = serverNotes.map(mapServerNote);
        setNotifications((prev) => {
          // Keep only very recent socket/local items not yet returned by the API
          const serverKeys = new Set(
            fromServer.map((n) => `${n.kind}|${n.href ?? ''}|${n.body}|${n.createdAt.slice(0, 16)}`),
          );
          const pending = prev.filter((n) => {
            if (!n.id.startsWith('msg-') && !n.id.startsWith('local-')) return false;
            const key = `${n.kind}|${n.href ?? ''}|${n.body}|${n.createdAt.slice(0, 16)}`;
            return !serverKeys.has(key);
          });
          const merged = [...pending, ...fromServer].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return merged.slice(0, 120);
        });
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.code === 'SESSION_EXPIRED' || err.code === 'SESSION_MISSING')
        ) {
          // Stop retry spam — apiFetch already attempted refresh once.
          pollSuspendedRef.current = true;
          if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    let intervalId: ReturnType<typeof setInterval> | null = window.setInterval(
      () => void sync(),
      NOTIFICATION_POLL_MS,
    );
    void sync();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeWorkspace?.workspaceId, inLiveMeeting]);

  // Instant message notifications while online (also persisted server-side)
  useEffect(() => {
    if (!user?.id || !getAccessToken()) return;
    const socket = connectDmSocket();
    if (!socket) return;

    const onMessage = (message: ChatMessage) => {
      if (!message?.id || message.senderId === user.id) return;
      if (message.deletedAt) return;

      setNotifications((prev) => {
        const id = `msg-${message.id}`;
        if (prev.some((n) => n.id === id)) return prev;
        const body =
          message.text?.trim() ||
          (message.kind === 'voice'
            ? 'Sent a voice message'
            : message.attachments?.[0]?.name
              ? `Sent ${message.attachments[0].name}`
              : 'Sent a message');
        return [
          {
            id,
            title: 'New message',
            body,
            createdAt: message.createdAt || new Date().toISOString(),
            kind: 'message' as const,
            href: `/app/messages?c=${message.conversationId}`,
            read: false,
          },
          ...prev,
        ].slice(0, 120);
      });
    };

    socket.on(DM_EVENTS.MESSAGE, onMessage);
    return () => {
      socket.off(DM_EVENTS.MESSAGE, onMessage);
    };
  }, [user?.id]);

  const markMessagesSeen = useCallback(() => {}, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (activeWorkspace?.workspaceId) {
      void meetingsService.markNotificationsRead(activeWorkspace.workspaceId).catch(() => undefined);
    }
  }, [activeWorkspace?.workspaceId]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (activeWorkspace?.workspaceId && !id.startsWith('msg-') && !id.startsWith('local-')) {
        void meetingsService
          .markNotificationsRead(activeWorkspace.workspaceId, [id])
          .catch(() => undefined);
      }
    },
    [activeWorkspace?.workspaceId],
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const pushLocalNotification = useCallback(
    (title: string, body: string, extras?: { kind?: NotificationKind; href?: string }) => {
      setNotifications((prev) =>
        [
          {
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title,
            body,
            createdAt: new Date().toISOString(),
            kind: extras?.kind ?? 'system',
            href: extras?.href,
            read: false,
          },
          ...prev,
        ].slice(0, 120),
      );
    },
    [],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationCenterValue>(
    () => ({
      unreadCount,
      notifications,
      markMessagesSeen,
      markAllRead,
      markRead,
      clearAll,
      pushLocalNotification,
    }),
    [unreadCount, notifications, markMessagesSeen, markAllRead, markRead, clearAll, pushLocalNotification],
  );

  return (
    <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) throw new Error('useNotificationCenter must be used within NotificationCenterProvider');
  return ctx;
}
