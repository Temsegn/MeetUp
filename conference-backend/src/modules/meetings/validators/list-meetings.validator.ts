import { z } from 'zod';

export const ListMeetingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  type: z.enum(['instant', 'scheduled']).optional(),
});

export type ListMeetingsQueryInput = z.infer<typeof ListMeetingsQuerySchema>;
