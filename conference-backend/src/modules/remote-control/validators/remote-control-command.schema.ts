import { z } from 'zod';
import { REMOTE_UI_COMMANDS } from '../remote-control.constants';

const uuid = z.string().uuid();
const roomId = z.string().min(1).max(100).trim();

export const RemoteControlRequestSchema = z.object({
  roomId,
  targetParticipantId: uuid,
});

export const RemoteControlRespondSchema = z.object({
  sessionId: uuid,
  accept: z.boolean(),
});

export const RemoteControlStopSchema = z.object({
  sessionId: uuid,
});

const payloadSchema = z.record(z.string(), z.unknown()).optional().default({});

const RemoteUiCommandSchema = z.string().refine(
  (value): value is (typeof REMOTE_UI_COMMANDS)[number] =>
    (REMOTE_UI_COMMANDS as readonly string[]).includes(value),
  { error: `Invalid actionType. Allowed: ${REMOTE_UI_COMMANDS.join(', ')}` },
);

export const RemoteControlActionSchema = z.object({
  sessionId: uuid,
  seq: z.number().int().positive(),
  actionType: RemoteUiCommandSchema,
  payload: payloadSchema,
});

export const SelectParticipantPayloadSchema = z.object({
  participantId: uuid,
});

export const ChangeLayoutPayloadSchema = z.object({
  layout: z.enum(['gallery', 'presentation']),
});

export const ScrollPanelPayloadSchema = z.object({
  panel: z.enum(['chat', 'participants']),
  deltaY: z.number().min(-2000).max(2000),
});

export const SendChatPayloadSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const SendReactionPayloadSchema = z.object({
  reaction: z.string().min(1).max(64),
});

export const RemoteControlCursorSchema = z.object({
  sessionId: uuid,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  visible: z.boolean(),
});

export const RemoteControlDraftSchema = z.object({
  sessionId: uuid,
  chatDraft: z.string().max(2000),
});

export const RemoteControlViewSchema = z.object({
  sessionId: uuid,
  view: z.enum(['self', 'remote']),
});

export const RemoteControlSyncSchema = z.object({
  sessionId: uuid,
});

const optionalParticipantId = z.preprocess((value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }
  return null;
}, z.string().uuid().nullable());

export const ControlledUiStateSchema = z.object({
  version: z.number().int().nonnegative(),
  sidebar: z.enum(['chat', 'participants']).nullable(),
  layout: z.enum(['gallery', 'presentation']),
  selectedParticipantId: optionalParticipantId,
  isMuted: z.boolean(),
  isCameraOff: z.boolean(),
  isSharingScreen: z.boolean(),
  isHandRaised: z.boolean(),
  chatDraft: z.string().max(2000),
  showAllParticipants: z.boolean(),
  scrollTop: z.number().min(0).max(100_000),
  whiteboardOpen: z.boolean().optional().default(false),
});

export const RemoteControlUiStateSchema = z.object({
  sessionId: uuid,
  state: ControlledUiStateSchema,
});

export function parseActionPayload(
  actionType: (typeof REMOTE_UI_COMMANDS)[number],
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (actionType === 'SELECT_PARTICIPANT') {
    return SelectParticipantPayloadSchema.parse(payload);
  }
  if (actionType === 'CHANGE_LAYOUT') {
    return ChangeLayoutPayloadSchema.parse(payload);
  }
  if (actionType === 'SCROLL_PANEL') {
    return ScrollPanelPayloadSchema.parse(payload);
  }
  if (actionType === 'SEND_CHAT') {
    return SendChatPayloadSchema.parse(payload);
  }
  if (actionType === 'SEND_REACTION') {
    return SendReactionPayloadSchema.parse(payload);
  }
  return {};
}
