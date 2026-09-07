import { Edit, Search } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import {
  CONVERSATIONS,
  filterConversations,
  type ConversationFilter,
} from '../data/messages.data';

const TABS: { label: ConversationFilter; badge?: number }[] = [
  { label: 'All' },
  { label: 'Unread', badge: 3 },
  { label: 'Direct' },
  { label: 'Groups' },
];

type Props = {
  activeId: number | null;
  onSelect: (id: number) => void;
  filter: ConversationFilter;
  onFilterChange: (f: ConversationFilter) => void;
  query: string;
  onQueryChange: (q: string) => void;
  className?: string;
};

export function ConversationList({
  activeId,
  onSelect,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  className,
}: Props) {
  const items = filterConversations(CONVERSATIONS, filter, query);

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[#F1F4F8] p-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search messages..."
            className="h-8 w-full rounded-lg border border-[#E1E7EE] bg-white pl-8 pr-2 text-[11px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-1 focus:ring-[#016BE6]/20"
          />
        </div>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#016BE6] text-white hover:bg-[#0056EF]"
          aria-label="New message"
        >
          <Edit className="size-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-[#F1F4F8] px-2 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => onFilterChange(tab.label)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold',
              filter === tab.label
                ? 'bg-[#E8F1FF] text-[#016BE6]'
                : 'text-[#6F7B8C] hover:bg-[#F1F5F9]',
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-[#016BE6] px-1 text-[9px] font-bold text-white">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[#8A94A6]">No conversations found.</p>
        ) : (
          items.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                activeId === conv.id ? 'bg-[#E8F1FF]' : 'hover:bg-[#F8FAFC]',
              )}
            >
              <div className="relative shrink-0">
                <UserAvatar name={conv.name} avatarUrl={conv.avatar} size="md" />
                {conv.online ? (
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[12px] font-semibold text-[#151D2B]">
                    {conv.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#94A3B8]">{conv.time}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] text-[#6F7B8C]">{conv.preview}</span>
                  {conv.unread ? (
                    <span className="shrink-0 rounded-full bg-[#016BE6] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {conv.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-[#F1F4F8] p-2.5">
        <button type="button" className="text-[11px] font-semibold text-[#016BE6] hover:underline">
          View all messages
        </button>
      </div>
    </section>
  );
}
