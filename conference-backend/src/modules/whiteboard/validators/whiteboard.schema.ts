import { z } from 'zod';

const roomId = z.string().min(1).max(100).trim();
const clientId = z.string().min(1).max(128);

const whiteboardElementSchema = z
  .object({
    id: z.string().min(1).max(128),
    version: z.number().int().nonnegative(),
    versionNonce: z.number().int(),
    isDeleted: z.boolean().optional(),
  })
  .passthrough();

const binaryFileSchema = z
  .object({
    mimeType: z.string().min(1).max(128),
    id: z.string().min(1).max(128),
    dataURL: z.string().min(1).max(2_000_000),
    created: z.number(),
    lastRetrieved: z.number().optional(),
  })
  .passthrough();

export const WhiteboardJoinSchema = z.object({
  roomId,
  clientId,
});

export const WhiteboardLeaveSchema = z.object({
  roomId,
});

export const WhiteboardUpdateSchema = z.object({
  roomId,
  clientId,
  baseRevision: z.number().int().nonnegative().optional(),
  elements: z.array(whiteboardElementSchema).max(500),
  files: z.record(z.string().max(128), binaryFileSchema).optional(),
});

export const WhiteboardCursorSchema = z.object({
  roomId,
  clientId,
  x: z.number().finite(),
  y: z.number().finite(),
  pointer: z.enum(['mouse', 'touch', 'pen']).optional(),
  button: z.enum(['up', 'down']).optional(),
});

export const WhiteboardClearSchema = z.object({
  roomId,
  clientId,
});

export const WhiteboardVisibilitySchema = z.object({
  roomId,
  open: z.boolean(),
});

export const WhiteboardGetVisibilitySchema = z.object({
  roomId,
});
