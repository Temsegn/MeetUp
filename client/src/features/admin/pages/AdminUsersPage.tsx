import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, AdminTableShell, StatusBadge } from '../components/AdminUi';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .listUsers({ search })
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setStatus = async (id: string, accountStatus: 'active' | 'suspended' | 'banned') => {
    if (accountStatus === 'banned' && !window.confirm('Ban this user? They will not be able to sign in.')) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await adminApi.setUserStatus(id, accountStatus);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle="All accounts across the platform."
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/users/new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#016BE6] px-3 py-2 text-[12px] font-semibold text-white"
          >
            <Plus className="size-3.5" /> Create User
          </button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="h-10 w-full rounded-xl border border-[#E8ECF1] bg-white pr-3 pl-9 text-[13px]"
        />
      </div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <AdminTableShell>
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#6F7B8C]">
            <tr>
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Platform role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const id = String(u.id);
              const status = String(u.accountStatus);
              return (
                <tr key={id} className="border-t border-[#E8ECF1]">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${id}`} className="font-semibold hover:text-[#016BE6]">
                      {String(u.name)}
                    </Link>
                    <p className="text-[11px] text-[#94A3B8]">{String(u.email)}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{String(u.platformRole).replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      type="button"
                      disabled={busyId === id}
                      className="text-[12px] font-semibold text-[#016BE6] disabled:opacity-50"
                      onClick={() => void setStatus(id, status === 'suspended' ? 'active' : 'suspended')}
                    >
                      {status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </button>
                    {status !== 'banned' ? (
                      <button
                        type="button"
                        disabled={busyId === id}
                        className="text-[12px] font-semibold text-rose-600 disabled:opacity-50"
                        onClick={() => void setStatus(id, 'banned')}
                      >
                        Ban
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === id}
                        className="text-[12px] font-semibold text-[#016BE6] disabled:opacity-50"
                        onClick={() => void setStatus(id, 'active')}
                      >
                        Unban
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#94A3B8]">
                  Loading users…
                </td>
              </tr>
            ) : null}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#94A3B8]">
                  {search ? 'No users match that search.' : 'No users yet.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}
