import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, UserPlus } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import {
  workspaceService,
  type CreatedInvite,
  type WorkspaceInvite,
  type WorkspaceMember,
} from '../../../services/workspace/workspace.service';

export function MembersPage() {
  const { activeWorkspace, user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<CreatedInvite | null>(null);

  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const isOwner = activeWorkspace?.role === 'owner';

  const reload = useCallback(async () => {
    if (!activeWorkspace?.workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      if (canManage) {
        const [memberRows, inviteRows] = await Promise.all([
          workspaceService.listMembers(activeWorkspace.workspaceId),
          workspaceService.listInvites(activeWorkspace.workspaceId),
        ]);
        setMembers(memberRows);
        setInvites(inviteRows);
      } else {
        const directory = await workspaceService.listDirectory(activeWorkspace.workspaceId);
        setMembers(
          directory.map((d) => ({
            id: d.userId,
            workspaceId: activeWorkspace.workspaceId,
            userId: d.userId,
            role: d.role,
            status: 'active',
            name: d.name,
            email: d.email,
            phone: d.phone,
            avatarUrl: d.avatarUrl,
            avatarColor: d.avatarColor,
            createdAt: new Date().toISOString(),
          })),
        );
        setInvites([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.workspaceId, canManage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const invite = async () => {
    if (!activeWorkspace?.workspaceId || !email.trim() || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await workspaceService.invite(activeWorkspace.workspaceId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      setLastInvite(created);
      setName('');
      setEmail('');
      setPhone('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, nextRole: 'admin' | 'member') => {
    if (!activeWorkspace?.workspaceId) return;
    setBusy(true);
    try {
      await workspaceService.changeRole(activeWorkspace.workspaceId, userId, nextRole);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    if (!window.confirm('Remove this member from the workspace?')) return;
    setBusy(true);
    try {
      await workspaceService.removeMember(activeWorkspace.workspaceId, userId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove member.');
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    if (!window.confirm('Revoke this pending invite?')) return;
    setBusy(true);
    try {
      await workspaceService.revokeInvite(activeWorkspace.workspaceId, inviteId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invite.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-[#E8ECF1] px-3.5 pt-3.5 pb-3 sm:px-5 md:pl-6 lg:pr-6">
          <AppHeader
            title="Members"
            subtitle="Invite people by email, manage roles, and remove members."
          />
        </div>

        <div className="space-y-4 px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
          {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}

          {canManage ? (
            <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center gap-2">
                <UserPlus className="size-4 text-[#016BE6]" />
                <h2 className="text-[13px] font-semibold text-[#151D2B]">Invite member</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-[12px] font-semibold text-[#475569]">
                  Full name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[#475569]">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[#475569]">
                  Phone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966…"
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[#475569]">
                  Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none"
                  >
                    <option value="member">Member</option>
                    {isOwner ? <option value="admin">Admin</option> : null}
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={busy || !email.trim() || !name.trim()}
                onClick={() => void invite()}
                className="mt-3 h-10 rounded-xl bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
              >
                Send invite email
              </button>
              {lastInvite ? (
                <div className="mt-3 space-y-2 rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-2 text-[12px] text-[#334155]">
                  {lastInvite.emailSent ? (
                    <p>
                      Invite emailed to <strong>{lastInvite.email}</strong>
                      {lastInvite.temporaryPasswordIssued
                        ? '. They open the invite link and choose their own password.'
                        : '. They can accept with their existing account password.'}
                    </p>
                  ) : (
                    <p className="text-[#B45309]">
                      Invite created for <strong>{lastInvite.email}</strong>, but the email was not
                      delivered
                      {lastInvite.emailError ? ` (${lastInvite.emailError})` : ''}.
                      {lastInvite.emailMode === 'console'
                        ? ' Configure SMTP_HOST / SMTP_USER / SMTP_PASS on the backend, or share the link below.'
                        : ' Share the link below, then fix SMTP settings.'}
                    </p>
                  )}
                  {lastInvite.joinUrl || lastInvite.token ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="max-w-full flex-1 truncate rounded-md bg-white px-2 py-1 text-[11px] text-[#016BE6]">
                        {lastInvite.joinUrl ??
                          `${window.location.origin}/auth/invite?token=${encodeURIComponent(lastInvite.token)}`}
                      </code>
                      <button
                        type="button"
                        className="rounded-lg border border-[#016BE6] px-2.5 py-1 text-[11px] font-semibold text-[#016BE6] hover:bg-[#E8F1FF]"
                        onClick={() => {
                          const url =
                            lastInvite.joinUrl ??
                            `${window.location.origin}/auth/invite?token=${encodeURIComponent(lastInvite.token)}`;
                          void navigator.clipboard.writeText(url);
                        }}
                      >
                        Copy link
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#F1F4F8] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[#151D2B]">
                Team ({members.length})
              </h2>
            </div>
            {loading ? (
              <p className="p-4 text-[12px] text-[#8A94A6]">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="p-4 text-[12px] text-[#8A94A6]">No members yet.</p>
            ) : (
              <ul className="divide-y divide-[#F1F4F8]">
                {members.map((member) => {
                  const isSelf = member.userId === user?.id;
                  return (
                    <li key={member.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <UserAvatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        avatarColor={member.avatarColor}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                          {member.name}
                          {isSelf ? ' (You)' : ''}
                        </p>
                        <p className="truncate text-[11px] text-[#8A94A6]">
                          {member.email}
                          {member.phone ? ` · ${member.phone}` : ''}
                        </p>
                      </div>
                      <span className="rounded-lg border border-[#E8ECF1] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#475569]">
                        {member.role}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isSelf ? (
                          <Link
                            to={`/app/messages?user=${member.userId}`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E1E7EE] px-2.5 text-[11px] font-semibold text-[#016BE6] hover:bg-[#F8FAFC]"
                          >
                            <MessageSquare className="size-3.5" />
                            Chat
                          </Link>
                        ) : null}
                        {isOwner && member.role !== 'owner' ? (
                          <select
                            value={member.role}
                            disabled={busy}
                            onChange={(e) => void changeRole(member.userId, e.target.value as 'admin' | 'member')}
                            className="h-8 rounded-lg border border-[#E1E7EE] px-2 text-[11px]"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : null}
                        {canManage && member.role !== 'owner' && !isSelf ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void remove(member.userId)}
                            className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canManage ? (
            <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="mb-3 text-[13px] font-semibold text-[#151D2B]">
                Pending invites ({invites.length})
              </h2>
              {invites.length === 0 ? (
                <p className="text-[12px] text-[#8A94A6]">No pending invites.</p>
              ) : (
                <ul className="space-y-2">
                  {invites.map((inviteRow) => (
                    <li
                      key={inviteRow.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#F1F4F8] px-3 py-2"
                    >
                      <div>
                        <p className="text-[12px] font-semibold text-[#151D2B]">
                          {inviteRow.name || inviteRow.email}
                        </p>
                        <p className="text-[11px] text-[#8A94A6]">
                          {inviteRow.email}
                          {inviteRow.phone ? ` · ${inviteRow.phone}` : ''} · {inviteRow.role} · expires{' '}
                          {new Date(inviteRow.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revokeInvite(inviteRow.id)}
                        className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
