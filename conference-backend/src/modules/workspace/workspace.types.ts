export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'invited' | 'removed';

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(role: WorkspaceRole, min: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Workspace prefs — applied to new meetings + workspace UI. Meeting toggles default OFF. */
export interface WorkspaceSettings {
  waitingRoom: boolean;
  autoRecord: boolean;
  joinBeforeHost: boolean;
  muteOnEntry: boolean;
  maxMeetingDurationMinutes: number;
  language: string;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  waitingRoom: false,
  autoRecord: false,
  joinBeforeHost: false,
  muteOnEntry: false,
  maxMeetingDurationMinutes: 30,
  language: 'English',
};

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  /** Contact / company email for the workspace (optional). */
  email: string;
  /** Compressed logo data URL or remote URL (optional). */
  logoUrl: string | null;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
}

export interface MemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: MemberStatus;
  createdAt: Date;
}

export interface InviteRecord {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  phone: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface MembershipSummary {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  slug: string;
}
