import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, AdminTableShell, StatusBadge } from '../components/AdminUi';

export function AdminWorkspacesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    adminApi
      .listWorkspaces({ search, status: status || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [search, status]);

  const toggleStatus = async (id: string, next: 'active' | 'suspended') => {
    setBusyId(id);
    try {
      await adminApi.setWorkspaceStatus(id, next);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Workspaces"
        subtitle={`Manage all organizations · ${total} total`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/workspaces/new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#016BE6] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0059C4]"
          >
            <Plus className="size-3.5" /> Create Organization
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="h-10 w-full rounded-xl border border-[#E8ECF1] bg-white pr-3 pl-9 text-[13px] outline-none focus:border-[#016BE6]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-[#E8ECF1] bg-white px-3 text-[13px]"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <AdminTableShell>
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#6F7B8C]">
            <tr>
              <th className="px-4 py-2.5">Organization</th>
              <th className="px-4 py-2.5">Owner</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Members</th>
              <th className="px-4 py-2.5">MRR</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const id = String(row.id);
              const st = String(row.status);
              return (
                <tr key={id} className="border-t border-[#E8ECF1]">
                  <td className="px-4 py-3">
                    <Link to={`/admin/workspaces/${id}`} className="font-semibold text-[#151D2B] hover:text-[#016BE6]">
                      {String(row.name)}
                    </Link>
                    <p className="text-[11px] text-[#94A3B8]">{String(row.slug)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{String(row.ownerName)}</p>
                    <p className="text-[11px] text-[#94A3B8]">{String(row.ownerEmail)}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{String(row.plan)}</td>
                  <td className="px-4 py-3">{String(row.members)}</td>
                  <td className="px-4 py-3">${String(row.mrr)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={st} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === id}
                      onClick={() => toggleStatus(id, st === 'suspended' ? 'active' : 'suspended')}
                      className="text-[12px] font-semibold text-[#016BE6] hover:underline disabled:opacity-50"
                    >
                      {st === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#94A3B8]">
                  No workspaces found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}
