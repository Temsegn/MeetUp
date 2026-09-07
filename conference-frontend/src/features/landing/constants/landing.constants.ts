export const LANDING_ASSETS = {
  logo: '/auth/samtal-logo.png?v=1',
  logoBlue: '/samtal-logo-blue.png',
  logoSidebar: '/samtal-logo-sidebar.png',
  heroDashboard: '/auth/promo-dashboard.png',
  moduleMeetings: '/auth/promo-dashboard.png',
  moduleMessages: '/auth/promo-secure-mail.png',
  moduleCalendar: '/auth/promo-dashboard-alt.png',
  moduleRecordings: '/dashboard/rec-1.jpg',
  avatarQuote: '/dashboard/avatar-2.jpg',
  avatars: [
    '/dashboard/avatar-1.jpg',
    '/dashboard/avatar-2.jpg',
    '/dashboard/avatar-3.jpg',
    '/dashboard/avatar-4.jpg',
  ],
} as const;

export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Enterprise', href: '#enterprise' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Security', href: '#enterprise' },
] as const;

export const PRODUCT_MODULES = [
  {
    id: 'meetings',
    label: 'Meetings',
    title: 'Live rooms with listing, filters, and one-click join',
    image: LANDING_ASSETS.moduleMeetings,
  },
  {
    id: 'messages',
    label: 'Messages',
    title: 'Team chat with threads, attachments, and contact details',
    image: LANDING_ASSETS.moduleMessages,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    title: 'Month, week, and day views with meeting filters',
    image: LANDING_ASSETS.moduleCalendar,
  },
  {
    id: 'recordings',
    label: 'Recordings',
    title: 'Search, share, and replay every session',
    image: LANDING_ASSETS.moduleRecordings,
  },
] as const;

export const ENTERPRISE_FEATURES = [
  {
    id: 'security',
    title: 'Security & access control',
    body: 'Authenticated rooms, session protection, and role-aware workspaces for enterprise teams.',
    icon: 'shield' as const,
    large: true,
  },
  {
    id: 'video',
    title: 'HD video & screen share',
    body: 'Reliable WebRTC with live controls.',
    icon: 'video' as const,
    large: false,
  },
  {
    id: 'whiteboard',
    title: 'Collaborative whiteboard',
    body: 'Draw and ideate in real time.',
    icon: 'pen' as const,
    large: false,
  },
  {
    id: 'reports',
    title: 'Reports & engagement',
    body: 'Heatmaps, trends, and participant insights.',
    icon: 'chart' as const,
    large: false,
  },
  {
    id: 'remote',
    title: 'Remote control',
    body: 'Guided demos and support sessions.',
    icon: 'mouse' as const,
    large: false,
  },
] as const;

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals and small teams getting started.',
    features: ['Up to 40 min meetings', '5 participants', 'Basic chat & calendar'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per user / mo',
    description: 'For growing teams that meet every day.',
    features: ['Unlimited duration', 'Recordings & transcripts', 'Reports & analytics'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact sales',
    description: 'SSO, admin controls, and dedicated support.',
    features: ['SAML / SSO', 'Custom retention', 'Priority support'],
    highlighted: false,
  },
] as const;

export const TRUST_LOGOS = ['Acme Corp', 'Northwind', 'Globex', 'Initech', 'Umbrella'] as const;

export const HERO_STATS = [
  { label: 'Live now', value: '2 meetings' },
  { label: 'Participants', value: '8 active' },
  { label: 'Avg duration', value: '45m' },
] as const;
