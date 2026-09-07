import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import {
  workspaceService,
  type WorkspaceInvite,
  type WorkspaceMember,
} from '../../../services/workspace/workspace.service';
import { MembersSettingsSkeleton } from './SettingsSkeletons';

type RowStatus = 'active' | 'inactive' | 'pending';

type TableRow =
  | {
      kind: 'member';
      key: string;
      name: string;
      email: string;
      role: 'owner' | 'admin' | 'member';
      department: string;
      joinedOn: string;
      status: RowStatus;
      userId: string;
      avatarUrl: string | null;
      avatarColor?: string | null;
      member: WorkspaceMember;
    }
  | {
      kind: 'invite';
      key: string;
      name: string;
      email: string;
      role: 'admin' | 'member';
      department: string;
      joinedOn: string;
      status: 'pending';
      invite: WorkspaceInvite;
    };

const INPUT =
  'h-9 rounded-[14px] border border-[#E1E7EE] bg-white text-[12px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';

function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: RowStatus }) {
  const styles: Record<RowStatus, string> = {
    active: 'bg-[#ECFDF3] text-[#027A48]',
    inactive: 'bg-[#FEF2F2] text-[#B91C1C]',
    pending: 'bg-[#FFF7ED] text-[#C2410C]',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold capitalize',
        styles[status],
      )}
    >
      {label}
    </span>
  );
}

export function MembersSettingsPanel({ onInviteMembers }: { onInviteMembers: () => void }) {
  const { activeWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editInviteDialogRef = useRef<HTMLDialogElement>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<WorkspaceInvite | null>(null);
  const [editInviteName, setEditInviteName] = useState('');
  const [editInviteEmail, setEditInviteEmail] = useState('');
  const [editInvitePhone, setEditInvitePhone] = useState('');
  const [editInviteRole, setEditInviteRole] = useState<'admin' | 'member'>('member');

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
            jobTitle: d.jobTitle,
            department: d.department,
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

  useEffect(() => {
    const state = location.state as { createdUserMessage?: string } | null;
    if (state?.createdUserMessage) {
      setMessage(state.createdUserMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!menuKey) return;
    const onPointer = () => setMenuKey(null);
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuKey]);

  const rows: TableRow[] = useMemo(() => {
    const memberRows: TableRow[] = members.map((m) => ({
      kind: 'member',
      key: `m-${m.userId}`,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department?.trim() || '—',
      joinedOn: formatJoined(m.createdAt),
      status: m.status === 'inactive' ? 'inactive' : 'active',
      userId: m.userId,
      avatarUrl: m.avatarUrl,
      avatarColor: m.avatarColor,
      member: m,
    }));
    const inviteRows: TableRow[] = invites.map((inv) => ({
      kind: 'invite',
      key: `i-${inv.id}`,
      name: inv.name || inv.email,
      email: inv.email,
      role: inv.role,
      department: '—',
      joinedOn: formatJoined(inv.createdAt),
      status: 'pending',
      invite: inv,
    }));
    return [...memberRows, ...inviteRows];
  }, [members, invites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== 'All Roles' && row.role !== roleFilter.toLowerCase()) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
    });
  }, [rows, query, roleFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, total);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, pageSize]);

  const changeRole = async (userId: string, nextRole: 'admin' | 'member') => {
    if (!activeWorkspace?.workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.changeRole(activeWorkspace.workspaceId, userId, nextRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: nextRole } : m)),
      );
      setMessage('Role updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role.');
    } finally {
      setBusy(false);
    }
  };

  const openView = (member: WorkspaceMember) => {
    setMenuKey(null);
    navigate(`/app/settings/members/${member.userId}`);
  };

  const openEdit = (member: WorkspaceMember) => {
    setMenuKey(null);
    navigate(`/app/settings/members/${member.userId}/edit`);
  };

  const setStatus = async (userId: string, status: 'active' | 'inactive') => {
    if (!activeWorkspace?.workspaceId) return;
    const label = status === 'inactive' ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${label} this member?`)) return;
    setBusy(true);
    setError(null);
    setMenuKey(null);
    try {
      await workspaceService.setMemberStatus(activeWorkspace.workspaceId, userId, status);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, status } : m)));
      setMessage(status === 'inactive' ? 'Member deactivated.' : 'Member activated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${label.toLowerCase()} member.`);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    if (
      !window.confirm(
        'Remove this member from the workspace? This is a soft delete — they leave the list but can be invited again.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await workspaceService.removeMember(activeWorkspace.workspaceId, userId);
      setMessage('Member removed.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete member.');
    } finally {
      setBusy(false);
      setMenuKey(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    if (!window.confirm('Revoke this pending invite?')) return;
    setBusy(true);
    try {
      await workspaceService.revokeInvite(activeWorkspace.workspaceId, inviteId);
      setMessage('Invite revoked.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invite.');
    } finally {
      setBusy(false);
      setMenuKey(null);
    }
  };

  const openEditInvite = (invite: WorkspaceInvite) => {
    setSelectedInvite(invite);
    setEditInviteName(invite.name);
    setEditInviteEmail(invite.email);
    setEditInvitePhone(invite.phone ?? '');
    setEditInviteRole(invite.role);
    setMenuKey(null);
    editInviteDialogRef.current?.showModal();
  };

  const saveEditInvite = async () => {
    if (!activeWorkspace?.workspaceId || !selectedInvite) return;
    setBusy(true);
    setError(null);
    try {
      const result = await workspaceService.updateInvite(
        activeWorkspace.workspaceId,
        selectedInvite.id,
        {
          name: editInviteName.trim(),
          email: editInviteEmail.trim(),
          phone: editInvitePhone.trim() || undefined,
          role: editInviteRole,
        },
      );
      if (result.emailChanged) {
        setMessage(
          result.emailSent
            ? `Invite updated and sent to ${result.invite.email}.`
            : `Invite updated for ${result.invite.email}, but email was not delivered.`,
        );
      } else {
        setMessage('Invite details updated.');
      }
      editInviteDialogRef.current?.close();
      setSelectedInvite(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update invite.');
    } finally {
      setBusy(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    if (!activeWorkspace?.workspaceId) return;
    setBusy(true);
    setError(null);
    setMenuKey(null);
    try {
      const result = await workspaceService.resendInvite(activeWorkspace.workspaceId, inviteId);
      setMessage(
        result.emailSent
          ? `Invitation resent to ${result.email}.`
          : `Invite refreshed for ${result.email}, but email was not delivered.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend invite.');
    } finally {
      setBusy(false);
    }
  };

  const pageNumbers = useMemo(() => {
    const max = Math.min(totalPages, 5);
    const start = Math.min(Math.max(1, safePage - 2), Math.max(1, totalPages - max + 1));
    return Array.from({ length: max }, (_, i) => start + i);
  }, [safePage, totalPages]);

  return (
    <div className="space-y-3">
      {message ? (
        <div
          className="rounded-[14px] border border-[#C7E7D4] bg-[#ECFDF3] px-3.5 py-2 text-[12px] font-medium text-[#027A48]"
          role="status"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-[12px] font-medium text-[#B91C1C]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? <MembersSettingsSkeleton /> : null}

      {!loading ? (
      <section className="rounded-[14px] border border-[#E2E7ED] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#E2E7ED] px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
          <div className="min-w-0 shrink-0">
            <h2 className="text-[16px] font-bold leading-tight tracking-tight text-[#111A2D]">
              Members ({members.length + invites.length})
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-[#6F7C8C]">
              Manage workspace members and their roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 sm:shrink-0 sm:pt-3">
            <label
              className={cn(
                INPUT,
                'flex h-9 w-full items-center gap-2 px-3 sm:w-[200px]',
              )}
            >
              <Search size={14} className="shrink-0 text-[#6F7C8C]" strokeWidth={1.9} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members..."
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#6F7C8C]"
              />
            </label>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={cn(INPUT, 'h-9 w-[120px] appearance-none px-3 pr-8 text-[12px] text-[#111A2D]')}
              >
                <option>All Roles</option>
                <option>Owner</option>
                <option>Admin</option>
                <option>Member</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7C8C]"
              />
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={onInviteMembers}
                className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[#E2E7ED] bg-white px-3.5 text-[12px] font-semibold text-[#1968F2] hover:bg-[#F8FAFC]"
              >
                <UserPlus size={15} strokeWidth={2} className="text-[#1968F2]" />
                Invite Members
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E2E7ED]/70 text-[11px] font-semibold text-[#6F7B8C]">
                <th className="px-3 py-4 font-semibold sm:px-4">Member</th>
                <th className="px-2 py-4 font-semibold">Role</th>
                <th className="px-2 py-4 font-semibold">Department</th>
                <th className="px-2 py-4 font-semibold">Joined On</th>
                <th className="px-2 py-4 font-semibold">Status</th>
                <th className="px-3 py-4 text-right font-semibold sm:px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-[#8A94A6]">
                    No members found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const isYou =
                    row.kind === 'member' && Boolean(user?.id && row.userId === user.id);
                  return (
                    <tr
                      key={row.key}
                      className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]"
                    >
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <UserAvatar
                            name={row.name}
                            avatarUrl={row.kind === 'member' ? row.avatarUrl : null}
                            avatarColor={row.kind === 'member' ? row.avatarColor : null}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                                {row.name}
                              </p>
                              {isYou ? (
                                <span className="shrink-0 rounded-md bg-[#E8F1FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#016BE6]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[11px] text-[#6F7B8C]">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        {row.kind === 'member' &&
                        isOwner &&
                        row.role !== 'owner' &&
                        !isYou ? (
                          <div className="relative inline-block max-w-full">
                            <select
                              value={row.role}
                              disabled={busy}
                              onChange={(e) =>
                                void changeRole(row.userId, e.target.value as 'admin' | 'member')
                              }
                              className="h-7 max-w-full appearance-none rounded-[10px] border border-[#E1E7EE] bg-white py-0 pr-6 pl-2 text-[11px] font-medium capitalize text-[#334155] outline-none"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                            <ChevronDown
                              size={12}
                              className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[#6F7C8C]"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex h-7 max-w-full items-center truncate rounded-[10px] border border-[#E1E7EE] px-2 text-[11px] font-medium capitalize text-[#475569]">
                            {row.role}
                          </span>
                        )}
                      </td>
                      <td className="truncate px-2 py-2.5 text-[12px] text-[#475569]">
                        {row.department}
                      </td>
                      <td className="truncate px-2 py-2.5 text-[12px] text-[#475569]">
                        {row.joinedOn}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="relative px-3 py-2.5 text-right sm:px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuKey((k) => (k === row.key ? null : row.key));
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-[10px] text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569]"
                          aria-label={`Actions for ${row.name}`}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuKey === row.key ? (
                          <div
                            role="menu"
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute top-10 right-3 z-30 w-44 overflow-hidden rounded-[14px] border border-[#E1E7EE] bg-white py-1 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)] sm:right-4"
                          >
                            {row.kind === 'member' ? (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                  onClick={() => openView(row.member)}
                                >
                                  <Eye size={14} className="text-[#016BE6]" />
                                  View
                                </button>
                                {!isYou ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                    onClick={() => {
                                      setMenuKey(null);
                                      navigate(`/app/messages?user=${row.userId}`);
                                    }}
                                  >
                                    <MessageSquare size={14} className="text-[#016BE6]" />
                                    Message
                                  </button>
                                ) : null}
                                {canManage && row.role !== 'owner' && !isYou ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                    onClick={() => openEdit(row.member)}
                                  >
                                    <Pencil size={14} className="text-[#016BE6]" />
                                    Edit
                                  </button>
                                ) : null}
                                {canManage && row.role !== 'owner' && !isYou ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                    onClick={() =>
                                      void setStatus(
                                        row.userId,
                                        row.member.status === 'inactive' ? 'active' : 'inactive',
                                      )
                                    }
                                  >
                                    {row.member.status === 'inactive' ? (
                                      <UserCheck size={14} className="text-[#027A48]" />
                                    ) : (
                                      <UserMinus size={14} className="text-[#C2410C]" />
                                    )}
                                    {row.member.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                  </button>
                                ) : null}
                                {canManage && row.role !== 'owner' && !isYou ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                                    onClick={() => void removeMember(row.userId)}
                                  >
                                    <Trash2 size={14} />
                                    Remove
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                            {row.kind === 'invite' && canManage ? (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                  onClick={() => openEditInvite(row.invite)}
                                >
                                  <Pencil size={14} className="text-[#016BE6]" />
                                  Edit email
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                                  onClick={() => void resendInvite(row.invite.id)}
                                >
                                  <Send size={14} className="text-[#016BE6]" />
                                  Resend invite
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                                  onClick={() => void revokeInvite(row.invite.id)}
                                >
                                  <Trash2 size={14} />
                                  Revoke invite
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[#E2E7ED] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-[11px] text-[#6F7C8C]">
            Showing {pageStart} to {pageEnd} of {total} members
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex size-7 items-center justify-center rounded-full text-[#6F7C8C] hover:bg-[#F8FAFC] disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold',
                  n === safePage
                    ? 'bg-[#016BE6] text-white'
                    : 'text-[#475569] hover:bg-[#F8FAFC]',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex size-7 items-center justify-center rounded-full text-[#6F7C8C] hover:bg-[#F8FAFC] disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="relative sm:justify-self-end">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={cn(INPUT, 'h-8 w-[100px] appearance-none px-2.5 pr-7 text-[11px]')}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[#6F7C8C]"
            />
          </div>
        </div>
      </section>
      ) : null}

      <dialog
        ref={editInviteDialogRef}
        className="w-[min(100%,420px)] rounded-[14px] border border-[#E1E7EE] bg-white p-0 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] backdrop:bg-black/30"
        onClose={() => setSelectedInvite(null)}
      >
        {selectedInvite ? (
          <form
            className="space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void saveEditInvite();
            }}
          >
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-[#016BE6]" />
              <h3 className="text-[15px] font-semibold text-[#151D2B]">Edit pending invite</h3>
            </div>
            <p className="text-[11px] text-[#6F7B8C]">
              Update the invite email if it was wrong. Changing the email sends a new invitation and
              verification link.
            </p>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Full name
              <input
                value={editInviteName}
                onChange={(e) => setEditInviteName(e.target.value)}
                className={cn(INPUT, 'mt-1 w-full px-3')}
                required
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Email
              <input
                type="email"
                value={editInviteEmail}
                onChange={(e) => setEditInviteEmail(e.target.value)}
                className={cn(INPUT, 'mt-1 w-full px-3')}
                required
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Phone (optional)
              <input
                type="tel"
                value={editInvitePhone}
                onChange={(e) => setEditInvitePhone(e.target.value)}
                className={cn(INPUT, 'mt-1 w-full px-3')}
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#475569]">
              Role
              <select
                value={editInviteRole}
                disabled={!isOwner || busy}
                onChange={(e) => setEditInviteRole(e.target.value as 'admin' | 'member')}
                className={cn(INPUT, 'mt-1 w-full px-3')}
              >
                <option value="member">Member</option>
                {isOwner ? <option value="admin">Admin</option> : null}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => editInviteDialogRef.current?.close()}
                className="h-9 rounded-[14px] px-3.5 text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !editInviteEmail.trim() || !editInviteName.trim()}
                className="h-9 rounded-[14px] bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save & resend'}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
