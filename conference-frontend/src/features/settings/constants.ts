import type { LucideIcon } from 'lucide-react';
import {
  User,
  Settings,
  Boxes,
  Users,
  LayoutGrid,
  DoorOpen,
  Palette,
  ShieldCheck,
  CreditCard,
  Puzzle,
  ScrollText,
} from 'lucide-react';

export type SettingsSectionId =
  | 'profile'
  | 'account'
  | 'workspace'
  | 'members'
  | 'invite'
  | 'teams'
  | 'create-team'
  | 'rooms'
  | 'create-room'
  | 'branding'
  | 'security'
  | 'billing'
  | 'integrations'
  | 'audit';

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  /** Nested under Workspace in the left nav */
  underWorkspace?: boolean;
};

/** Figma settings hub nav — icons aligned to Figma node 1:5270 glyphs. */
export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Settings },
  { id: 'workspace', label: 'Workspace', icon: Boxes },
  { id: 'members', label: 'Members', icon: Users, underWorkspace: true },
  { id: 'teams', label: 'Teams', icon: LayoutGrid, underWorkspace: true },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, underWorkspace: true },
  { id: 'branding', label: 'Branding', icon: Palette, underWorkspace: true },
  { id: 'security', label: 'Security', icon: ShieldCheck, underWorkspace: true },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
];

export const SETTINGS_SECTION_META: Record<
  SettingsSectionId,
  { title: string; subtitle: string }
> = {
  profile: {
    title: 'Settings',
    subtitle: 'Manage your account, preferences, and application settings.',
  },
  account: {
    title: 'Account',
    subtitle: 'Manage sign-in, password, and account preferences.',
  },
  workspace: {
    title: 'Workspace',
    subtitle: 'Manage your workspace settings, members, and preferences.',
  },
  members: {
    title: 'Members',
    subtitle: 'Manage workspace members and their access.',
  },
  invite: {
    title: 'Create User',
    subtitle: 'Add a new user to your organization and set their role and access.',
  },
  teams: {
    title: 'Teams',
    subtitle: 'Organize members into teams for easier collaboration.',
  },
  'create-team': {
    title: 'Create Team',
    subtitle: 'Set up a new team for your workspace.',
  },
  rooms: {
    title: 'Rooms',
    subtitle: 'Create and manage meeting rooms for your workspace.',
  },
  'create-room': {
    title: 'Create Room',
    subtitle: 'Set up a new meeting room for your workspace.',
  },
  branding: {
    title: 'Branding',
    subtitle: 'Customize logo, colors, and workspace appearance.',
  },
  security: {
    title: 'Security',
    subtitle: 'Control workspace security and access policies.',
  },
  billing: {
    title: 'Billing & Plan',
    subtitle: 'View usage, change plans, and manage payment.',
  },
  integrations: {
    title: 'Integrations',
    subtitle: 'Connect Samtal with the tools your team already uses.',
  },
  audit: {
    title: 'Audit Logs',
    subtitle: 'Review activity across your workspace.',
  },
};

export function isSettingsSectionId(value: string | undefined): value is SettingsSectionId {
  if (!value) return false;
  if (value === 'invite' || value === 'create-room' || value === 'create-team') return true;
  return SETTINGS_NAV.some((item) => item.id === value);
}

/** Sidebar "Workspace" stays active for workspace + nested items. */
export const WORKSPACE_SIDEBAR_SECTIONS: SettingsSectionId[] = [
  'workspace',
  'members',
  'invite',
  'teams',
  'create-team',
  'rooms',
  'create-room',
  'branding',
  'security',
];

/** Sidebar "Settings" stays active for profile/account. */
export const SETTINGS_SIDEBAR_SECTIONS: SettingsSectionId[] = ['profile', 'account'];
