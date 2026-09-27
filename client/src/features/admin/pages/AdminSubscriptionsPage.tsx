import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { adminApi } from '../api/admin.service';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminTable,
  AdminTHead,
  AlertBanner,
  EmptyState,
  FilterChips,
  PaginationBar,
  RoleChip,
  SAAS_CARD,
  SAAS_GHOST,
  SAAS_PRIMARY,
  SearchField,
  SelectField,
  StatusBadge,
  TableRowSkeleton,
  useDebouncedValue,
} from '../components/AdminUi';
import { fmtDate, money } from '../../workspace/components/InvoiceDocument';

type SubStatus = 'active' | 'past_due' | 'cancelled';

type SubRow = {
  id: string;
  workspaceId: string;
  organization: string;
  email: string;
  plan: string;
  planLabel: string;
  status: SubStatus;
  members: number;
  amount: number;
  nextBilling: string;
  invoiceEmail: string;
  minutesUsed: number;
  minutesIncluded: number;
  createdAt: string;
};

const PLAN_COLORS: Record<string, string> = {
  free: '#6F7B8C',
  pro: '#016BE6',
  enterprise: '#059669',
};

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#151D2B]">{label}</span>
        <span className="text-[#6F7B8C]">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#E8ECF1]">
        <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function asSub(row: Record<string, unknown>): SubRow {
  const status = String(row.status);
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId ?? ''),
    organization: String(row.organization ?? '—'),
    email: String(row.email ?? ''),
    plan: String(row.plan ?? 'free'),
    planLabel: String(row.planLabel ?? row.plan ?? 'Free'),
    status: status === 'past_due' || status === 'cancelled' ? status : 'active',
    members: Number(row.members ?? 0),
    amount: Number(row.amount ?? 0),
    nextBilling: String(row.nextBilling ?? ''),
    invoiceEmail: String(row.invoiceEmail ?? row.email ?? ''),
    minutesUsed: Number(row.minutesUsed ?? 0),
    minutesIncluded: Number(row.minutesIncluded ?? 0),
    createdAt: String(row.createdAt ?? ''),
  };
}

export function AdminSubscriptionsPage() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SubRow[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState({
    totalWorkspaces: 0,
    active: 0,
    pastDue: 0,
    cancelled: 0,
    mrr: 0,
    arr: 0,
  });

  const load = () => {
    setLoading(true);
    adminApi
      .listSubscriptions({
        search,
        plan,
        status,
        page,
        limit: pageSize,
      })
      .then((res) => {
        const rows = (res.items ?? []).map(asSub);
        setItems(rows);
        setTotal(Number(res.total ?? rows.length));
        setKpis({
          totalWorkspaces: Number(res.kpis?.totalWorkspaces ?? 0),
          active: Number(res.kpis?.active ?? 0),
          pastDue: Number(res.kpis?.pastDue ?? 0),
          cancelled: Number(res.kpis?.cancelled ?? 0),
          mrr: Number(res.kpis?.mrr ?? 0),
          arr: Number(res.kpis?.arr ?? 0),
        });
        if (rows.length && (!selectedId || !rows.some((r) => r.id === selectedId))) {
          setSelectedId(rows[0].id);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load subscriptions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, plan, status, page, pageSize]);

  const selected = items.find((r) => r.id === selectedId) ?? null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const changePlan = async (planKey: string) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateSubscription(selected.id, { planKey });
      setMessage(`Plan updated to ${planKey}.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change plan.');
    } finally {
      setBusy(false);
    }
  };

  const cancelSub = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateSubscription(selected.id, { status: 'cancelled' });
      setMessage('Subscription cancelled.');
      setConfirmCancel(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel subscription.');
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateSubscription(selected.id, { status: 'active' });
      setMessage('Subscription reactivated.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reactivate.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        subtitle="Organization plans, usage, and billing from live data."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard label="Organizations" value={kpis.totalWorkspaces} meta="All organizations" />
        <AdminKpiCard label="Active" value={kpis.active} meta="Currently billed" />
        <AdminKpiCard label="MRR" value={money(kpis.mrr)} meta="Active paid plans" />
        <AdminKpiCard label="Annual revenue" value={money(kpis.arr)} meta="MRR × 12" />
        <AdminKpiCard label="Past due" value={kpis.pastDue} meta={`${kpis.cancelled} cancelled`} />
      </div>

      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <AlertBanner tone="success">{message}</AlertBanner>
        </div>
      ) : null}

      <div className={cn('grid gap-3', panelOpen && selected ? 'xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]' : 'xl:grid-cols-1')}>
        <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#E1E7EE] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E1E7EE] p-3">
            <div className="min-w-0 flex-1 basis-[180px]">
              <SearchField
                value={searchInput}
                onChange={(v) => {
                  setPage(1);
                  setSearchInput(v);
                }}
                placeholder="Search organizations..."
              />
            </div>
            <SelectField
              value={plan}
              onChange={(v) => {
                setPage(1);
                setPlan(v);
              }}
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </SelectField>
            <FilterChips
              value={status}
              onChange={(v) => {
                setPage(1);
                setStatus(v);
              }}
              options={[
                { key: '', label: 'All' },
                { key: 'active', label: 'Active', dot: 'bg-[#22C55E]' },
                { key: 'past_due', label: 'Past due', dot: 'bg-[#F97316]' },
                { key: 'cancelled', label: 'Cancelled', dot: 'bg-[#EF4444]' },
              ]}
            />
          </div>

          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'Organization' },
                { label: 'Plan' },
                { label: 'Status' },
                { label: 'Members' },
                { label: 'Next billing' },
                { label: 'Amount' },
              ]}
            />
            <tbody>
              {loading ? <TableRowSkeleton cols={6} rows={8} /> : items.map((row) => {
                const active = row.id === selected?.id && panelOpen;
                const letter = (row.organization[0] || '?').toUpperCase();
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedId(row.id);
                      setPanelOpen(true);
                    }}
                    className={cn('cursor-pointer border-b border-[#E8ECF1]', active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]')}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
                          style={{ background: PLAN_COLORS[row.plan] ?? '#016BE6' }}
                        >
                          {letter}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#151D2B]">{row.organization}</p>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{row.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5"><RoleChip role={row.planLabel} /></td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-2 py-2.5 text-[#151D2B]">{row.members}</td>
                    <td className="px-2 py-2.5 text-[#151D2B]">
                      {row.status === 'cancelled' ? 'Cancelled' : fmtDate(row.nextBilling)}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-[#151D2B]">{money(row.amount)}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 ? (
                <EmptyState colSpan={6} title="No subscriptions" description="No organizations match your filters." />
              ) : null}
            </tbody>
          </AdminTable>

          <PaginationBar
            from={from}
            to={to}
            total={total}
            page={page}
            totalPages={pageCount}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(n) => {
              setPage(1);
              setPageSize(n);
            }}
            noun="organizations"
          />
        </div>

        {panelOpen && selected ? (
          <aside className={`${SAAS_CARD} min-w-0 p-4 xl:self-start`}>
            <div className="flex justify-end">
              <button type="button" aria-label="Close" onClick={() => setPanelOpen(false)} className="flex size-7 items-center justify-center rounded-lg text-[#6F7B8C] hover:bg-[#F5F7FA]">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <span
                className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                style={{ background: PLAN_COLORS[selected.plan] ?? '#016BE6' }}
              >
                {(selected.organization[0] || '?').toUpperCase()}
              </span>
              <h2 className="mt-3 text-[15px] font-bold text-[#151D2B]">{selected.organization}</h2>
              <p className="mt-1 text-[12px] text-[#6F7B8C]">{selected.email || 'No billing email'}</p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#E8ECF1] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Plan</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#151D2B]">{selected.planLabel}</p>
              </div>
              <div className="rounded-xl border border-[#E8ECF1] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Members</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#151D2B]">{selected.members}</p>
              </div>
              <div className="rounded-xl border border-[#E8ECF1] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Since</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#151D2B]">{fmtDate(selected.createdAt)}</p>
              </div>
            </div>

            <h3 className="mt-5 text-[13px] font-bold text-[#151D2B]">Subscription details</h3>
            <dl className="mt-2.5 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Billing cycle</dt>
                <dd className="font-medium text-[#151D2B]">Monthly</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Next billing</dt>
                <dd className="font-medium text-[#151D2B]">
                  {selected.status === 'cancelled' ? 'Cancelled' : fmtDate(selected.nextBilling)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Amount</dt>
                <dd className="font-medium text-[#151D2B]">{money(selected.amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Payment method</dt>
                <dd className="font-medium text-[#151D2B]">Invoice</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Invoice email</dt>
                <dd className="truncate font-medium text-[#151D2B]">{selected.invoiceEmail || '—'}</dd>
              </div>
            </dl>

            <h3 className="mt-5 text-[13px] font-bold text-[#151D2B]">Usage this period</h3>
            <div className="mt-2.5">
              <UsageBar
                label="Participant minutes"
                used={selected.minutesUsed}
                limit={Math.max(1, selected.minutesIncluded)}
              />
            </div>

            <label className="mt-5 block text-[12px] font-semibold text-[#151D2B]">
              Change plan
              <select
                value={selected.plan}
                disabled={busy}
                onChange={(e) => void changePlan(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-xl border border-[#E1E7EE] bg-white px-2 text-[12px] outline-none focus:border-[#016BE6]"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to={`/admin/workspaces/${selected.workspaceId}`} className={SAAS_GHOST}>
                Organization
              </Link>
              <Link to="/admin/invoices" className={SAAS_GHOST}>
                Invoices
              </Link>
            </div>
            {selected.status === 'cancelled' ? (
              <button type="button" disabled={busy} onClick={() => void reactivate()} className={`${SAAS_PRIMARY} mt-2 w-full disabled:opacity-60`}>
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
                className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#FECACA] text-[12px] font-semibold text-[#B42318] disabled:opacity-60"
              >
                Cancel subscription
              </button>
            )}
          </aside>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel subscription"
        description={selected ? `Cancel the ${selected.organization} subscription? Billing will stop at the end of the current period.` : ''}
        confirmLabel="Cancel subscription"
        cancelLabel="Keep plan"
        danger
        busy={busy}
        onConfirm={() => void cancelSub()}
        onClose={() => {
          if (!busy) setConfirmCancel(false);
        }}
      />
    </div>
  );
}
