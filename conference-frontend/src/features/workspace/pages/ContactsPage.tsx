import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationCenter } from '../../../contexts/NotificationCenterContext';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';

export function ContactsPage() {
  const navigate = useNavigate();
  const { activeWorkspace, user } = useAuth();
  const { pushLocalNotification } = useNotificationCenter();
  const [members, setMembers] = useState<WorkspaceDirectoryMember[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    workspaceService
      .listDirectory(activeWorkspace.workspaceId)
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts.'))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => m.userId !== user?.id)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query, user?.id]);

  const startChat = (member: WorkspaceDirectoryMember) => {
    navigate(`/app/messages?user=${member.userId}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AppHeader title="Contacts" subtitle="People in your workspace you can message." />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#F1F4F8] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="h-9 w-full rounded-lg border border-[#E1E7EE] bg-white pl-9 pr-3 text-[12px] outline-none"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error ? <p className="p-3 text-[12px] text-[#DC2626]">{error}</p> : null}
          {loading ? (
            <p className="p-4 text-[12px] text-[#8A94A6]">Loading contacts…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-[12px] text-[#8A94A6]">
              No teammates yet. Invite members from Workspace → Members, then start chatting.
            </p>
          ) : (
            filtered.map((member) => (
              <div
                key={member.userId}
                className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#F8FAFC]"
              >
                <UserAvatar
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  avatarColor={member.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#151D2B]">{member.name}</p>
                  <p className="truncate text-[11px] text-[#8A94A6]">
                    {member.email} · {member.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startChat(member)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#016BE6] px-2.5 text-[11px] font-semibold text-white hover:bg-[#0056EF]"
                >
                  <MessageSquare className="size-3.5" />
                  Message
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
