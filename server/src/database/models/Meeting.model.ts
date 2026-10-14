import mongoose, { Document, Schema } from 'mongoose';

export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface IMeeting extends Document {
  roomId: string;
  workspaceId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  type: 'instant' | 'scheduled';
  status: MeetingStatus;
  title?: string;
  agenda?: string[];
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  /** Unique-ish attendance: host counts as 1 from creation; rises as others join. */
  participantCount: number;
  peakParticipants: number;
  settings: {
    waitingRoom: boolean;
    autoRecord: boolean;
    joinBeforeHost: boolean;
    muteOnEntry: boolean;
  };
  /** External guest invite emails (lowercase). */
  guestEmails: string[];
  /** IANA timezone for display and calendar invites (e.g. Africa/Addis_Ababa). */
  timezone?: string;
  location?: string;
  description?: string;
  /** Stable RFC 5545 UID — never changes across reschedule/cancel. */
  calendarUid?: string;
  /** RFC 5545 SEQUENCE — increments on update/cancel. */
  calendarSequence?: number;
  /** When start-time reminder emails were sent (once). */
  startReminderSentAt?: Date | null;
  createdAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    roomId: { type: String, required: true, unique: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    type: { type: String, enum: ['instant', 'scheduled'], default: 'instant' },
    status: { type: String, enum: ['scheduled', 'live', 'ended', 'cancelled'], default: 'scheduled' },
    title: { type: String },
    agenda: [{ type: String }],
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 30 },
    participantCount: { type: Number, default: 1, min: 1 },
    peakParticipants: { type: Number, default: 1, min: 1 },
    settings: {
      waitingRoom: { type: Boolean, default: false },
      autoRecord: { type: Boolean, default: false },
      joinBeforeHost: { type: Boolean, default: false },
      muteOnEntry: { type: Boolean, default: false },
    },
    guestEmails: { type: [String], default: [] },
    timezone: { type: String, default: 'UTC' },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    calendarUid: { type: String, default: null, index: true },
    calendarSequence: { type: Number, default: 0, min: 0 },
    startReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingSchema.index(
  { status: 1, startReminderSentAt: 1, scheduledAt: 1 },
  { name: 'meeting_start_reminder_sweep' },
);

meetingSchema.index({ workspaceId: 1, status: 1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
