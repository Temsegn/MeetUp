export const APP_NAV = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/meetings', label: 'Meetings' },
  { to: '/app/calendar', label: 'Calendar' },
  { to: '/app/contacts', label: 'Contacts' },
  { to: '/app/messages', label: 'Messages' },
  { to: '/app/recordings', label: 'Recordings' },
  {
    to: '/app/settings/workspace',
    label: 'Workspace',
    matchPrefix: '/app/settings/',
    matchSections: ['workspace', 'members', 'invite', 'teams', 'create-team', 'rooms', 'create-room', 'branding', 'security'],
  },
  { to: '/app/templates', label: 'Templates' },
  { to: '/app/reports', label: 'Reports' },
  { to: '/app/ai-insights', label: 'AI Insights', badge: 'Beta' },
  {
    to: '/app/settings/profile',
    label: 'Settings',
    matchPrefix: '/app/settings/',
    matchSections: ['profile', 'account'],
  },
] as const;

export const WORKSPACE_NAV = [
  { to: '/app/settings/profile', label: 'Profile' },
  { to: '/app/settings/workspace', label: 'Workspace' },
  { to: '/app/settings/members', label: 'Members' },
  { to: '/app/settings/rooms', label: 'Rooms' },
  { to: '/app/settings/billing', label: 'Billing & Plan' },
] as const;

export const ADMIN_NAV = [
  { to: '/app/admin', label: 'Overview' },
  { to: '/app/billing', label: 'Billing' },
  { to: '/app/billing/invoices', label: 'Invoices' },
] as const;
