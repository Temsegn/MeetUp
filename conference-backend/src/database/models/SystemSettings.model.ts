import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  key: string;
  general: {
    appName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  auth: {
    requireEmailVerification: boolean;
    allowGoogleSignIn: boolean;
    sessionTimeoutHours: number;
  };
  security: {
    enforce2faForAdmins: boolean;
    passwordMinLength: number;
  };
  email: {
    fromName: string;
    fromAddress: string;
  };
  storage: {
    maxUploadMb: number;
    recordingRetentionDays: number;
  };
  featureFlags: {
    aiInsights: boolean;
    whiteboard: boolean;
    remoteControl: boolean;
  };
  updatedAt: Date;
}

const schema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    general: {
      appName: { type: String, default: 'Samtal Meet' },
      supportEmail: { type: String, default: 'support@samtal.com' },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: { type: String, default: '' },
    },
    auth: {
      requireEmailVerification: { type: Boolean, default: true },
      allowGoogleSignIn: { type: Boolean, default: true },
      sessionTimeoutHours: { type: Number, default: 12 },
    },
    security: {
      enforce2faForAdmins: { type: Boolean, default: false },
      passwordMinLength: { type: Number, default: 8 },
    },
    email: {
      fromName: { type: String, default: 'Samtal Meet' },
      fromAddress: { type: String, default: 'noreply@samtal.com' },
    },
    storage: {
      maxUploadMb: { type: Number, default: 100 },
      recordingRetentionDays: { type: Number, default: 90 },
    },
    featureFlags: {
      aiInsights: { type: Boolean, default: true },
      whiteboard: { type: Boolean, default: true },
      remoteControl: { type: Boolean, default: true },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', schema);
