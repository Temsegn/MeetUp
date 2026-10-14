import mongoose, { Document, Schema } from 'mongoose';

/**
 * Durable meeting admission — survives socket replacement, refresh, and network handover.
 * Identity is NOT the ephemeral mediasoup participantId or socket id.
 *
 * identityKey:
 *  - `user:<mongoUserId>` for registered users
 *  - `email:<normalizedEmail>` for guests (guest JWT userIds change every auth)
 */
export type MeetingAdmissionStatus = 'admitted' | 'kicked' | 'denied';

export interface IMeetingAdmission extends Document {
  meetingId: mongoose.Types.ObjectId;
  roomId: string;
  identityKey: string;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  status: MeetingAdmissionStatus;
  admittedBy?: string | null;
  admittedAt?: Date | null;
  revokedBy?: string | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const meetingAdmissionSchema = new Schema<IMeetingAdmission>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    roomId: { type: String, required: true, index: true },
    identityKey: { type: String, required: true },
    userId: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    displayName: { type: String, default: null },
    status: {
      type: String,
      enum: ['admitted', 'kicked', 'denied'],
      required: true,
      index: true,
    },
    admittedBy: { type: String, default: null },
    admittedAt: { type: Date, default: null },
    revokedBy: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

meetingAdmissionSchema.index({ meetingId: 1, identityKey: 1 }, { unique: true });
meetingAdmissionSchema.index({ roomId: 1, identityKey: 1 });

export function buildAdmissionIdentityKey(opts: {
  userId: string;
  isGuest?: boolean;
  email?: string | null;
}): string {
  if (opts.isGuest || opts.userId.startsWith('guest_')) {
    const email = String(opts.email || '').trim().toLowerCase();
    if (email) return `email:${email}`;
    // Fallback — weaker, only if email missing
    return `guest:${opts.userId}`;
  }
  return `user:${opts.userId}`;
}

export const MeetingAdmission = mongoose.model<IMeetingAdmission>(
  'MeetingAdmission',
  meetingAdmissionSchema,
);
