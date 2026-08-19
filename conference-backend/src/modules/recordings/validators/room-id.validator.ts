import { z } from 'zod';

export const RoomIdParamsSchema = z.object({
  roomId: z.string().trim().min(1, 'roomId is required.').max(100),
});

export type RoomIdParams = z.infer<typeof RoomIdParamsSchema>;
