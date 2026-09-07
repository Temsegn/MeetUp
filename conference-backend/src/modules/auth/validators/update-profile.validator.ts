import { z } from 'zod';

const notificationsSchema = z
  .object({
    meetings: z.boolean().optional(),
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    messages: z.boolean().optional(),
  })
  .strict()
  .optional();

const audioVideoSchema = z
  .object({
    microphone: z.string().trim().max(120).optional(),
    camera: z.string().trim().max(120).optional(),
    speaker: z.string().trim().max(120).optional(),
  })
  .strict()
  .optional();

const recordingSchema = z
  .object({
    autoRecord: z.boolean().optional(),
    quality: z.string().trim().max(60).optional(),
  })
  .strict()
  .optional();

const securitySchema = z
  .object({
    meetingPassword: z.boolean().optional(),
    waitingRoom: z.boolean().optional(),
  })
  .strict()
  .optional();

const integrationsSchema = z
  .object({
    googleCalendar: z.boolean().optional(),
    slack: z.boolean().optional(),
    outlook: z.boolean().optional(),
  })
  .strict()
  .optional();

const accountSchema = z
  .object({
    plan: z.string().trim().max(60).optional(),
    meetingCapacity: z.number().int().min(1).max(10000).optional(),
    role: z.string().trim().max(60).optional(),
  })
  .strict()
  .optional();

export const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    department: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    /** Compressed data URL (jpeg/png/webp). Cleared with empty string. */
    avatarUrl: z
      .union([
        z.literal(''),
        z
          .string()
          .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'Invalid image data URL')
          .max(450_000, 'Image is too large. Use a smaller photo.'),
      ])
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateSettingsSchema = z
  .object({
    notifications: notificationsSchema,
    audioVideo: audioVideoSchema,
    recording: recordingSchema,
    security: securitySchema,
    integrations: integrationsSchema,
    language: z.string().trim().max(60).optional(),
    appearance: z.string().trim().max(60).optional(),
    account: accountSchema,
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No settings to update.' });

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
