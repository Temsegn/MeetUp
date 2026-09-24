import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Plus } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { adminApi } from '../api/admin.service';
import {
  AdminKpiCard,
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
  StatusBadge,
  TableSkeleton,
  useDebouncedValue,
} from '../components/AdminUi';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  members: number;
  mrr: number;
  status: string;
};

export function AdminWorkspacesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<OrgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState<{ id: string; name: string; next: 'active' | 'suspended' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .listWorkspaces({ search: debouncedSearch, status: status || undefined, limit: 100 })
      .then((res) => {
        setItems((res.items as OrgRow[]) ?? []);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load organizations.'))
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
  }, [debouncedSearch, status, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, items.length);

  const kpis = useMemo(() => {
    const active = items.filter((r) => r.status === 'active').length;
    const suspended = items.filter((r) => r.status === 'suspended').length;
    const mrr = items.reduce((sum, r) => sum + Number(r.mrr || 0), 0);
    return { active, suspended, mrr };
  }, [items]);

  const applyStatus = async () => {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.setWorkspaceStatus(confirm.id, confirm.next);
      setConfirm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Organizations"
        subtitle={`Customer workspaces on Samtal · ${total} total`}
        actions={
          <button type="button" onClick={() => navigate('/admin/workspaces/new')} className={SAAS_PRIMARY}>
            <Plus className="size-3.5" /> Create Organization
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Organizations" value={total} meta="All tenants" icon={<Building2 className="size-4" />} />
        <AdminKpiCard label="Active" value={kpis.active} meta="Can sign in and meet" />
        <AdminKpiCard label="Suspended" value={kpis.suspended} meta="Access paused" />
        <AdminKpiCard label="MRR" value={`$${kpis.mrr.toLocaleString()}`} meta="From listed organizations" />
      </div>

      <div className="mb-4">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { key: '', label: 'All' },
            { key: 'active', label: 'Active', dot: 'bg-[#22C55E]' },
            { key: 'suspended', label: 'Suspended', dot: 'bg-[#F97316]' },
          ]}
        />
      </div>

      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      {loading ? (
        <AdminTableShell title="Organizations" subtitle="Search tenants, plans, and owners.">
          <TableSkeleton cols={6} />
        </AdminTableShell>
      ) : (
        <AdminTableShell
          title={`Organizations (${items.length})`}
          subtitle="Search tenants, plans, and owners."
          toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search organizations..." className="sm:w-[260px]" />}
          footer={
            <PaginationBar
              from={from}
              to={to}
              total={items.length}
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
              noun="organizations"
            />
          }
        >
          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'Organization' },
                { label: 'Owner' },
                { label: 'Plan' },
                { label: 'Members' },
                { label: 'MRR' },
                { label: 'Status' },
                { label: 'Actions', align: 'center' },
              ]}
            />
            <tbody>
              {pageRows.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  title={search || status ? 'No organizations match those filters' : 'No organizations yet'}
                  description="Create an organization to provision a customer workspace."
                  action={
                    <button type="button" onClick={() => navigate('/admin/workspaces/new')} className={SAAS_PRIMARY}>
                      <Plus className="size-3.5" /> Create Organization
                    </button>
                  }
                />
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F1FE] text-[12px] font-bold text-[#016BE6]">
                          {row.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="truncate text-left text-[12px] font-semibold text-[#151D2B] hover:text-[#016BE6]"
                            onClick={() => navigate(`/admin/workspaces/${row.id}`)}
                          >
                            {row.name}
                          </button>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{row.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <PersonCell name={row.ownerName} email={row.ownerEmail} />
                    </td>
                    <td className="px-2 py-2.5">
                      <RoleChip role={String(row.plan || 'free')} />
                    </td>
                    <td className="px-2 py-2.5 text-[#475569]">{row.members}</td>
                    <td className="px-2 py-2.5 font-semibold tabular-nums">${Number(row.mrr || 0).toLocaleString()}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="relative px-3 py-2.5 text-center sm:px-4">
                      <RowActions
                        label={`Actions for ${row.name}`}
                        open={menuKey === row.id}
                        onToggle={() => setMenuKey((k) => (k === row.id ? null : row.id))}
                      >
                        <MenuItem
                          onClick={() => {
                            setMenuKey(null);
                            navigate(`/admin/workspaces/${row.id}`);
                          }}
                        >
                          <Eye size={14} /> View
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setMenuKey(null);
                            setConfirm({
                              id: row.id,
                              name: row.name,
                              next: row.status === 'suspended' ? 'active' : 'suspended',
                            });
                          }}
                        >
                          {row.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </MenuItem>
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
        danger={confirm?.next === 'suspended'}
        busy={busy}
        title={confirm?.next === 'suspended' ? `Suspend ${confirm.name}?` : `Reactivate ${confirm?.name}?`}
        description={
          confirm?.next === 'suspended'
            ? 'Members of this organization will not be able to hold meetings until you reactivate it.'
            : 'Members will regain access to meetings and billing.'
        }
        confirmLabel={confirm?.next === 'suspended' ? 'Suspend' : 'Reactivate'}
        onConfirm={() => void applyStatus()}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
      />
    </div>
  );
}
