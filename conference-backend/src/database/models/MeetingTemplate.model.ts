import mongoose, { Document, Schema } from 'mongoose';

export interface IMeetingTemplate extends Document {
  workspaceId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  title: string;
  agenda: string[];
  duration: number;
  settings: {
    waitingRoom: boolean;
    autoRecord: boolean;
    muteOnEntry: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const meetingTemplateSchema = new Schema<IMeetingTemplate>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByName: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    agenda: { type: [String], default: [] },
    duration: { type: Number, default: 30, min: 5, max: 480 },
    settings: {
      waitingRoom: { type: Boolean, default: false },
      autoRecord: { type: Boolean, default: false },
      muteOnEntry: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

meetingTemplateSchema.index({ workspaceId: 1, updatedAt: -1 });

export const MeetingTemplate = mongoose.model<IMeetingTemplate>(
  'MeetingTemplate',
  meetingTemplateSchema,
);
