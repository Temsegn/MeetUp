export type ConversationFilter = 'All' | 'Unread' | 'Direct' | 'Groups';

export type Conversation = {
  id: number;
  name: string;
  time: string;
  preview: string;
  unread?: number;
  isGroup?: boolean;
  avatar: string;
  email?: string;
  online?: boolean;
  about?: string;
  localTime?: string;
};

export type ChatMessage = {
  id: number;
  sender: 'me' | 'them';
  text: string;
  time: string;
  date?: string;
  dateBreakAfter?: string;
  attachment?: { name: string; size: string };
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    name: 'Jacob Jones',
    time: '10:32 AM',
    preview: 'Hey Sarah, can you share the latest...',
    unread: 2,
    avatar: '/dashboard/avatar-1.jpg',
    email: 'jacob.j@example.com',
    online: true,
    about: 'Product Manager at Samtal',
    localTime: '10:32 AM local time',
  },
  {
    id: 2,
    name: 'Product Team',
    time: '9:45 AM',
    preview: "Leslie: Here's the updated roadmap",
    unread: 5,
    isGroup: true,
    avatar: '/dashboard/avatar-2.jpg',
  },
  {
    id: 3,
    name: 'Leslie Alexander',
    time: '9:30 AM',
    preview: 'Thanks for the update! 🙌',
    unread: 1,
    avatar: '/dashboard/avatar-2.jpg',
    email: 'leslie.a@example.com',
    online: true,
    about: 'Design Lead',
  },
  {
    id: 4,
    name: 'Design Team',
    time: 'Yesterday',
    preview: 'You: Great work everyone!',
    isGroup: true,
    avatar: '/dashboard/avatar-3.jpg',
  },
  {
    id: 5,
    name: 'Darnell Steward',
    time: 'Yesterday',
    preview: 'Can we schedule a quick call?',
    avatar: '/dashboard/avatar-3.jpg',
    email: 'darnell.s@example.com',
  },
  {
    id: 6,
    name: 'Marketing Team',
    time: 'May 21',
    preview: 'Annette: Campaign assets are ready',
    isGroup: true,
    avatar: '/dashboard/avatar-4.jpg',
  },
  {
    id: 7,
    name: 'Annette Black',
    time: 'May 20',
    preview: 'Sounds good!',
    avatar: '/dashboard/avatar-4.jpg',
    email: 'annette.b@example.com',
  },
  {
    id: 8,
    name: 'Ronald Richards',
    time: 'May 20',
    preview: 'Please review the meeting notes.',
    avatar: '/dashboard/avatar-5.jpg',
  },
  {
    id: 9,
    name: 'Cody Fisher',
    time: 'May 19',
    preview: 'Thanks Sarah!',
    avatar: '/dashboard/avatar-6.jpg',
  },
];

export const MESSAGES_BY_CONV: Record<number, ChatMessage[]> = {
  1: [
    {
      id: 1,
      sender: 'them',
      text: 'Hi Sarah, just checking in on the Product Team Weekly Sync. Can you share the latest update on the project?',
      time: '10:30 AM',
      date: 'May 22, 2025',
    },
    {
      id: 2,
      sender: 'me',
      text: "Hi Jacob! Yes, absolutely.\nHere's the latest update on the project.",
      time: '10:31 AM',
      attachment: { name: 'project-update.pdf', size: '2.4 MB' },
    },
    {
      id: 3,
      sender: 'them',
      text: 'Thanks! Also, when is our next sync meeting?',
      time: '10:32 AM',
    },
    {
      id: 4,
      sender: 'me',
      text: 'Our next sync is scheduled for May 26, 2025 at 11:00 AM.',
      time: '10:32 AM',
      dateBreakAfter: 'Today',
    },
    {
      id: 5,
      sender: 'them',
      text: 'Perfect, thank you! 🙌',
      time: '10:33 AM',
    },
  ],
};

export const SHARED_MEDIA = [
  { name: 'project-upda...', type: 'pdf' as const, color: 'bg-[#F87171]' },
  { name: 'roadmap.png', type: 'image' as const, color: 'bg-[#93C5FD]' },
  { name: 'notes.docx', type: 'doc' as const, color: 'bg-[#60A5FA]' },
];

export const SHARED_LINKS = [
  { title: 'Product Roadmap', url: 'docs.samtal.com/roadmap' },
  { title: 'Project Plan', url: 'docs.samtal.com/project-plan' },
];

export const SHARED_MEETING = {
  title: 'Product Team Weekly Sync',
  meta: 'May 19, 2025 · 45:12',
};

export function filterConversations(
  list: Conversation[],
  filter: ConversationFilter,
  query: string,
): Conversation[] {
  let out = list;
  if (filter === 'Unread') out = out.filter((c) => (c.unread ?? 0) > 0);
  if (filter === 'Direct') out = out.filter((c) => !c.isGroup);
  if (filter === 'Groups') out = out.filter((c) => c.isGroup);
  if (query.trim()) {
    const q = query.toLowerCase();
    out = out.filter(
      (c) => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
    );
  }
  return out;
}
