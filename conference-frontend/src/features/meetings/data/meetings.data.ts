export type MeetingStatus = 'live' | 'upcoming' | 'ended' | 'cancelled';

export type MeetingParticipant = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email?: string;
};

export type MeetingAgendaItem = {
  id: string;
  title: string;
  duration: string;
};

export type ListedMeeting = {
  id: string;
  title: string;
  status: MeetingStatus;
  date: string;
  /** ISO-ish date for filtering, e.g. 2026-08-23 */
  dateKey: string;
  time: string;
  /** 24h start for filter, e.g. 10:30 */
  timeKey: string;
  duration: string;
  durationMinutes: number;
  participants: number;
  host: string;
  hostUserId?: string;
  hostAvatarUrl?: string | null;
  hostAvatarColor?: string | null;
  description?: string;
  roomId?: string;
  recordingId?: string;
  agenda?: MeetingAgendaItem[];
  participantList?: MeetingParticipant[];
  /** Profile images for host + other participants (list cards). */
  people?: Array<{
    name: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  }>;
};

export const DEMO_AVATARS = [
  '/dashboard/avatar-1.jpg',
  '/dashboard/avatar-2.jpg',
  '/dashboard/avatar-3.jpg',
  '/dashboard/avatar-4.jpg',
  '/dashboard/avatar-5.jpg',
  '/dashboard/avatar-6.jpg',
] as const;

export const MEETINGS: ListedMeeting[] = [
  {
    id: 'm-live-1',
    title: 'Product Team Weekly Sync',
    status: 'live',
    date: 'Aug 23, 2026',
    dateKey: '2026-08-23',
    time: '10:30 AM',
    timeKey: '10:30',
    duration: '45 min',
    durationMinutes: 45,
    participants: 8,
    host: 'Sarah Lee',
    roomId: 'weekly-sync',
    description: 'Weekly sync on roadmap, blockers, and sprint goals.',
    agenda: [
      { id: 'a1', title: 'Sprint progress', duration: '10 min' },
      { id: 'a2', title: 'Blockers & risks', duration: '15 min' },
      { id: 'a3', title: 'Next week priorities', duration: '20 min' },
    ],
    participantList: [
      { id: 'p1', name: 'Sarah Lee', role: 'Host', avatar: DEMO_AVATARS[0], email: 'sarah@samtal.com' },
      { id: 'p2', name: 'Jacob Jones', role: 'Presenter', avatar: DEMO_AVATARS[1] },
      { id: 'p3', name: 'Leslie Alexander', role: 'Participant', avatar: DEMO_AVATARS[2] },
      { id: 'p4', name: 'Darnell Steward', role: 'Participant', avatar: DEMO_AVATARS[3] },
    ],
  },
  {
    id: 'm-live-2',
    title: 'Design Critique Live',
    status: 'live',
    date: 'Aug 23, 2026',
    dateKey: '2026-08-23',
    time: '11:00 AM',
    timeKey: '11:00',
    duration: '30 min',
    durationMinutes: 30,
    participants: 5,
    host: 'Leslie Alexander',
    roomId: 'design-critique',
    description: 'Live review of the new Messages and Meetings UI.',
    participantList: [
      { id: 'p1', name: 'Leslie Alexander', role: 'Host', avatar: DEMO_AVATARS[2] },
      { id: 'p2', name: 'Sarah Lee', role: 'Participant', avatar: DEMO_AVATARS[0] },
    ],
  },
  {
    id: 'm-up-1',
    title: 'Client Presentation',
    status: 'upcoming',
    date: 'Aug 24, 2026',
    dateKey: '2026-08-24',
    time: '02:00 PM',
    timeKey: '14:00',
    duration: '60 min',
    durationMinutes: 60,
    participants: 12,
    host: 'Jacob Jones',
    roomId: 'client-presentation',
    description: 'Present Q3 product roadmap and demo to Acme stakeholders.',
    agenda: [
      { id: 'a1', title: 'Introductions', duration: '5 min' },
      { id: 'a2', title: 'Product demo', duration: '25 min' },
      { id: 'a3', title: 'Q&A', duration: '20 min' },
      { id: 'a4', title: 'Next steps', duration: '10 min' },
    ],
    participantList: [
      { id: 'p1', name: 'Jacob Jones', role: 'Host', avatar: DEMO_AVATARS[1], email: 'jacob@samtal.com' },
      { id: 'p2', name: 'Sarah Lee', role: 'Co-host', avatar: DEMO_AVATARS[0] },
      { id: 'p3', name: 'Annette Black', role: 'Client', avatar: DEMO_AVATARS[4] },
      { id: 'p4', name: 'Cody Fisher', role: 'Client', avatar: DEMO_AVATARS[5] },
      { id: 'p5', name: 'Devon Lane', role: 'Participant', avatar: DEMO_AVATARS[3] },
    ],
  },
  {
    id: 'm-up-2',
    title: 'Marketing Strategy Review',
    status: 'upcoming',
    date: 'Aug 25, 2026',
    dateKey: '2026-08-25',
    time: '04:30 PM',
    timeKey: '16:30',
    duration: '45 min',
    durationMinutes: 45,
    participants: 7,
    host: 'Annette Black',
    roomId: 'marketing-review',
    description: 'Campaign performance and next-quarter planning.',
    agenda: [
      { id: 'a1', title: 'Campaign KPIs', duration: '15 min' },
      { id: 'a2', title: 'Channel mix', duration: '15 min' },
      { id: 'a3', title: 'Budget asks', duration: '15 min' },
    ],
    participantList: [
      { id: 'p1', name: 'Annette Black', role: 'Host', avatar: DEMO_AVATARS[4] },
      { id: 'p2', name: 'Sarah Lee', role: 'Participant', avatar: DEMO_AVATARS[0] },
      { id: 'p3', name: 'Ronald Richards', role: 'Participant', avatar: DEMO_AVATARS[5] },
    ],
  },
  {
    id: 'm-up-3',
    title: '1:1 with Jacob Jones',
    status: 'upcoming',
    date: 'Aug 26, 2026',
    dateKey: '2026-08-26',
    time: '11:00 AM',
    timeKey: '11:00',
    duration: '30 min',
    durationMinutes: 30,
    participants: 2,
    host: 'Sarah Lee',
    roomId: 'one-on-one-jacob',
    description: 'Career check-in and project priorities.',
    participantList: [
      { id: 'p1', name: 'Sarah Lee', role: 'Host', avatar: DEMO_AVATARS[0] },
      { id: 'p2', name: 'Jacob Jones', role: 'Participant', avatar: DEMO_AVATARS[1] },
    ],
  },
  {
    id: 'm-end-1',
    title: 'Design System Discussion',
    status: 'ended',
    date: 'Aug 21, 2026',
    dateKey: '2026-08-21',
    time: '09:30 AM',
    timeKey: '09:30',
    duration: '50 min',
    durationMinutes: 50,
    participants: 6,
    host: 'Leslie Alexander',
    recordingId: 'rec-1',
    description: 'Reviewed component tokens and spacing rules.',
    agenda: [
      { id: 'a1', title: 'Token audit', duration: '20 min' },
      { id: 'a2', title: 'Spacing scale', duration: '15 min' },
      { id: 'a3', title: 'Action items', duration: '15 min' },
    ],
    participantList: [
      { id: 'p1', name: 'Leslie Alexander', role: 'Host', avatar: DEMO_AVATARS[2] },
      { id: 'p2', name: 'Sarah Lee', role: 'Participant', avatar: DEMO_AVATARS[0] },
      { id: 'p3', name: 'Darnell Steward', role: 'Participant', avatar: DEMO_AVATARS[3] },
    ],
  },
  {
    id: 'm-end-2',
    title: 'Sprint Planning',
    status: 'ended',
    date: 'Aug 20, 2026',
    dateKey: '2026-08-20',
    time: '01:00 PM',
    timeKey: '13:00',
    duration: '75 min',
    durationMinutes: 75,
    participants: 10,
    host: 'Sarah Lee',
    recordingId: 'rec-2',
    description: 'Committed stories for the next two-week sprint.',
    agenda: [
      { id: 'a1', title: 'Capacity check', duration: '10 min' },
      { id: 'a2', title: 'Backlog grooming', duration: '40 min' },
      { id: 'a3', title: 'Commitments', duration: '25 min' },
    ],
    participantList: [
      { id: 'p1', name: 'Sarah Lee', role: 'Host', avatar: DEMO_AVATARS[0] },
      { id: 'p2', name: 'Jacob Jones', role: 'Participant', avatar: DEMO_AVATARS[1] },
      { id: 'p3', name: 'Cody Fisher', role: 'Participant', avatar: DEMO_AVATARS[5] },
      { id: 'p4', name: 'Annette Black', role: 'Participant', avatar: DEMO_AVATARS[4] },
    ],
  },
  {
    id: 'm-end-3',
    title: 'All-Hands Kickoff',
    status: 'ended',
    date: 'Aug 18, 2026',
    dateKey: '2026-08-18',
    time: '10:00 AM',
    timeKey: '10:00',
    duration: '40 min',
    durationMinutes: 40,
    participants: 24,
    host: 'Sarah Lee',
    recordingId: 'rec-3',
    description: 'Company updates and Q3 goals.',
    participantList: [
      { id: 'p1', name: 'Sarah Lee', role: 'Host', avatar: DEMO_AVATARS[0] },
      { id: 'p2', name: 'Jacob Jones', role: 'Participant', avatar: DEMO_AVATARS[1] },
    ],
  },
];

export type MeetingStatusFilter = 'all' | MeetingStatus;

export type MeetingListFilters = {
  query: string;
  date: string;
  time: string;
  status: MeetingStatusFilter;
};

export const DEFAULT_MEETING_FILTERS: MeetingListFilters = {
  query: '',
  date: '',
  time: '',
  status: 'all',
};

const STATUS_ORDER: Record<MeetingStatus, number> = {
  live: 0,
  upcoming: 1,
  ended: 2,
  cancelled: 3,
};

export function getMeetingById(id: string): ListedMeeting | undefined {
  return MEETINGS.find((m) => m.id === id);
}

export function filterMeetings(
  list: ListedMeeting[],
  filters: MeetingListFilters,
): ListedMeeting[] {
  const q = filters.query.trim().toLowerCase();
  return list
    .filter((m) => {
      if (filters.status !== 'all' && m.status !== filters.status) return false;
      if (filters.date && m.dateKey !== filters.date) return false;
      if (filters.time && !m.timeKey.startsWith(filters.time.slice(0, 5))) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.host.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return b.dateKey.localeCompare(a.dateKey) || b.timeKey.localeCompare(a.timeKey);
    });
}

export function computeMeetingStats(list: ListedMeeting[]) {
  const totalMeetings = list.length;
  const totalMinutes = list.reduce((sum, m) => sum + m.durationMinutes, 0);
  const totalParticipants = list.reduce((sum, m) => sum + m.participants, 0);
  const liveNow = list.filter((m) => m.status === 'live').length;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return {
    totalMeetings: String(totalMeetings),
    totalTime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    totalParticipants: String(totalParticipants),
    liveNow: String(liveNow),
  };
}

export const STATUS_META: Record<
  MeetingStatus,
  { label: string; badge: string; dot: string }
> = {
  live: {
    label: 'Live now',
    badge: 'border-[#FECACA] bg-white text-[#DC2626]',
    dot: 'bg-[#EF4444]',
  },
  upcoming: {
    label: 'Upcoming',
    badge: 'border-[#BFDBFE] bg-white text-[#016BE6]',
    dot: 'bg-[#016BE6]',
  },
  ended: {
    label: 'Ended',
    badge: 'border-[#E1E7EE] bg-white text-[#64748B]',
    dot: 'bg-[#94A3B8]',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'border-[#FDE68A] bg-white text-[#B45309]',
    dot: 'bg-[#F59E0B]',
  },
};
