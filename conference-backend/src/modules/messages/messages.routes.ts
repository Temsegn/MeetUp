import { Router } from 'express';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { Conversation } from '../../database/models/Conversation.model';
import { Message } from '../../database/models/Message.model';
import { Meeting } from '../../database/models/Meeting.model';
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors/AppError';
import { authRepository } from '../auth/auth.repository';
import { storage } from '../../infrastructure/storage/local.storage';
import { emitDmMessage, emitDmUpdate, emitDmRead, isUserOnline } from './messages.gateway';
import { assertConversationMember, messagesService } from './messages.service';
import {
  isSelfDirectConversation,
  sanitizeMemberIdsForCreate,
} from './messages.self-chat';

const router = Router();

const MAX_CHUNK = 512 * 1024;
const MAX_UPLOAD = 50 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'text/plain'];
const ALLOWED_MIME_EXACT = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

type UploadSession = {
  userId: string;
  workspaceId: string;
  conversationId: string;
  name: string;
  mimeType: string;
  totalBytes: number;
  received: number;
  relativeKey: string;
  tmpPath: string;
  createdAt: number;
};

const uploads = new Map<string, UploadSession>();

function mimeAllowed(mime: string): boolean {
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

async function resolveConversationName(
  type: string,
  storedName: string | undefined,
  memberIds: string[],
  currentUserId: string,
): Promise<string> {
  if (storedName?.trim()) return storedName.trim();
  if (type === 'direct') {
    const otherId = memberIds.find((id) => id !== currentUserId) ?? memberIds[0];
    if (otherId) {
      const user = await authRepository.findUserById(otherId);
      if (user?.name) return user.name;
    }
  }
  return type === 'group' ? 'Group chat' : 'Direct message';
}

// ── Conversations ────────────────────────────────────────────────────────────

router.get('/conversations', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const userId = new Types.ObjectId(req.user!.id);
  const currentUserId = String(userId);

  const convos = await Conversation.find({
    workspaceId,
    memberIds: userId,
    preview: { $nin: [null, ''] },
  })
    .sort({ lastMessageAt: -1 })
    .limit(80)
    .lean();

  const conversations = (
    await Promise.all(
      convos.map(async (c) => {
        const memberIds = c.memberIds.map(String);
        if (isSelfDirectConversation(c.type, memberIds, currentUserId)) return null;

        const name = await resolveConversationName(c.type, c.name, memberIds, currentUserId);
        const otherId =
          c.type === 'direct' ? memberIds.find((id) => id !== currentUserId) ?? memberIds[0] : undefined;
        const other = otherId ? await authRepository.findUserById(otherId) : null;
        const unread = await Message.countDocuments({
          conversationId: c._id,
          senderId: { $ne: userId },
          readBy: { $nin: [userId] },
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        });
        return {
          id: String(c._id),
          type: c.type,
          name,
          memberIds,
          lastMessageAt: c.lastMessageAt.toISOString(),
          preview: c.preview,
          avatarUrl: other?.avatarUrl ?? null,
          avatarColor: other?.avatarColor ?? null,
          peerOnline: otherId ? isUserOnline(otherId) : false,
          peerJobTitle: other?.jobTitle ?? '',
          peerDepartment: other?.department ?? '',
          unread,
        };
      }),
    )
  ).filter((c): c is NonNullable<typeof c> => c != null);

  res.json({ conversations });
});

router.post('/conversations', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as { type?: 'direct' | 'group'; name?: string; memberIds?: string[] };
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const userId = new Types.ObjectId(req.user!.id);
  const currentUserId = String(userId);
  const type = body.type ?? 'direct';

  // Reject raw bodies that only list the current user (or omit others).
  const rawIds = (body.memberIds ?? []).map(String);
  if (rawIds.length > 0 && rawIds.every((id) => id === currentUserId)) {
    throw new ValidationError('You cannot start a chat with yourself', 'SELF_CHAT_NOT_ALLOWED');
  }

  const memberIdStrings = sanitizeMemberIdsForCreate(type, currentUserId, rawIds);
  const memberIds = memberIdStrings.map((id) => new Types.ObjectId(id));

  if (type === 'direct' && memberIds.length === 2) {
    const [a, b] = memberIds;
    const existing = await Conversation.findOne({
      workspaceId,
      type: 'direct',
      memberIds: { $size: 2 },
      $and: [{ memberIds: a }, { memberIds: b }],
    }).lean();
    if (existing) {
      if (isSelfDirectConversation(existing.type, existing.memberIds, currentUserId)) {
        throw new ValidationError('You cannot start a chat with yourself', 'SELF_CHAT_NOT_ALLOWED');
      }
      const ids = existing.memberIds.map(String);
      const name = await resolveConversationName(existing.type, existing.name, ids, currentUserId);
      return res.json({ id: String(existing._id), type: existing.type, name, existing: true });
    }
  }

  let name = body.name?.trim();
  if (!name && type === 'direct') {
    const other = memberIds.find((id) => String(id) !== currentUserId);
    if (other) {
      const user = await authRepository.findUserById(String(other));
      name = user?.name;
    }
  }

  const convo = await Conversation.create({
    workspaceId,
    type,
    name,
    memberIds,
    lastMessageAt: new Date(),
    preview: '',
  });

  res.status(201).json({
    id: String(convo._id),
    type: convo.type,
    name: convo.name ?? name ?? 'Conversation',
  });
});

// ── Search ───────────────────────────────────────────────────────────────────

router.get('/search', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = String((req.query as { q?: string }).q ?? '');
  const conversationId = (req.query as { conversationId?: string }).conversationId;
  const messages = await messagesService.search(
    req.workspaceId!,
    req.user!.id,
    q,
    conversationId,
  );
  res.json({ messages });
});

// ── Shared profile ───────────────────────────────────────────────────────────

router.get('/conversations/:id/shared', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const convId = String(req.params['id'] ?? '');
  const convo = await assertConversationMember(convId, req.workspaceId!, req.user!.id);
  const currentUserId = req.user!.id;

  const msgs = await Message.find({
    conversationId: new Types.ObjectId(convId),
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const media: Array<{
    name: string;
    mimeType?: string;
    url?: string;
    kind: 'image' | 'video' | 'audio' | 'file';
    createdAt: string;
  }> = [];
  const links: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();
  const roomIds = new Set<string>();
  const urlRe = /https?:\/\/[^\s<>"']+/gi;
  const meetingRe = /\/app\/meeting\/([a-zA-Z0-9_-]+)/i;

  for (const m of msgs) {
    for (const a of m.attachments ?? []) {
      const mime = a.mimeType ?? '';
      const kind = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'file';
      media.push({
        name: a.name ?? 'file',
        mimeType: a.mimeType,
        url: a.storageKey ? `/messages/files?key=${encodeURIComponent(a.storageKey)}` : undefined,
        kind,
        createdAt: m.createdAt.toISOString(),
      });
    }
    for (const match of (m.text ?? '').matchAll(urlRe)) {
      const url = match[0].replace(/[.,);]+$/, '');
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      let title = url;
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        /* keep */
      }
      links.push({ title, url });
      const mm = url.match(meetingRe);
      if (mm?.[1]) roomIds.add(mm[1]);
    }
  }

  const peerId =
    convo.type === 'direct'
      ? convo.memberIds.map(String).find((id) => id !== currentUserId)
      : undefined;
  const peer = peerId ? await authRepository.findUserById(peerId) : null;

  let meetings: Array<{ title: string; meta: string; roomId?: string; href?: string }> = [];
  if (roomIds.size > 0) {
    const found = await Meeting.find({
      workspaceId: new Types.ObjectId(req.workspaceId!),
      roomId: { $in: [...roomIds] },
    })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(10)
      .lean();
    meetings = found.map((mt) => ({
      title: mt.title?.trim() || 'Meeting',
      meta: mt.scheduledAt
        ? new Date(mt.scheduledAt).toLocaleString()
        : mt.status === 'live'
          ? 'Live now'
          : String(mt.status),
      roomId: mt.roomId,
      href: `/app/meeting/${mt.roomId}`,
    }));
  } else if (peerId) {
    const recent = await Meeting.find({
      workspaceId: new Types.ObjectId(req.workspaceId!),
      createdBy: {
        $in: [new Types.ObjectId(currentUserId), new Types.ObjectId(peerId)],
      },
      status: { $in: ['scheduled', 'live', 'ended'] },
    })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(5)
      .lean();
    meetings = recent.map((mt) => ({
      title: mt.title?.trim() || 'Meeting',
      meta: mt.scheduledAt
        ? new Date(mt.scheduledAt).toLocaleString()
        : mt.status === 'live'
          ? 'Live now'
          : String(mt.status),
      roomId: mt.roomId,
      href: `/app/meeting/${mt.roomId}`,
    }));
  }

  const aboutParts = [peer?.jobTitle, peer?.department].filter(Boolean);
  res.json({
    peer: peer
      ? {
          userId: peerId,
          name: peer.name,
          email: peer.email,
          phone: peer.phone ?? '',
          avatarUrl: peer.avatarUrl ?? null,
          avatarColor: peer.avatarColor ?? null,
          jobTitle: peer.jobTitle ?? '',
          department: peer.department ?? '',
          online: peerId ? isUserOnline(peerId) : false,
          about: aboutParts.length ? aboutParts.join(' · ') : 'Workspace teammate',
        }
      : null,
    media: media.slice(0, 24),
    mediaTotal: media.length,
    links: links.slice(0, 20),
    meetings,
  });
});

// ── Messages REST ────────────────────────────────────────────────────────────

router.get('/conversations/:id/messages', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const convId = String(req.params['id'] ?? '');
  await assertConversationMember(convId, req.workspaceId!, req.user!.id);
  const q = req.query as Record<string, string>;
  const messages = await messagesService.listMessages(convId, {
    limit: q.limit ? parseInt(q.limit, 10) : 40,
    before: q.before,
    after: q.after,
  });
  res.json({ messages });
});

router.post('/conversations/:id/messages', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const convId = String(req.params['id'] ?? '');
  await assertConversationMember(convId, req.workspaceId!, req.user!.id);
  const body = req.body as {
    text?: string;
    clientId?: string;
    replyToId?: string;
    mentions?: string[];
    kind?: 'text' | 'voice';
    attachments?: Array<{
      name: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: number;
      thumbKey?: string;
      durationMs?: number;
      width?: number;
      height?: number;
    }>;
  };

  const message = await messagesService.sendMessage({
    conversationId: convId,
    workspaceId: req.workspaceId!,
    senderId: req.user!.id,
    clientId: body.clientId,
    text: body.text ?? '',
    replyToId: body.replyToId,
    mentions: body.mentions,
    kind: body.kind,
    attachments: body.attachments,
  });
  emitDmMessage(convId, message);
  res.status(201).json(message);
});

router.patch(
  '/conversations/:id/messages/:messageId',
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const convId = String(req.params['id'] ?? '');
    const messageId = String(req.params['messageId'] ?? '');
    await assertConversationMember(convId, req.workspaceId!, req.user!.id);
    const text = String((req.body as { text?: string }).text ?? '');
    const message = await messagesService.editMessage(convId, messageId, req.user!.id, text);
    emitDmUpdate(convId, message);
    res.json(message);
  },
);

router.delete(
  '/conversations/:id/messages/:messageId',
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const convId = String(req.params['id'] ?? '');
    const messageId = String(req.params['messageId'] ?? '');
    await assertConversationMember(convId, req.workspaceId!, req.user!.id);
    const message = await messagesService.deleteMessage(convId, messageId, req.user!.id);
    emitDmUpdate(convId, message);
    res.json(message);
  },
);

router.post(
  '/conversations/:id/messages/:messageId/react',
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const convId = String(req.params['id'] ?? '');
    const messageId = String(req.params['messageId'] ?? '');
    await assertConversationMember(convId, req.workspaceId!, req.user!.id);
    const emoji = String((req.body as { emoji?: string }).emoji ?? '');
    const message = await messagesService.react(convId, messageId, req.user!.id, emoji);
    emitDmUpdate(convId, message);
    res.json(message);
  },
);

router.post(
  '/conversations/:id/messages/:messageId/pin',
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const convId = String(req.params['id'] ?? '');
    const messageId = String(req.params['messageId'] ?? '');
    await assertConversationMember(convId, req.workspaceId!, req.user!.id);
    const pinned = Boolean((req.body as { pinned?: boolean }).pinned);
    const message = await messagesService.pin(convId, messageId, req.user!.id, pinned);
    emitDmUpdate(convId, message);
    res.json(message);
  },
);

router.post('/conversations/:id/read', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const convId = String(req.params['id'] ?? '');
  await assertConversationMember(convId, req.workspaceId!, req.user!.id);
  const ids = ((req.body as { messageIds?: string[] }).messageIds ?? []).filter((id) =>
    Types.ObjectId.isValid(id),
  );
  const marked = await messagesService.markRead(convId, ids, req.user!.id);
  await emitDmRead(convId, marked, req.user!.id);
  res.json({ ok: true });
});

// ── Chunked / resumable uploads ──────────────────────────────────────────────

router.post('/uploads/init', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as {
    conversationId?: string;
    name?: string;
    mimeType?: string;
    totalBytes?: number;
  };
  const conversationId = String(body.conversationId ?? '');
  await assertConversationMember(conversationId, req.workspaceId!, req.user!.id);

  const name = String(body.name ?? 'file').slice(0, 180);
  const mimeType = String(body.mimeType ?? 'application/octet-stream').slice(0, 120);
  const totalBytes = Number(body.totalBytes ?? 0);
  if (!mimeAllowed(mimeType)) {
    throw new ValidationError('File type not allowed', 'MIME_NOT_ALLOWED');
  }
  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || totalBytes > MAX_UPLOAD) {
    throw new ValidationError('Invalid file size (max 50MB)', 'INVALID_SIZE');
  }

  const uploadId = randomUUID();
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
  const relativeKey = `${conversationId}/${uploadId}-${safe}`;
  const tmpDir = await storage.mkdir('files', `_tmp/${req.user!.id}`);
  const tmpPath = path.join(tmpDir, `${uploadId}.part`);
  await fs.writeFile(tmpPath, Buffer.alloc(0));

  uploads.set(uploadId, {
    userId: req.user!.id,
    workspaceId: req.workspaceId!,
    conversationId,
    name,
    mimeType,
    totalBytes,
    received: 0,
    relativeKey,
    tmpPath,
    createdAt: Date.now(),
  });

  res.status(201).json({ uploadId, chunkSize: MAX_CHUNK });
});

router.post('/uploads/:uploadId/chunk', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const uploadId = String(req.params['uploadId'] ?? '');
  const session = uploads.get(uploadId);
  if (!session || session.userId !== req.user!.id) throw new NotFoundError('Upload');

  const body = req.body as { offset?: number; dataBase64?: string };
  const offset = Number(body.offset ?? 0);
  if (offset !== session.received) {
    throw new ValidationError('Chunk offset mismatch — resume from received', 'OFFSET_MISMATCH');
  }

  const raw = String(body.dataBase64 ?? '');
  const b64 = raw.includes(',') ? raw.split(',').pop()! : raw;
  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0 || buf.length > MAX_CHUNK) {
    throw new ValidationError('Invalid chunk size', 'INVALID_CHUNK');
  }
  if (session.received + buf.length > session.totalBytes) {
    throw new ValidationError('Upload exceeds declared size', 'SIZE_EXCEEDED');
  }

  await fs.appendFile(session.tmpPath, buf);
  session.received += buf.length;
  res.json({ received: session.received, complete: session.received >= session.totalBytes });
});

router.post('/uploads/:uploadId/complete', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const uploadId = String(req.params['uploadId'] ?? '');
  const session = uploads.get(uploadId);
  if (!session || session.userId !== req.user!.id) throw new NotFoundError('Upload');
  if (session.received !== session.totalBytes) {
    throw new ValidationError('Upload incomplete', 'INCOMPLETE');
  }

  const data = await fs.readFile(session.tmpPath);
  const storageKey = await storage.put('files', session.relativeKey, data);
  await fs.unlink(session.tmpPath).catch(() => {});
  uploads.delete(uploadId);

  res.json({
    name: session.name,
    mimeType: session.mimeType,
    sizeBytes: session.totalBytes,
    storageKey,
    url: `/messages/files?key=${encodeURIComponent(storageKey)}`,
  });
});

// ── Authenticated file download ──────────────────────────────────────────────

router.get('/files', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const storageKey = decodeURIComponent(String((req.query as { key?: string }).key ?? ''));
  if (!storageKey.startsWith('files/')) throw new ForbiddenError();
  const relativeKey = storageKey.slice('files/'.length);
  const conversationId = relativeKey.split('/')[0];
  if (!conversationId || !Types.ObjectId.isValid(conversationId)) throw new NotFoundError('File');

  await assertConversationMember(conversationId, req.workspaceId!, req.user!.id);

  const msg = await Message.findOne({
    conversationId: new Types.ObjectId(conversationId),
    $or: [{ 'attachments.storageKey': storageKey }, { 'attachments.thumbKey': storageKey }],
  })
    .select('attachments')
    .lean();

  // Allow freshly uploaded keys that are not yet attached (upload complete → send race)
  let mime = 'application/octet-stream';
  let name = 'file';
  if (msg) {
    const meta =
      msg.attachments.find((a) => a.storageKey === storageKey || a.thumbKey === storageKey) ??
      null;
    if (meta) {
      mime = meta.mimeType || mime;
      name = meta.name || name;
    }
  }

  const buf = await storage.get('files', relativeKey);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(buf);
});

// Cleanup stale upload sessions periodically
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, s] of uploads) {
    if (s.createdAt < cutoff) {
      void fs.unlink(s.tmpPath).catch(() => {});
      uploads.delete(id);
    }
  }
}, 15 * 60 * 1000).unref?.();

export const messagesRouter = router;
