import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const DmJoinSchema = z.object({
  conversationId: objectId,
  /** ISO timestamp — server returns messages created after this for reconnect sync */
  since: z.string().min(1).optional(),
});

export const DmLeaveSchema = z.object({
  conversationId: objectId,
});

export const DmTypingSchema = z.object({
  conversationId: objectId,
  typing: z.boolean(),
});

export const DmReadSchema = z.object({
  conversationId: objectId,
  messageIds: z.array(objectId).max(100).default([]),
});

export const DmDeliveredSchema = z.object({
  conversationId: objectId,
  messageIds: z.array(objectId).max(100).default([]),
});

export const DmSendSchema = z.object({
  conversationId: objectId,
  clientId: z.string().uuid().optional(),
  text: z.string().max(8000).default(''),
  replyToId: objectId.optional().nullable(),
  mentions: z.array(objectId).max(20).optional(),
  kind: z.enum(['text', 'voice']).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().max(180),
        mimeType: z.string().max(120),
        storageKey: z.string().max(400),
        sizeBytes: z.number().int().nonnegative(),
        thumbKey: z.string().max(400).optional(),
        durationMs: z.number().int().nonnegative().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .max(5)
    .optional(),
});

export const DmEditSchema = z.object({
  conversationId: objectId,
  messageId: objectId,
  text: z.string().min(1).max(8000),
});

export const DmDeleteSchema = z.object({
  conversationId: objectId,
  messageId: objectId,
});

export const DmReactSchema = z.object({
  conversationId: objectId,
  messageId: objectId,
  emoji: z.string().min(1).max(32),
});

export const DmPinSchema = z.object({
  conversationId: objectId,
  messageId: objectId,
  pinned: z.boolean(),
});

export const DmForwardSchema = z.object({
  sourceConversationId: objectId,
  messageId: objectId,
  targetConversationId: objectId,
  clientId: z.string().uuid().optional(),
});

export const DmCallInviteSchema = z.object({
  conversationId: objectId,
  toUserId: objectId,
  callType: z.enum(['audio', 'video']),
  callId: z.string().uuid(),
  sdp: z.unknown().optional(),
});

export const DmCallPeerSchema = z.object({
  conversationId: objectId,
  toUserId: objectId,
  callId: z.string().uuid(),
  sdp: z.unknown().optional(),
  reason: z.string().max(80).optional(),
});

export const DmCallSignalSchema = z.object({
  conversationId: objectId,
  toUserId: objectId,
  callId: z.string().uuid(),
  candidate: z.unknown().optional(),
  sdp: z.unknown().optional(),
  signalType: z.enum(['ice', 'sdp', 'renegotiate']).optional(),
});

export const DmCallHangupSchema = z.object({
  conversationId: objectId,
  toUserId: objectId,
  callId: z.string().uuid(),
  durationSec: z.number().int().nonnegative().optional(),
  status: z.enum(['completed', 'missed', 'rejected', 'cancelled']).optional(),
  callType: z.enum(['audio', 'video']).optional(),
});

export type DmSendInput = z.infer<typeof DmSendSchema>;
