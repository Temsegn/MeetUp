export type AiInsightsTab =
  | 'AI Summary'
  | 'Transcript'
  | 'Insights'
  | 'Action Items'
  | 'Topics'
  | 'Sentiment'
  | 'Noise & Talk Time'
  | 'AI Chat';

export const AI_INSIGHTS_TABS: AiInsightsTab[] = [
  'AI Summary',
  'Transcript',
  'Insights',
  'Action Items',
  'Topics',
  'Sentiment',
  'Noise & Talk Time',
  'AI Chat',
];

export type TranscriptLine = {
  id: string;
  name: string;
  role?: 'Host';
  time: string;
  text: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  online?: boolean;
};

export type ActionItemStatus = 'Completed' | 'In Progress' | 'Not Started';
export type ActionItemPriority = 'High' | 'Medium' | 'Low';

export type ActionItem = {
  id: string;
  text: string;
  assignee: string;
  ownerName: string;
  due: string;
  dueFull: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  done?: boolean;
};

export type TopicShare = {
  label: string;
  pct: number;
};

export type SentimentSlice = {
  label: 'Positive' | 'Neutral' | 'Negative';
  pct: number;
  color: string;
};

export type SpeakerShare = {
  name: string;
  pct: number;
  barColor: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export type TimedNote = {
  id: string;
  time: string;
  text: string;
};

/** Demo meeting payload aligned to Figma nodes 138:8663 / 138:9231. */
export const DEMO_AI_MEETING = {
  title: 'Product Strategy Discussion',
  dateLabel: 'May 12, 2025 · 10:30 AM',
  duration: '45:32',
  participants: 12,
  summary:
    'The team discussed the product strategy for Q3 with a focus on user feedback, analytics, and prioritizing features that deliver the most impact.',
  highlights: [
    'Users are requesting better reporting, mobile access, and more integrations.',
    'Mobile usage increased by 35% — improving mobile experience is a priority.',
    'Reporting dashboard will have the biggest impact for enterprise users.',
    'Design team to explore a more customizable and user-friendly dashboard.',
    'Action items assigned to move forward with planning and timelines.',
  ],
  insight:
    'Your team is most engaged during strategy discussions. Consider scheduling focused deep-dive sessions for reporting and mobile initiatives to maintain momentum.',
  transcript: [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Host' as const,
      time: '00:00',
      text: 'Thanks everyone for joining today. The goal of this meeting is to align on our product strategy for Q3 and discuss the key initiatives we should prioritize.',
      avatarUrl: '/dashboard/avatar-1.jpg',
      avatarColor: '#7C3AED',
      online: true,
    },
    {
      id: '2',
      name: 'Michael Smith',
      time: '00:32',
      text: "I'd like to start with the user feedback we received over the last quarter. The most requested features are improved reporting, mobile access, and integrations.",
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
    },
    {
      id: '3',
      name: 'Emma Davis',
      time: '01:15',
      text: "That aligns with what we're seeing in the analytics. Mobile usage has increased by 35%, so improving mobile experience should be a priority.",
      avatarUrl: '/dashboard/avatar-3.jpg',
      avatarColor: '#EA580C',
    },
    {
      id: '4',
      name: 'James Wilson',
      time: '02:05',
      text: 'Agreed. I also think we should focus on the reporting dashboard. It will have the biggest impact for enterprise users.',
      avatarUrl: '/dashboard/avatar-4.jpg',
      avatarColor: '#00A45C',
    },
    {
      id: '5',
      name: 'Olivia Brown',
      time: '02:48',
      text: "From the design side, we can start exploring a new dashboard layout that's more customizable and easier to use.",
      avatarUrl: '/dashboard/avatar-5.jpg',
      avatarColor: '#DB2777',
    },
    {
      id: '6',
      name: 'Michael Smith',
      time: '03:20',
      text: 'On integrations, Salesforce and Slack are the top requests. We should plan to deliver those in Q3.',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
    },
    {
      id: '7',
      name: 'Sarah Johnson',
      role: 'Host' as const,
      time: '03:55',
      text: "Great insights! Let's capture these as action items and define owners. We'll review the roadmap in our next sync.",
      avatarUrl: '/dashboard/avatar-1.jpg',
      avatarColor: '#7C3AED',
      online: true,
    },
  ] satisfies TranscriptLine[],
  speakerShares: [
    {
      name: 'Sarah Johnson',
      pct: 40,
      barColor: '#8047E1',
      avatarUrl: '/dashboard/avatar-1.jpg',
      avatarColor: '#7C3AED',
    },
    {
      name: 'Michael Smith',
      pct: 28,
      barColor: '#0082EB',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
    },
    {
      name: 'Emma Davis',
      pct: 16,
      barColor: '#00B393',
      avatarUrl: '/dashboard/avatar-3.jpg',
      avatarColor: '#EA580C',
    },
    {
      name: 'James Wilson',
      pct: 10,
      barColor: '#EFAD32',
      avatarUrl: '/dashboard/avatar-4.jpg',
      avatarColor: '#00A45C',
    },
    {
      name: 'Olivia Brown',
      pct: 6,
      barColor: '#9434DE',
      avatarUrl: '/dashboard/avatar-5.jpg',
      avatarColor: '#DB2777',
    },
  ] satisfies SpeakerShare[],
  transcriptHighlights: [
    { id: 'h1', time: '01:15', text: 'Mobile usage increased by 35%' },
    { id: 'h2', time: '02:05', text: 'Reporting dashboard will have the biggest impact' },
    { id: 'h3', time: '03:20', text: 'Salesforce and Slack integrations are top requests' },
  ] satisfies TimedNote[],
  bookmarks: [
    { id: 'b1', time: '00:32', text: 'User feedback overview' },
    { id: 'b2', time: '02:05', text: 'Dashboard proposal discussion' },
  ] satisfies TimedNote[],
  actionItems: [
    {
      id: 'a1',
      text: 'Share the user feedback report from Q2 with the team',
      assignee: 'John D.',
      ownerName: 'John Davis',
      due: 'May 14',
      dueFull: 'May 14, 2025',
      status: 'Completed',
      priority: 'Medium',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
      done: true,
    },
    {
      id: 'a2',
      text: 'Prepare mobile improvement plan based on feedback',
      assignee: 'Emma D.',
      ownerName: 'Emma Davis',
      due: 'May 16',
      dueFull: 'May 16, 2025',
      status: 'In Progress',
      priority: 'High',
      avatarUrl: '/dashboard/avatar-3.jpg',
      avatarColor: '#EA580C',
    },
    {
      id: 'a3',
      text: 'Draft reporting dashboard proposal for leadership review',
      assignee: 'James W.',
      ownerName: 'James Wilson',
      due: 'May 20',
      dueFull: 'May 20, 2025',
      status: 'In Progress',
      priority: 'High',
      avatarUrl: '/dashboard/avatar-4.jpg',
      avatarColor: '#00A45C',
    },
    {
      id: 'a4',
      text: 'Explore new dashboard layout concepts',
      assignee: 'Olivia B.',
      ownerName: 'Olivia Brown',
      due: 'May 18',
      dueFull: 'May 18, 2025',
      status: 'Not Started',
      priority: 'Medium',
      avatarUrl: '/dashboard/avatar-5.jpg',
      avatarColor: '#DB2777',
    },
    {
      id: 'a5',
      text: 'Review and finalize dashboard KPIs',
      assignee: 'Michael S.',
      ownerName: 'Michael Smith',
      due: 'May 15',
      dueFull: 'May 15, 2025',
      status: 'Completed',
      priority: 'Low',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
      done: true,
    },
    {
      id: 'a6',
      text: 'Set up integration with Salesforce and Slack',
      assignee: 'Emma D.',
      ownerName: 'Emma Davis',
      due: 'May 22',
      dueFull: 'May 22, 2025',
      status: 'In Progress',
      priority: 'High',
      avatarUrl: '/dashboard/avatar-3.jpg',
      avatarColor: '#EA580C',
    },
    {
      id: 'a7',
      text: 'Define success metrics for Q3 product strategy',
      assignee: 'Sarah J.',
      ownerName: 'Sarah Johnson',
      due: 'May 21',
      dueFull: 'May 21, 2025',
      status: 'Not Started',
      priority: 'Medium',
      avatarUrl: '/dashboard/avatar-1.jpg',
      avatarColor: '#7C3AED',
    },
    {
      id: 'a8',
      text: 'Schedule follow-up meeting to review roadmap',
      assignee: 'Michael S.',
      ownerName: 'Michael Smith',
      due: 'May 23',
      dueFull: 'May 23, 2025',
      status: 'Not Started',
      priority: 'Low',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
    },
    {
      id: 'a9',
      text: 'Compile competitor feature matrix for Q3',
      assignee: 'John D.',
      ownerName: 'John Davis',
      due: 'May 12',
      dueFull: 'May 12, 2025',
      status: 'Not Started',
      priority: 'High',
      avatarUrl: '/dashboard/avatar-2.jpg',
      avatarColor: '#016BE6',
    },
    {
      id: 'a10',
      text: 'Align design system tokens with new dashboard',
      assignee: 'Olivia B.',
      ownerName: 'Olivia Brown',
      due: 'May 25',
      dueFull: 'May 25, 2025',
      status: 'In Progress',
      priority: 'Medium',
      avatarUrl: '/dashboard/avatar-5.jpg',
      avatarColor: '#DB2777',
    },
    {
      id: 'a11',
      text: 'Share analytics deep-dive with leadership',
      assignee: 'Sarah J.',
      ownerName: 'Sarah Johnson',
      due: 'May 19',
      dueFull: 'May 19, 2025',
      status: 'Completed',
      priority: 'Low',
      avatarUrl: '/dashboard/avatar-1.jpg',
      avatarColor: '#7C3AED',
      done: true,
    },
    {
      id: 'a12',
      text: 'Prototype mobile nav improvements',
      assignee: 'James W.',
      ownerName: 'James Wilson',
      due: 'May 24',
      dueFull: 'May 24, 2025',
      status: 'In Progress',
      priority: 'Medium',
      avatarUrl: '/dashboard/avatar-4.jpg',
      avatarColor: '#00A45C',
    },
  ] satisfies ActionItem[],
  actionOwnerShares: [
    { name: 'Emma Davis', count: 3, pct: 25, color: '#00B393' },
    { name: 'John Davis', count: 2, pct: 17, color: '#016BE6' },
    { name: 'James Wilson', count: 2, pct: 17, color: '#EFAD32' },
    { name: 'Michael Smith', count: 2, pct: 17, color: '#8047E1' },
    { name: 'Olivia Brown', count: 1, pct: 8, color: '#9434DE' },
    { name: 'Sarah Johnson', count: 2, pct: 17, color: '#EA580C' },
  ],
  upcomingDeadlines: [
    {
      id: 'd1',
      date: 'May 16, 2025',
      text: 'Prepare mobile improvement plan based on feedback',
      avatarUrl: '/dashboard/avatar-3.jpg',
      avatarColor: '#EA580C',
    },
    {
      id: 'd2',
      date: 'May 18, 2025',
      text: 'Explore new dashboard layout concepts',
      avatarUrl: '/dashboard/avatar-5.jpg',
      avatarColor: '#DB2777',
    },
    {
      id: 'd3',
      date: 'May 20, 2025',
      text: 'Draft reporting dashboard proposal',
      avatarUrl: '/dashboard/avatar-4.jpg',
      avatarColor: '#00A45C',
    },
  ],
  actionRecommendation:
    '1 action item is overdue. Consider reviewing and updating priorities so owners can unblock delivery this week.',
  topics: [
    { label: 'Product Strategy', pct: 32 },
    { label: 'User Feedback', pct: 24 },
    { label: 'Mobile Experience', pct: 18 },
    { label: 'Reporting Dashboard', pct: 16 },
    { label: 'Integrations', pct: 10 },
  ] satisfies TopicShare[],
  sentiment: [
    { label: 'Positive', pct: 72, color: '#16A34A' },
    { label: 'Neutral', pct: 20, color: '#EAB308' },
    { label: 'Negative', pct: 8, color: '#DC2626' },
  ] satisfies SentimentSlice[],
};
