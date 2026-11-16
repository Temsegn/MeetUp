import mongoose, { Document, Schema } from 'mongoose';

export type RsvpResponse = 'accepted' | 'tentative' | 'declined';

/** An invitee's answer to a meeting invitation (one per meeting + email). */
export interface IMeetingRsvp extends Document {
  meetingId: mongoose.Types.ObjectId;
  email: string;
  response: RsvpResponse;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingRsvpSchema = new Schema<IMeetingRsvp>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    response: { type: String, enum: ['accepted', 'tentative', 'declined'], required: true },
    respondedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

meetingRsvpSchema.index({ meetingId: 1, email: 1 }, { unique: true });

export const MeetingRsvp = mongoose.model<IMeetingRsvp>('MeetingRsvp', meetingRsvpSchema);
