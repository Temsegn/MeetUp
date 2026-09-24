import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, ShieldOff, UserX } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { adminApi } from '../api/admin.service';
import {
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  EmptyState,
  FilterChips,
  MenuItem,
  PaginationBar,
  PersonCell,
  RoleChip,
  RowActions,
  SAAS_PRIMARY,
  SearchField,
  SelectField,
  StatusBadge,
  TableSkeleton,
  useDebouncedValue,
} from '../components/AdminUi';

type UserRow = {
  id: string;
  name: string;
  email: string;
  avatarColor?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string;
  platformRole: string;
  accountStatus: string;
};

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('all');
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    next: 'active' | 'suspended' | 'banned';
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .listUsers({ search: debouncedSearch, status: status || undefined, limit: 100, page: 1 })
      .then((res) => {
        setItems((res.items as UserRow[]) ?? []);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  useEffect(() => {
    if (!menuKey) return;
    const onPointer = () => setMenuKey(null);
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, role, pageSize]);

  const filtered = useMemo(() => {
    if (role === 'all') return items;
    return items.filter((u) => u.platformRole === role);
  }, [items, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const applyStatus = async () => {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.setUserStatus(confirm.id, confirm.next);
      setConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle="Manage every account on the platform — roles, access, and account status."
        actions={
          <button type="button" onClick={() => navigate('/admin/users/new')} className={SAAS_PRIMARY}>
            <Plus className="size-3.5" /> Create User
          </button>
        }
      />

      <div className="mb-4">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { key: '', label: 'All' },
            { key: 'active', label: 'Active', dot: 'bg-[#22C55E]' },
            { key: 'suspended', label: 'Suspended', dot: 'bg-[#F97316]' },
            { key: 'banned', label: 'Banned', dot: 'bg-[#EF4444]' },
          ]}
        />
      </div>

      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      {loading ? (
        <AdminTableShell title={`Users (${total})`} subtitle="Search, filter, and take action on platform accounts.">
          <TableSkeleton cols={5} />
        </AdminTableShell>
      ) : (
        <AdminTableShell
          title={`Users (${filtered.length})`}
          subtitle="Search, filter, and take action on platform accounts."
          toolbar={
            <>
              <SearchField value={search} onChange={setSearch} placeholder="Search users..." />
              <SelectField value={role} onChange={setRole} className="w-[150px]">
                <option value="all">All roles</option>
                <option value="none">Member</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </SelectField>
            </>
          }
          footer={
            <PaginationBar
              from={from}
              to={to}
              total={filtered.length}
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
              noun="users"
            />
          }
        >
          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'User' },
                { label: 'Job title' },
                { label: 'Platform role' },
                { label: 'Status' },
                { label: 'Actions', align: 'center' },
              ]}
            />
            <tbody>
              {pageRows.length === 0 ? (
                <EmptyState
                  colSpan={5}
                  title={search || status || role !== 'all' ? 'No users match those filters' : 'No users yet'}
                  description="Create a user to grant platform or organization access."
                  action={
                    <button type="button" onClick={() => navigate('/admin/users/new')} className={SAAS_PRIMARY}>
                      <Plus className="size-3.5" /> Create User
                    </button>
                  }
                />
              ) : (
                pageRows.map((u) => (
                  <tr key={u.id} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-3 py-2.5 sm:px-4">
                      <PersonCell
                        name={u.name}
                        email={u.email}
                        avatarUrl={u.avatarUrl}
                        avatarColor={u.avatarColor}
                        to={`/admin/users/${u.id}`}
                      />
                    </td>
                    <td className="px-2 py-2.5 text-[#475569]">{u.jobTitle || '—'}</td>
                    <td className="px-2 py-2.5">
                      <RoleChip role={u.platformRole} />
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={u.accountStatus} />
                    </td>
                    <td className="relative px-3 py-2.5 text-center sm:px-4">
                      <RowActions
                        label={`Actions for ${u.name}`}
                        open={menuKey === u.id}
                        onToggle={() => setMenuKey((k) => (k === u.id ? null : u.id))}
                      >
                        <MenuItem
                          onClick={() => {
                            setMenuKey(null);
                            navigate(`/admin/users/${u.id}`);
                          }}
                        >
                          <Eye size={14} /> View profile
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setMenuKey(null);
                            setConfirm({
                              id: u.id,
                              name: u.name,
                              next: u.accountStatus === 'suspended' ? 'active' : 'suspended',
                            });
                          }}
                        >
                          <ShieldOff size={14} />
                          {u.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </MenuItem>
                        {u.accountStatus !== 'banned' ? (
                          <MenuItem
                            danger
                            onClick={() => {
                              setMenuKey(null);
                              setConfirm({ id: u.id, name: u.name, next: 'banned' });
                            }}
                          >
                            <UserX size={14} /> Ban user
                          </MenuItem>
                        ) : (
                          <MenuItem
                            onClick={() => {
                              setMenuKey(null);
                              setConfirm({ id: u.id, name: u.name, next: 'active' });
                            }}
                          >
                            Unban user
                          </MenuItem>
                        )}
                      </RowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={confirm?.next === 'banned'}
        busy={busy}
        title={
          confirm?.next === 'banned'
            ? `Ban ${confirm.name}?`
            : confirm?.next === 'suspended'
              ? `Suspend ${confirm?.name}?`
              : `Reactivate ${confirm?.name}?`
        }
        description={
          confirm?.next === 'banned'
            ? 'They will not be able to sign in until an admin unbans the account.'
            : confirm?.next === 'suspended'
              ? 'Access is paused until the account is reactivated.'
              : 'The account will be able to sign in again.'
        }
        confirmLabel={confirm?.next === 'banned' ? 'Ban user' : confirm?.next === 'suspended' ? 'Suspend' : 'Reactivate'}
        onConfirm={() => void applyStatus()}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
      />
    </div>
  );
}
