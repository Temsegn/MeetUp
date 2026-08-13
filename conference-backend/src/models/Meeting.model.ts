import mongoose, { Document, Schema } from 'mongoose';

export interface IMeeting extends Document {
  roomId: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  type: 'instant' | 'scheduled';
  title?: string;
  scheduledAt?: Date;
  duration?: number; // in minutes
  createdAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    roomId: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    type: { type: String, enum: ['instant', 'scheduled'], default: 'instant' },
    title: { type: String },
    scheduledAt: { type: Date },
    duration: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
