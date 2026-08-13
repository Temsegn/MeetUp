import { z } from 'zod';

// ---------------------------------------------------------------------------
// Re-usable primitives
// ---------------------------------------------------------------------------

const roomId      = z.string().min(1).max(100).trim();
const transportId = z.string().uuid('transportId must be a valid UUID');
const producerId  = z.string().uuid('producerId must be a valid UUID');
const consumerId  = z.string().uuid('consumerId must be a valid UUID');

// ---------------------------------------------------------------------------
// Client → Server event schemas
// ---------------------------------------------------------------------------

export const JoinRoomSchema = z.object({ roomId });

export const LeaveRoomSchema = z.object({ roomId });

export const GetRoomStateSchema = z.object({ roomId });

export const CreateTransportSchema = z.object({
  roomId,
  direction: z.enum(['send', 'recv']),
});

export const ConnectTransportSchema = z.object({
  roomId,
  transportId,
  dtlsParameters: z.object({
    role: z.enum(['auto', 'client', 'server']).optional(),
    fingerprints: z.array(
      z.object({
        algorithm: z.string(),
        value:     z.string(),
      }),
    ),
  }),
});

export const RestartIceSchema = z.object({
  roomId,
  transportId,
});

export const ProduceSchema = z.object({
  roomId,
  transportId,
  kind: z.enum(['audio', 'video']),
  rtpParameters: z.record(z.string(), z.unknown()),
  appData: z
    .object({
      source: z.enum(['camera', 'microphone', 'screen']),
    })
    .optional(),
});

export const ConsumeSchema = z.object({
  roomId,
  transportId,
  producerId,
  rtpCapabilities: z.record(z.string(), z.unknown()),
});

export const ResumeConsumerSchema = z.object({ roomId, consumerId });

export const PauseConsumerSchema = z.object({ roomId, consumerId });

export const CloseConsumerSchema = z.object({ roomId, consumerId });

export const CloseProducerSchema = z.object({ roomId, producerId });

export const PauseProducerSchema = z.object({ roomId, producerId });

export const ResumeProducerSchema = z.object({ roomId, producerId });

// ── Track replacement ────────────────────────────────────────────────────────

export const ReplaceTrackSchema = z.object({
  roomId,
  producerId,
  // track is a browser-side MediaStreamTrack — on the server we only need
  // the producerId to identify which producer to replace. The actual track
  // object is passed by the client via the mediasoup-client transport API,
  // not via the socket payload. This schema validates the signaling payload.
});

// ── Bandwidth / quality management ──────────────────────────────────────────

export const SetPreferredLayersSchema = z.object({
  roomId,
  consumerId,
  spatialLayer:  z.number().int().min(0).max(2),
  temporalLayer: z.number().int().min(0).max(2).optional(),
});

export const SetConsumerPrioritySchema = z.object({
  roomId,
  consumerId,
  priority: z.number().int().min(1).max(255),
});

// ── Diagnostics ──────────────────────────────────────────────────────────────

export const GetPeerDiagnosticsSchema = z.object({ roomId });

// ── Chat / reactions ─────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  roomId,
  content: z.string().min(1).max(2000).trim().optional(),
  text:    z.string().min(1).max(2000).trim().optional(),
}).transform((data) => ({
  roomId:  data.roomId,
  content: (data.content || data.text || '').trim(),
})).refine((data) => data.content.length > 0, { message: 'content must not be empty' });

export const GetChatHistorySchema = z.object({ roomId });

export const SendReactionSchema = z.object({
  roomId,
  reaction: z.string().min(1).max(10),
  peerId:   z.string().optional(),
});

export const RaiseHandSchema = z.object({
  roomId,
  isRaised: z.boolean(),
  peerId:   z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validates a socket event payload against a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validatePayload<T extends z.ZodTypeAny>(
  schema: T,
  payload: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const message = result.error.issues
    .map((e) => `${(e.path as (string | number | symbol)[]).map(String).join('.')}: ${e.message}`)
    .join('; ');
  return { success: false, error: message };
}
