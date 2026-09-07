import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Search,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import { teamsService, type WorkspaceTeam } from '../../../services/teams/teams.service';
import { MembersSettingsSkeleton } from './SettingsSkeletons';

const INPUT =
  'h-9 rounded-[14px] border border-[#E1E7EE] bg-white text-[12px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';

function formatCreatedOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: WorkspaceTeam['status'] }) {
  const styles: Record<WorkspaceTeam['status'], string> = {
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

type Props = {
  onCreateTeam: () => void;
};

export function TeamsSettingsPanel({ onCreateTeam }: Props) {
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canCreate =
    activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<WorkspaceTeam[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!activeWorkspace?.workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await teamsService.list(activeWorkspace.workspaceId);
      setTeams(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams.');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const state = location.state as { createdTeamMessage?: string } | null;
    if (state?.createdTeamMessage) {
      setMessage(state.createdTeamMessage);
      navigate(location.pathname, { replace: true, state: {} });
      void reload();
    }
  }, [location.state, location.pathname, navigate, reload]);

  useEffect(() => {
    if (!menuKey) return;
    const onPointer = () => setMenuKey(null);
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuKey]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((t) => {
      if (statusFilter !== 'All Status' && t.status !== statusFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.teamId.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q)
      );
    });
  }, [teams, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const pageNumbers = useMemo(() => {
    const max = Math.min(3, totalPages);
    const start = Math.min(Math.max(1, safePage - 1), Math.max(1, totalPages - max + 1));
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
                Teams ({teams.length})
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-[#6F7C8C]">
                Manage and organize workspace teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 sm:shrink-0 sm:pt-3">
              <label className={cn(INPUT, 'flex h-9 w-full items-center gap-2 px-3 sm:w-[200px]')}>
                <Search size={14} className="shrink-0 text-[#6F7C8C]" strokeWidth={1.9} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#6F7C8C]"
                />
              </label>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={cn(INPUT, 'h-9 w-[120px] appearance-none px-3 pr-8 text-[12px] text-[#111A2D]')}
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Pending</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7C8C]"
                />
              </div>

              {canCreate ? (
                <button
                  type="button"
                  onClick={onCreateTeam}
                  className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[#E2E7ED] bg-white px-3.5 text-[12px] font-semibold text-[#1968F2] hover:bg-[#F8FAFC]"
                >
                  <Plus size={15} strokeWidth={2.5} className="text-[#1968F2]" />
                  Create Team
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E2E7ED]/70 text-[11px] font-semibold text-[#6F7B8C]">
                  <th className="px-3 py-4 font-semibold sm:px-4">Team Name</th>
                  <th className="px-2 py-4 font-semibold">Team ID</th>
                  <th className="px-2 py-4 font-semibold">Members</th>
                  <th className="px-2 py-4 font-semibold">Department</th>
                  <th className="px-2 py-4 font-semibold">Team Lead</th>
                  <th className="px-2 py-4 font-semibold">Created On</th>
                  <th className="px-2 py-4 font-semibold">Status</th>
                  <th className="px-3 py-4 text-center font-semibold sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-[#8A94A6]">
                      No teams yet. Create your first team.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]"
                    >
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                            style={{ backgroundColor: row.accent }}
                            aria-hidden
                          >
                            {row.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                              {row.name}
                            </p>
                            <p className="truncate text-[11px] text-[#6F7B8C]">
                              {row.description || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-2 py-2.5 font-mono text-[11px] text-[#475569]">
                        {row.teamId}
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-[#475569]">{row.memberCount}</td>
                      <td className="truncate px-2 py-2.5 text-[12px] text-[#475569]">
                        {row.department || '—'}
                      </td>
                      <td className="px-2 py-2.5">
                        {row.leadUserId ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <UserAvatar
                              name={row.leadName}
                              avatarUrl={row.leadAvatarUrl}
                              avatarColor={row.leadAvatarColor}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                                {row.leadName}
                              </p>
                              <p className="truncate text-[11px] text-[#6F7B8C]">
                                {row.leadEmail || '—'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#8A94A6]">—</span>
                        )}
                      </td>
                      <td className="truncate px-2 py-2.5 text-[12px] text-[#475569]">
                        {formatCreatedOn(row.createdAt)}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="relative px-3 py-2.5 text-center sm:px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuKey((k) => (k === row.id ? null : row.id));
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-full border border-[#E8ECF1] bg-white text-[#64748B] shadow-sm hover:border-[#D0D7E2] hover:bg-[#F8FAFC] hover:text-[#334155]"
                          aria-label={`Actions for ${row.name}`}
                        >
                          <MoreVertical size={16} strokeWidth={2.25} />
                        </button>
                        {menuKey === row.id ? (
                          <div
                            role="menu"
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute top-11 right-3 z-30 w-40 overflow-hidden rounded-[14px] border border-[#E1E7EE] bg-white py-1 text-left shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)] sm:right-4"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
                              onClick={() => {
                                setMenuKey(null);
                                setMessage(`${row.name} · ${row.teamId}`);
                              }}
                            >
                              View
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 border-t border-[#E2E7ED] px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
            <p className="text-[11px] text-[#6F7C8C] sm:justify-self-start">
              Showing {from} to {to} of {filtered.length} teams
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
    </div>
  );
}
