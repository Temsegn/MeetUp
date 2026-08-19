import { z } from 'zod';

export const CreateMeetingSchema = z
  .object({
    roomId: z.string().trim().min(1, 'roomId is required.').max(100),
    type: z.enum(['instant', 'scheduled']).optional().default('instant'),
    title: z.string().trim().max(200).optional(),
    scheduledAt: z.string().optional(),
    duration: z.number().int().min(1).max(24 * 60).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'scheduled') {
      if (!data.scheduledAt || Number.isNaN(Date.parse(data.scheduledAt))) {
        ctx.addIssue({
          code: 'custom',
          path: ['scheduledAt'],
          message: 'scheduledAt must be a valid date for scheduled meetings.',
        });
      }
    }
  });

export type CreateMeetingBody = z.infer<typeof CreateMeetingSchema>;
