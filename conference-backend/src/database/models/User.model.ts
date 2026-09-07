import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserSettings {
  notifications: {
    meetings: boolean;
    email: boolean;
    push: boolean;
    messages: boolean;
  };
  audioVideo: {
    microphone: string;
    camera: string;
    speaker: string;
  };
  recording: {
    autoRecord: boolean;
    quality: string;
  };
  security: {
    meetingPassword: boolean;
    waitingRoom: boolean;
  };
  integrations: {
    googleCalendar: boolean;
    slack: boolean;
    outlook: boolean;
  };
  language: string;
  appearance: string;
  account: {
    plan: string;
    meetingCapacity: number;
    role: string;
  };
}

export const DEFAULT_USER_SETTINGS: IUserSettings = {
  notifications: { meetings: true, email: true, push: false, messages: true },
  audioVideo: {
    microphone: 'Default — System Microphone',
    camera: 'Default — System Camera',
    speaker: 'Default — System Speakers',
  },
  recording: { autoRecord: true, quality: 'High (1080p)' },
  security: { meetingPassword: true, waitingRoom: true },
  integrations: { googleCalendar: true, slack: true, outlook: false },
  language: 'English',
  appearance: 'System',
  account: { plan: 'Team Plan', meetingCapacity: 100, role: 'Admin' },
};

export interface IUser extends Document {
  name: string;
  email: string;
  /** Empty for Google-only accounts. */
  passwordHash: string;
  authProvider: 'local' | 'google';
  googleId: string | null;
  avatarColor: string;
  /** Optional profile photo as a compressed data URL. */
  avatarUrl: string | null;
  jobTitle: string;
  department: string;
  phone: string;
  /** When true, user must set a new password after invite/temp login. */
  mustChangePassword: boolean;
  settings: IUserSettings;
  /** Set when the user's email address is verified (null = unverified). */
  emailVerifiedAt: Date | null;
  /** Set on every password change — used to invalidate pre-change access tokens. */
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    notifications: {
      meetings: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      messages: { type: Boolean, default: true },
    },
    audioVideo: {
      microphone: { type: String, default: 'Default — System Microphone' },
      camera: { type: String, default: 'Default — System Camera' },
      speaker: { type: String, default: 'Default — System Speakers' },
    },
    recording: {
      autoRecord: { type: Boolean, default: true },
      quality: { type: String, default: 'High (1080p)' },
    },
    security: {
      meetingPassword: { type: Boolean, default: true },
      waitingRoom: { type: Boolean, default: true },
    },
    integrations: {
      googleCalendar: { type: Boolean, default: true },
      slack: { type: Boolean, default: true },
      outlook: { type: Boolean, default: false },
    },
    language: { type: String, default: 'English' },
    appearance: { type: String, default: 'System' },
    account: {
      plan: { type: String, default: 'Team Plan' },
      meetingCapacity: { type: Number, default: 100 },
      role: { type: String, default: 'Admin' },
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: '' },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true, unique: true },
    avatarColor: { type: String, default: () => `hsl(${Math.floor(Math.random() * 360)}, 60%, 50%)` },
    avatarUrl: { type: String, default: null },
    jobTitle: { type: String, default: '', trim: true, maxlength: 120 },
    department: { type: String, default: '', trim: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    mustChangePassword: { type: Boolean, default: false },
    settings: { type: userSettingsSchema, default: () => ({ ...DEFAULT_USER_SETTINGS }) },
    emailVerifiedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
