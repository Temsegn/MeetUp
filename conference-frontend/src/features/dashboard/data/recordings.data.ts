export type RecordingRow = {
  id: string;
  title: string;
  meeting: string;
  at: string;
  date: string;
  time: string;
  duration: string;
  /** duration in seconds for the player scrubber */
  durationSec: number;
  size: string;
  views: number;
  thumb: string;
  avatars: string[];
  people?: Array<{ name?: string; avatarUrl?: string | null; avatarColor?: string | null }>;
  moreCount: number;
  sharedBy: { name: string; avatar: string };
  description?: string;
};

const AV = [
  '/dashboard/avatar-1.jpg',
  '/dashboard/avatar-2.jpg',
  '/dashboard/avatar-3.jpg',
  '/dashboard/avatar-4.jpg',
  '/dashboard/avatar-5.jpg',
  '/dashboard/avatar-6.jpg',
];
const TH = [
  '/dashboard/rec-1.jpg',
  '/dashboard/rec-2.jpg',
  '/dashboard/rec-3.jpg',
  '/dashboard/rec-4.jpg',
];

const SEED: Array<{
  title: string;
  at: string;
  duration: string;
  durationSec: number;
  size: string;
  views: number;
  sharedBy: string;
  moreCount: number;
  description: string;
}> = [
  {
    title: 'Product Team Weekly Sync',
    at: '2025-04-28T10:30:00',
    duration: '45:12',
    durationSec: 45 * 60 + 12,
    size: '512 MB',
    views: 24,
    sharedBy: 'Sarah Johnson',
    moreCount: 5,
    description:
      'Weekly product sync covering roadmap updates, blockers, and next-sprint priorities.',
  },
  {
    title: 'Client Presentation',
    at: '2025-04-27T14:00:00',
    duration: '32:48',
    durationSec: 32 * 60 + 48,
    size: '384 MB',
    views: 18,
    sharedBy: 'Jacob Jones',
    moreCount: 3,
    description: 'Client-facing demo of Q2 features and success metrics.',
  },
  {
    title: 'Marketing Strategy Review',
    at: '2025-04-26T11:00:00',
    duration: '54:22',
    durationSec: 54 * 60 + 22,
    size: '620 MB',
    views: 31,
    sharedBy: 'Leslie Alexander',
    moreCount: 4,
    description: 'Campaign performance review and channel plan for the next quarter.',
  },
  {
    title: 'Design System Discussion',
    at: '2025-04-25T15:30:00',
    duration: '41:05',
    durationSec: 41 * 60 + 5,
    size: '445 MB',
    views: 15,
    sharedBy: 'Darrell Steward',
    moreCount: 2,
    description: 'Component library updates, tokens, and accessibility guidelines.',
  },
  {
    title: '1:1 with Ronald Richards',
    at: '2025-04-24T09:00:00',
    duration: '28:40',
    durationSec: 28 * 60 + 40,
    size: '256 MB',
    views: 6,
    sharedBy: 'Ronald Richards',
    moreCount: 0,
    description: 'Career growth check-in and project ownership discussion.',
  },
  {
    title: 'Q2 Planning Meeting',
    at: '2025-04-23T13:00:00',
    duration: '1:12:08',
    durationSec: 72 * 60 + 8,
    size: '890 MB',
    views: 42,
    sharedBy: 'Sarah Johnson',
    moreCount: 6,
    description: 'Quarter goals, OKRs, and cross-team dependencies.',
  },
  {
    title: 'Sales Team Kickoff',
    at: '2025-04-22T10:00:00',
    duration: '38:15',
    durationSec: 38 * 60 + 15,
    size: '410 MB',
    views: 22,
    sharedBy: 'Annette Black',
    moreCount: 4,
    description: 'New quarter pipeline targets and playbook refresh.',
  },
  {
    title: 'Project Update - Mobile App',
    at: '2025-04-21T16:15:00',
    duration: '36:50',
    durationSec: 36 * 60 + 50,
    size: '398 MB',
    views: 19,
    sharedBy: 'Cameron Williamson',
    moreCount: 3,
    description: 'Mobile release status, QA findings, and launch checklist.',
  },
  {
    title: 'Engineering Standup Archive',
    at: '2025-04-18T09:30:00',
    duration: '22:10',
    durationSec: 22 * 60 + 10,
    size: '180 MB',
    views: 11,
    sharedBy: 'Jacob Jones',
    moreCount: 7,
    description: 'Daily standup archive for sprint progress tracking.',
  },
  {
    title: 'Customer Success Sync',
    at: '2025-04-16T11:45:00',
    duration: '48:33',
    durationSec: 48 * 60 + 33,
    size: '502 MB',
    views: 27,
    sharedBy: 'Leslie Alexander',
    moreCount: 2,
    description: 'Account health reviews and renewal risk mitigations.',
  },
  {
    title: 'Board Prep Session',
    at: '2025-04-14T15:00:00',
    duration: '1:05:20',
    durationSec: 65 * 60 + 20,
    size: '740 MB',
    views: 9,
    sharedBy: 'Sarah Johnson',
    moreCount: 1,
    description: 'Board deck walkthrough and narrative rehearsal.',
  },
  {
    title: 'UX Research Playback',
    at: '2025-04-12T13:20:00',
    duration: '55:04',
    durationSec: 55 * 60 + 4,
    size: '610 MB',
    views: 33,
    sharedBy: 'Annette Black',
    moreCount: 5,
    description: 'Usability study highlights and recommended design changes.',
  },
  {
    title: 'Partnership Kickoff Call',
    at: '2025-04-10T10:00:00',
    duration: '40:18',
    durationSec: 40 * 60 + 18,
    size: '420 MB',
    views: 14,
    sharedBy: 'Darrell Steward',
    moreCount: 3,
    description: 'Partner onboarding scope, timelines, and joint GTM plan.',
  },
  {
    title: 'Support Escalation Review',
    at: '2025-04-08T16:40:00',
    duration: '29:55',
    durationSec: 29 * 60 + 55,
    size: '290 MB',
    views: 8,
    sharedBy: 'Cameron Williamson',
    moreCount: 2,
    description: 'Escalation trends and process improvements.',
  },
  {
    title: 'Content Calendar Workshop',
    at: '2025-04-05T12:00:00',
    duration: '51:40',
    durationSec: 51 * 60 + 40,
    size: '555 MB',
    views: 21,
    sharedBy: 'Leslie Alexander',
    moreCount: 4,
    description: 'Editorial themes and publishing cadence for the next month.',
  },
  {
    title: 'Infra Cost Review',
    at: '2025-04-02T09:15:00',
    duration: '33:12',
    durationSec: 33 * 60 + 12,
    size: '360 MB',
    views: 12,
    sharedBy: 'Jacob Jones',
    moreCount: 1,
    description: 'Cloud spend analysis and optimization opportunities.',
  },
  {
    title: 'Hiring Panel Round 2',
    at: '2025-03-28T14:30:00',
    duration: '44:00',
    durationSec: 44 * 60,
    size: '470 MB',
    views: 5,
    sharedBy: 'Sarah Johnson',
    moreCount: 0,
    description: 'Candidate debrief and hiring decision notes.',
  },
  {
    title: 'API Design Walkthrough',
    at: '2025-03-25T11:10:00',
    duration: '1:02:45',
    durationSec: 62 * 60 + 45,
    size: '705 MB',
    views: 29,
    sharedBy: 'Darrell Steward',
    moreCount: 6,
    description: 'Public API versioning strategy and breaking-change policy.',
  },
  {
    title: 'Brand Refresh Sync',
    at: '2025-03-20T15:45:00',
    duration: '37:28',
    durationSec: 37 * 60 + 28,
    size: '400 MB',
    views: 16,
    sharedBy: 'Annette Black',
    moreCount: 3,
    description: 'Visual identity updates and rollout plan across products.',
  },
  {
    title: 'Ops Incident Retro',
    at: '2025-03-15T10:20:00',
    duration: '58:11',
    durationSec: 58 * 60 + 11,
    size: '640 MB',
    views: 35,
    sharedBy: 'Cameron Williamson',
    moreCount: 8,
    description: 'Post-incident timeline, root cause, and action items.',
  },
  {
    title: 'Finance Monthly Close',
    at: '2025-03-10T09:00:00',
    duration: '46:05',
    durationSec: 46 * 60 + 5,
    size: '490 MB',
    views: 10,
    sharedBy: 'Sarah Johnson',
    moreCount: 2,
    description: 'Month-end close status and reporting deadlines.',
  },
  {
    title: 'Demo Day Rehearsal',
    at: '2025-03-05T16:00:00',
    duration: '1:18:30',
    durationSec: 78 * 60 + 30,
    size: '920 MB',
    views: 48,
    sharedBy: 'Jacob Jones',
    moreCount: 9,
    description: 'Full product demo rehearsal with timing and Q&A practice.',
  },
  {
    title: 'Legal Contract Review',
    at: '2025-02-28T13:30:00',
    duration: '25:50',
    durationSec: 25 * 60 + 50,
    size: '210 MB',
    views: 4,
    sharedBy: 'Leslie Alexander',
    moreCount: 0,
    description: 'Contract redlines and open negotiation points.',
  },
  {
    title: 'Onboarding Cohort Intro',
    at: '2025-02-20T11:00:00',
    duration: '42:15',
    durationSec: 42 * 60 + 15,
    size: '430 MB',
    views: 20,
    sharedBy: 'Ronald Richards',
    moreCount: 5,
    description: 'New-hire orientation overview and team introductions.',
  },
];

const SHARED_AVATAR: Record<string, string> = {
  'Sarah Johnson': AV[4],
  'Jacob Jones': AV[0],
  'Leslie Alexander': AV[1],
  'Darrell Steward': AV[2],
  'Ronald Richards': AV[5],
  'Annette Black': AV[3],
  'Cameron Williamson': AV[0],
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export const ALL_RECORDINGS: RecordingRow[] = SEED.map((s, i) => ({
  id: String(i + 1),
  title: s.title,
  meeting: s.title,
  at: s.at,
  date: formatDate(s.at),
  time: formatTime(s.at),
  duration: s.duration,
  durationSec: s.durationSec,
  size: s.size,
  views: s.views,
  thumb: TH[i % TH.length],
  avatars: [AV[i % 6], AV[(i + 1) % 6], AV[(i + 2) % 6]].slice(
    0,
    s.moreCount === 0 ? 2 : 3,
  ),
  moreCount: s.moreCount,
  sharedBy: {
    name: s.sharedBy,
    avatar: SHARED_AVATAR[s.sharedBy] ?? AV[0],
  },
  description: s.description,
}));

export const RECORDING_SHARED_BY_OPTIONS = [
  ...new Set(ALL_RECORDINGS.map((r) => r.sharedBy.name)),
].sort();

export function getRecordingById(id: string): RecordingRow | undefined {
  return ALL_RECORDINGS.find((r) => r.id === id);
}

export function getRelatedRecordings(id: string, limit = 4): RecordingRow[] {
  return ALL_RECORDINGS.filter((r) => r.id !== id).slice(0, limit);
}

export function formatPlayerTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
}
