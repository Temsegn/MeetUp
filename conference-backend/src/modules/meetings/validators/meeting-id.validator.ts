import { z } from 'zod';

export const MeetingIdParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid meeting id.'),
});

export type MeetingIdParams = z.infer<typeof MeetingIdParamsSchema>;
