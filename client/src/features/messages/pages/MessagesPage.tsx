import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Edit,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  Video,
} from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationCenter } from '../../../contexts/NotificationCenterContext';
import {
  messagesService,
  type ChatMessage,
} from '../../../services/messages/messages.service';
import { emitAck, DM_EVENTS } from '../../../services/messages/dm-socket';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { cn } from '../../../lib/cn';
import { ContactDetailPanel } from '../components/ContactDetailPanel';
import { MessagesPageSkeleton } from '../components/MessagesSkeletons';
import { VirtualizedMessageList } from '../components/VirtualizedMessageList';
import { ChatComposer } from '../components/ChatComposer';
import { CallOverlay } from '../components/CallOverlay';
import { PinnedMessagesBar } from '../components/PinnedMessagesBar';
import { useDmRealtime } from '../hooks/useDmRealtime';
import { useChatCall } from '../hooks/useChatCall';
import { useChatStore } from '../store/chat.store';

type ListFilter = 'All' | 'Direct' | 'Groups';

function formatConvTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function clientId(): string {
  return crypto.randomUUID();
}

export function MessagesPage() {
  const { activeWorkspace, user } = useAuth();
  const { markMessagesSeen } = useNotificationCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState<WorkspaceDirectoryMember[]>([]);
  const [draftPeer, setDraftPeer] = useState<WorkspaceDirectoryMember | null>(null);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ChatMessage[] | null>(null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listFilter, setListFilter] = useState<ListFilter>('All');
  const [showDetail, setShowDetail] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const selectedId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const messagesByConv = useChatStore((s) => s.messagesByConv);
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const replaceOptimistic = useChatStore((s) => s.replaceOptimistic);
  const markMessageFailed = useChatStore((s) => s.markMessageFailed);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const presence = useChatStore((s) => s.presence);
  const typing = useChatStore((s) => s.typing);
  const hasMoreByConv = useChatStore((s) => s.hasMoreByConv);
  const loadingOlder = useChatStore((s) => s.loadingOlder);
  const setLoadingOlder = useChatStore((s) => s.setLoadingOlder);

  useDmRealtime(Boolean(activeWorkspace?.workspaceId), user?.id);
  const call = useChatCall(user?.id);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );
  const messages = (selectedId ? messagesByConv[selectedId] ?? [] : []).filter(
    (m) => !m.deletedAt,
  );

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    messagesService
      .listConversations(activeWorkspace.workspaceId)
      .then(async (items) => {
        const safe = items.filter((c) => {
          if (c.type !== 'direct') return true;
          const others = (c.memberIds ?? []).filter((id: string) => id !== user?.id);
          return others.length > 0;
        });
        setConversations(safe);
        const deepLinkUser = searchParams.get('user');
        const deepLinkConv = searchParams.get('c');
        if (deepLinkUser && !deepLinkConv) {
          if (deepLinkUser === user?.id) {
            setSearchParams({}, { replace: true });
            setActiveConversation(safe[0]?.id ?? null);
            return;
          }
          const existing = safe.find(
            (c) =>
              c.type === 'direct' &&
              (c.memberIds ?? []).includes(deepLinkUser) &&
              Boolean(user?.id && (c.memberIds ?? []).includes(user.id)),
          );
          if (existing) {
            setDraftPeer(null);
            setActiveConversation(existing.id);
            setMobilePane('chat');
            setSearchParams({ c: existing.id }, { replace: true });
            return;
          }
          const directoryRows = await workspaceService
            .listDirectory(activeWorkspace.workspaceId)
            .catch(() => []);
          const peer =
            directoryRows.find((m) => m.userId === deepLinkUser && m.userId !== user?.id) ?? null;
          if (peer) {
            setDraftPeer(peer);
            setActiveConversation(null);
            setMobilePane('chat');
            setSearchParams({}, { replace: true });
            return;
          }
          setSearchParams({}, { replace: true });
        }
        setActiveConversation(deepLinkConv ?? safe[0]?.id ?? null);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) return;
    workspaceService
      .listDirectory(activeWorkspace.workspaceId)
      .then(setDirectory)
      .catch(() => setDirectory([]));
  }, [activeWorkspace?.workspaceId]);

  useEffect(() => {
    markMessagesSeen();
  }, [markMessagesSeen, selectedId]);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !selectedId) return;
    messagesService
      .getMessages(activeWorkspace.workspaceId, selectedId, { limit: 40 })
      .then((msgs) => {
        setMessages(selectedId, msgs.filter((m) => !m.deletedAt), msgs.length >= 40);
        clearUnread(selectedId);
        const unread = msgs.filter((m) => m.senderId !== user?.id && !m.readBy.includes(user?.id ?? ''));
        if (unread.length) {
          void messagesService.markRead(
            activeWorkspace.workspaceId,
            selectedId,
            unread.map((m) => m.id),
          );
          void emitAck(DM_EVENTS.READ, {
            conversationId: selectedId,
            messageIds: unread.map((m) => m.id),
          }).catch(() => {});
        }
        const deliver = msgs.filter((m) => m.senderId !== user?.id);
        if (deliver.length) {
          void emitAck(DM_EVENTS.DELIVERED, {
            conversationId: selectedId,
            messageIds: deliver.map((m) => m.id),
          }).catch(() => {});
        }
      })
      .catch(() => setMessages(selectedId, [], false));
  }, [activeWorkspace?.workspaceId, selectedId, setMessages, clearUnread, user?.id]);

  const loadOlder = useCallback(() => {
    if (!activeWorkspace?.workspaceId || !selectedId || loadingOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    messagesService
      .getMessages(activeWorkspace.workspaceId, selectedId, {
        limit: 40,
        before: oldest.createdAt,
      })
      .then((older) => prependMessages(selectedId, older, older.length >= 40))
      .catch(() => setLoadingOlder(false));
  }, [
    activeWorkspace?.workspaceId,
    selectedId,
    loadingOlder,
    messages,
    prependMessages,
    setLoadingOlder,
  ]);

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2 || !activeWorkspace?.workspaceId) {
      setSearchHits(null);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      messagesService
        .search(activeWorkspace.workspaceId, q)
        .then((hits) => startTransition(() => setSearchHits(hits)))
        .catch(() => setSearchHits([]));
    }, 300);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query, activeWorkspace?.workspaceId]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (listFilter === 'Direct') list = list.filter((c) => c.type !== 'group');
    if (listFilter === 'Groups') list = list.filter((c) => c.type === 'group');
    const q = query.trim().toLowerCase();
    if (!q || searchHits) return list;
    return list.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
    );
  }, [conversations, query, listFilter, searchHits]);

  const startedPeerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conversations) {
      for (const id of c.memberIds ?? []) {
        if (id !== user?.id) ids.add(id);
      }
    }
    return ids;
  }, [conversations, user?.id]);

  const peopleResults = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (q.length < 1) return [];
    return directory
      .filter((member) => member.userId !== user?.id)
      .filter((member) => !startedPeerIds.has(member.userId))
      .filter(
        (member) =>
          member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [directory, peopleQuery, user?.id, startedPeerIds]);

  const directoryWithoutSelf = useMemo(
    () => directory.filter((m) => m.userId !== user?.id),
    [directory, user?.id],
  );

  const peerMember = useMemo(() => {
    if (draftPeer) return draftPeer;
    if (!selected || selected.type === 'group') return null;
    const otherId = (selected.memberIds ?? []).find((id: string) => id !== user?.id);
    if (!otherId || otherId === user?.id) return null;
    return directoryWithoutSelf.find((m) => m.userId === otherId) ?? null;
  }, [draftPeer, selected, directoryWithoutSelf, user?.id]);

  const peerIds = useMemo(() => {
    if (!selected) return [] as string[];
    return (selected.memberIds ?? []).filter((id: string) => id !== user?.id);
  }, [selected, user?.id]);

  const peerOnline = peerMember
    ? presence[peerMember.userId] ?? selected?.peerOnline ?? false
    : false;

  const typingLabel = useMemo(() => {
    if (!selectedId) return null;
    const active = Object.entries(typing)
      .filter(([k, t]) => k.startsWith(`${selectedId}:`) && t.until > Date.now())
      .map(([, t]) => t);
    if (!active.length) return null;
    return `${active.map((t) => t.name).join(', ')} typing…`;
  }, [typing, selectedId]);

  const ensureConversation = async (): Promise<string | null> => {
    if (!activeWorkspace?.workspaceId) return null;
    if (selectedId) return selectedId;
    if (!draftPeer || draftPeer.userId === user?.id) return null;

    const existingLocal = conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.memberIds ?? []).includes(draftPeer.userId) &&
        (c.memberIds ?? []).includes(user!.id),
    );
    if (existingLocal) {
      setActiveConversation(existingLocal.id);
      setDraftPeer(null);
      setSearchParams({ c: existingLocal.id }, { replace: true });
      return existingLocal.id;
    }

    const created = await messagesService.createConversation(activeWorkspace.workspaceId, {
      type: 'direct',
      memberIds: [draftPeer.userId],
      name: draftPeer.name,
    });
    setActiveConversation(created.id);
    setDraftPeer(null);
    setSearchParams({ c: created.id }, { replace: true });
    // Refresh list so we don't show a duplicate row after create-or-reuse
    const next = await messagesService.listConversations(activeWorkspace.workspaceId).catch(() => null);
    if (next) {
      setConversations(
        next.filter((c) => {
          if (c.type !== 'direct') return true;
          const others = (c.memberIds ?? []).filter((id: string) => id !== user?.id);
          return others.length > 0;
        }),
      );
    }
    return created.id;
  };

  const sendPayload = async (payload: {
    text: string;
    files: File[];
    voice?: { blob: Blob; durationMs: number };
  }) => {
    if (!activeWorkspace?.workspaceId || !user?.id) return;
    const conversationId = await ensureConversation();
    if (!conversationId) return;

    const cid = clientId();
    const attachments = [];
    try {
      for (const file of payload.files) {
        const uploaded = await messagesService.uploadFile(
          activeWorkspace.workspaceId,
          conversationId,
          file,
          setUploadProgress,
        );
        attachments.push(uploaded);
      }
      if (payload.voice) {
        const voiceFile = new File([payload.voice.blob], `voice-${Date.now()}.webm`, {
          type: payload.voice.blob.type || 'audio/webm',
        });
        const uploaded = await messagesService.uploadFile(
          activeWorkspace.workspaceId,
          conversationId,
          voiceFile,
          setUploadProgress,
        );
        attachments.push({ ...uploaded, durationMs: payload.voice.durationMs });
      }
      setUploadProgress(null);

      const optimistic: ChatMessage = {
        id: `tmp-${cid}`,
        conversationId,
        senderId: user.id,
        clientId: cid,
        kind: payload.voice ? 'voice' : 'text',
        text: payload.text,
        attachments,
        replyToId: replyTo?.id ?? null,
        mentions: [],
        reactions: [],
        deliveredTo: [user.id],
        readBy: [user.id],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      upsertMessage(optimistic);
      setReplyTo(null);

      try {
        const res = await emitAck<{ message: ChatMessage }>(DM_EVENTS.SEND, {
          conversationId,
          clientId: cid,
          text: payload.text,
          replyToId: replyTo?.id ?? null,
          kind: payload.voice ? 'voice' : 'text',
          attachments: attachments.map((a) => ({
            name: a.name,
            mimeType: a.mimeType ?? 'application/octet-stream',
            storageKey: a.storageKey!,
            sizeBytes: a.sizeBytes,
            thumbKey: a.thumbKey,
            durationMs: a.durationMs,
          })),
        });
        if (res.message) replaceOptimistic(cid, res.message);
      } catch {
        const msg = await messagesService.sendMessage(activeWorkspace.workspaceId, conversationId, {
          text: payload.text,
          clientId: cid,
          replyToId: replyTo?.id,
          kind: payload.voice ? 'voice' : 'text',
          attachments,
        });
        replaceOptimistic(cid, msg);
      }

      const next = await messagesService.listConversations(activeWorkspace.workspaceId);
      setConversations(next);
    } catch {
      setUploadProgress(null);
      markMessageFailed(cid);
    }
  };

  const openDraftChat = (member: WorkspaceDirectoryMember) => {
    if (member.userId === user?.id) return;
    const existing = conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.memberIds ?? []).includes(member.userId) &&
        Boolean(user?.id && (c.memberIds ?? []).includes(user.id)),
    );
    setPickerOpen(false);
    setPeopleQuery('');
    setMobilePane('chat');
    if (existing) {
      setDraftPeer(null);
      setActiveConversation(existing.id);
      setSearchParams({ c: existing.id }, { replace: true });
      return;
    }
    setDraftPeer(member);
    setActiveConversation(null);
    setSearchParams({}, { replace: true });
  };

  const startCall = async (callType: 'audio' | 'video') => {
    const conversationId = await ensureConversation();
    const peer = peerMember;
    if (!conversationId || !peer) return;
    await call.startCall({
      conversationId,
      peerUserId: peer.userId,
      peerName: peer.name,
      callType,
    });
  };

  const activeTitle = draftPeer?.name || selected?.name || 'Conversation';
  const showingComposer = Boolean(selected || draftPeer);
  const contactName = peerMember?.name ?? activeTitle;
  const contactEmail = peerMember?.email ?? null;
  const contactAvatar = draftPeer?.avatarUrl ?? peerMember?.avatarUrl ?? selected?.avatarUrl;
  const contactColor = draftPeer?.avatarColor ?? peerMember?.avatarColor ?? selected?.avatarColor;
  const contactAbout =
    peerMember?.jobTitle || peerMember?.department
      ? [peerMember.jobTitle, peerMember.department].filter(Boolean).join(' · ')
      : peerMember
        ? peerMember.role === 'owner'
          ? 'Workspace owner'
          : peerMember.role === 'admin'
            ? 'Admin'
            : 'Member'
        : null;
  const detailOpen = showDetail && showingComposer;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AppHeader
        title="Messages"
        subtitle="Realtime team messaging with files, voice, and calls."
        className="shrink-0"
      />

      {loading ? (
        <MessagesPageSkeleton />
      ) : (
        <div
        className={cn(
          'grid min-h-0 flex-1 gap-3',
          detailOpen
            ? 'lg:grid-cols-[280px_minmax(0,1fr)_280px]'
            : 'lg:grid-cols-[280px_minmax(0,1fr)]',
        )}
      >
          <section
            className={cn(
              'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] ring-1 ring-[#016BE6]/[0.04]',
              mobilePane === 'chat' ? 'hidden lg:flex' : 'flex',
            )}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-[#F1F4F8] p-2.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="h-8 w-full rounded-lg border border-[#E1E7EE] bg-white pl-8 pr-2 text-[11px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-1 focus:ring-[#016BE6]/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#016BE6] text-white hover:bg-[#0056EF]"
                aria-label="New message"
              >
                <Edit className="size-3.5" />
              </button>
            </div>

            <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-[#F1F4F8] px-2 py-1.5">
              {(['All', 'Direct', 'Groups'] as ListFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setListFilter(tab)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold',
                    listFilter === tab
                      ? 'bg-[#E8F1FF] text-[#016BE6]'
                      : 'text-[#6F7B8C] hover:bg-[#F1F5F9]',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {searchHits ? (
                <div className="space-y-1 p-1">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Message results
                  </p>
                  {searchHits.length === 0 ? (
                    <p className="px-2 py-4 text-center text-[12px] text-[#8A94A6]">No matches</p>
                  ) : (
                    searchHits.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        onClick={() => {
                          setActiveConversation(hit.conversationId);
                          setMobilePane('chat');
                          setSearchParams({ c: hit.conversationId }, { replace: true });
                          setSearchHits(null);
                          setQuery('');
                        }}
                        className="mb-0.5 w-full rounded-lg px-2 py-2 text-left hover:bg-[#F8FAFC]"
                      >
                        <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                          {hit.text.slice(0, 80) || 'Attachment'}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {new Date(hit.createdAt).toLocaleString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {draftPeer ? (
                <button
                  type="button"
                  className="mb-0.5 flex w-full items-center gap-2.5 rounded-lg bg-[#E8F1FF] px-2 py-2 text-left"
                >
                  <UserAvatar
                    name={draftPeer.name}
                    avatarUrl={draftPeer.avatarUrl}
                    avatarColor={draftPeer.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{draftPeer.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#6F7B8C]">
                      New chat — send a message to start
                    </p>
                  </div>
                </button>
              ) : null}

              {!searchHits && filtered.length === 0 && !draftPeer ? (
                <p className="px-2 py-6 text-center text-[12px] text-[#8A94A6]">
                  No conversations yet. Compose to start a chat.
                </p>
              ) : (
                !searchHits &&
                filtered.map((conv) => {
                  const otherId = conv.memberIds.find((id: string) => id !== user?.id);
                  const online = otherId ? presence[otherId] ?? conv.peerOnline : false;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setDraftPeer(null);
                        setActiveConversation(conv.id);
                        clearUnread(conv.id);
                        setMobilePane('chat');
                        setSearchParams({ c: conv.id }, { replace: true });
                      }}
                      className={cn(
                        'mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                        selectedId === conv.id && !draftPeer ? 'bg-[#E8F1FF]' : 'hover:bg-[#F8FAFC]',
                      )}
                    >
                      <div className="relative">
                        <UserAvatar
                          name={conv.name || 'Conversation'}
                          avatarUrl={conv.avatarUrl}
                          avatarColor={conv.avatarColor}
                          size="md"
                        />
                        {online && conv.type === 'direct' ? (
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-[12px] text-[#151D2B]',
                                (conv.unread ?? 0) > 0 ? 'font-bold' : 'font-semibold',
                              )}
                            >
                              {conv.name || 'Conversation'}
                            </span>
                            {(conv.unread ?? 0) > 0 ? (
                              <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#016BE6] px-1.5 text-[10px] font-bold leading-none text-white">
                                {conv.unread! > 99 ? '99+' : conv.unread}
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[10px] text-[#94A3B8]">
                            {formatConvTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'mt-0.5 truncate text-[11px]',
                            (conv.unread ?? 0) > 0
                              ? 'font-semibold text-[#334155]'
                              : 'text-[#6F7B8C]',
                          )}
                        >
                          {conv.preview || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section
            className={cn(
              'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8ECF1] bg-gradient-to-b from-white to-[#F8FBFF] shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] ring-1 ring-[#016BE6]/[0.04]',
              mobilePane === 'list' ? 'hidden lg:flex' : 'flex',
            )}
          >
            {!showingComposer ? (
              <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#E8F1FF] text-[#016BE6]">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="text-[14px] font-semibold text-[#151D2B]">Select a conversation</h3>
                <p className="mt-1 max-w-[240px] text-[12px] text-[#6F7B8C]">
                  Choose a chat from the list, or compose a new message to get started.
                </p>
              </div>
            ) : (
              <>
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F1F4F8] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobilePane('list')}
                      className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#6F7B8C] hover:bg-[#F1F5F9] lg:hidden"
                    >
                      Back
                    </button>
                    <UserAvatar
                      name={activeTitle}
                      avatarUrl={contactAvatar}
                      avatarColor={contactColor}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-[13px] font-semibold text-[#151D2B]">
                        {activeTitle}
                      </h3>
                      <p className="text-[11px] text-[#6F7B8C]">
                        {typingLabel
                          ? typingLabel
                          : draftPeer
                            ? 'New direct message'
                            : peerOnline
                              ? 'Online'
                              : selected?.type === 'group'
                                ? 'Group chat'
                                : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void startCall('video')}
                      className="rounded-md p-1.5 text-[#6F7B8C] hover:bg-[#F1F5F9]"
                      aria-label="Video call"
                      disabled={!peerMember}
                    >
                      <Video className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void startCall('audio')}
                      className="rounded-md p-1.5 text-[#6F7B8C] hover:bg-[#F1F5F9]"
                      aria-label="Audio call"
                      disabled={!peerMember}
                    >
                      <Phone className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDetail((v) => !v)}
                      className={cn(
                        'rounded-md p-1.5 hover:bg-[#F1F5F9]',
                        detailOpen ? 'bg-[#E8F1FF] text-[#016BE6]' : 'text-[#6F7B8C]',
                      )}
                      aria-label={detailOpen ? 'Hide contact profile' : 'Show contact profile'}
                      aria-pressed={detailOpen}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                </header>

                {draftPeer && messages.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-[#8A94A6]">
                    Send the first message to start this conversation with {draftPeer.name}.
                  </p>
                ) : (
                  <>
                    <PinnedMessagesBar
                      messages={messages}
                      onUnpin={(m) => {
                        if (!selectedId) return;
                        void emitAck(DM_EVENTS.PIN, {
                          conversationId: selectedId,
                          messageId: m.id,
                          pinned: false,
                        }).catch(() =>
                          messagesService.pin(
                            activeWorkspace?.workspaceId,
                            selectedId,
                            m.id,
                            false,
                          ),
                        );
                      }}
                    />
                  <VirtualizedMessageList
                    messages={messages}
                    currentUserId={user?.id}
                    peerIds={peerIds}
                    workspaceId={activeWorkspace?.workspaceId}
                    conversationId={selectedId}
                    hasMore={selectedId ? hasMoreByConv[selectedId] : false}
                    loadingOlder={loadingOlder}
                    onLoadOlder={loadOlder}
                    onReply={(m) => {
                      setEditingMessage(null);
                      setReplyTo(m);
                    }}
                    onReact={(m, emoji) => {
                      if (!activeWorkspace?.workspaceId || !selectedId) return;
                      void emitAck(DM_EVENTS.REACT, {
                        conversationId: selectedId,
                        messageId: m.id,
                        emoji,
                      }).catch(() =>
                        messagesService.react(
                          activeWorkspace.workspaceId,
                          selectedId,
                          m.id,
                          emoji,
                        ),
                      );
                    }}
                    onEdit={(m) => {
                      setReplyTo(null);
                      setEditingMessage(m);
                    }}
                    onDelete={(m) => {
                      if (!selectedId || !window.confirm('Delete this message?')) return;
                      void emitAck(DM_EVENTS.DELETE, {
                        conversationId: selectedId,
                        messageId: m.id,
                      }).catch(() =>
                        messagesService.deleteMessage(
                          activeWorkspace?.workspaceId,
                          selectedId,
                          m.id,
                        ),
                      );
                    }}
                    onPin={(m) => {
                      if (!selectedId) return;
                      void emitAck(DM_EVENTS.PIN, {
                        conversationId: selectedId,
                        messageId: m.id,
                        pinned: !m.pinnedAt,
                      }).catch(() =>
                        messagesService.pin(
                          activeWorkspace?.workspaceId,
                          selectedId,
                          m.id,
                          !m.pinnedAt,
                        ),
                      );
                    }}
                  />
                  </>
                )}

                <ChatComposer
                  disabled={!activeWorkspace?.workspaceId}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(null)}
                  editing={editingMessage}
                  onClearEdit={() => setEditingMessage(null)}
                  onSaveEdit={(messageId, text) => {
                    if (!selectedId) return;
                    void emitAck(DM_EVENTS.EDIT, {
                      conversationId: selectedId,
                      messageId,
                      text,
                    }).catch(() =>
                      messagesService.editMessage(
                        activeWorkspace?.workspaceId,
                        selectedId,
                        messageId,
                        text,
                      ),
                    );
                    setEditingMessage(null);
                  }}
                  uploadProgress={uploadProgress}
                  conversationId={selectedId}
                  onSend={(p) => void sendPayload(p)}
                />
              </>
            )}
          </section>

          {detailOpen ? (
            <ContactDetailPanel
              className="hidden min-h-0 lg:flex"
              conversationId={selectedId}
              workspaceId={activeWorkspace?.workspaceId}
              name={contactName}
              email={contactEmail}
              avatarUrl={contactAvatar}
              avatarColor={contactColor}
              about={contactAbout}
              online={peerOnline}
              isGroup={selected?.type === 'group' && !draftPeer}
              onVideoCall={() => void startCall('video')}
              onAudioCall={() => void startCall('audio')}
            />
          ) : null}
        </div>
      )}

      <CallOverlay call={call} />

      {pickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#151D2B]">Start a chat</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-[12px] font-semibold text-[#64748B]"
              >
                Close
              </button>
            </div>
            <input
              type="search"
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search people…"
              className="mb-3 h-10 w-full rounded-xl border border-[#E1E7EE] px-3 text-[13px] outline-none focus:border-[#016BE6]"
            />
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {peopleResults.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => {
                    openDraftChat(member);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#F8FAFC]"
                >
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    avatarColor={member.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#151D2B]">{member.name}</p>
                    <p className="truncate text-[11px] text-[#6F7B8C]">{member.email}</p>
                  </div>
                </button>
              ))}
              {peopleQuery && peopleResults.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[#8A94A6]">No people found</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
