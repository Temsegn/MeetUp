import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, TableRowSkeleton } from '../components/AdminUi';
import { fmtDate, money } from '../../workspace/components/InvoiceDocument';

import iconSearch from '../assets/subscriptions/search.svg';
import iconClose from '../assets/subscriptions/close.svg';
import iconChevron from '../assets/subscriptions/chevron.svg';
import iconNext from '../assets/subscriptions/next.svg';
import iconKpiUsers from '../assets/subscriptions/kpi-users.svg';
import iconKpiCheck from '../assets/subscriptions/kpi-check.svg';
import iconKpiDollar from '../assets/subscriptions/kpi-dollar.svg';
import iconKpiChart from '../assets/subscriptions/kpi-chart.svg';
import iconKpiAlert from '../assets/subscriptions/kpi-alert.svg';

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
  pro: '#1c59e5',
  enterprise: '#0fa05c',
};

function IconImg({ src, size = 16, className }: { src: string; size?: number; className?: string }) {
  return (
    <img src={src} alt="" width={size} height={size} className={cn('shrink-0', className)} style={{ width: size, height: size }} />
  );
}

function Kpi({
  label,
  value,
  meta,
  iconSrc,
  iconClass,
}: {
  label: string;
  value: string | number;
  meta: string;
  iconSrc: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E8ED] bg-white p-3.5 shadow-[0_1px_1px_rgba(58,71,99,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <IconImg src={iconSrc} size={16} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#141A29]">{value}</p>
      <p className="mt-1 text-[11px] text-[#6F7B8C]">{meta}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-[#D5F9E0] text-[#00A159]'
      : status === 'past_due'
        ? 'bg-[#FFE5E3] text-[#E62845]'
        : 'bg-[#F3F6FA] text-[#6F7B8C]';
  const label = status === 'past_due' ? 'Past due' : status;
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', cls)}>
      {label}
    </span>
  );
}

function UsageBar({ label, used, limit, barColor }: { label: string; used: number; limit: number; barColor: string }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#141A29]">{label}</span>
        <span className="text-[#6F7B8C]">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F6FA]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
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
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    if (!window.confirm(`Cancel the ${selected.organization} subscription?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateSubscription(selected.id, { status: 'cancelled' });
      setMessage('Subscription cancelled.');
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
        <Kpi label="Organizations" value={kpis.totalWorkspaces} meta="All organizations" iconSrc={iconKpiUsers} iconClass="bg-[#E4EFFF]" />
        <Kpi label="Active Subscriptions" value={kpis.active} meta="Currently billed" iconSrc={iconKpiCheck} iconClass="bg-[#D5F9E0]" />
        <Kpi label="MRR" value={money(kpis.mrr)} meta="Active paid plans" iconSrc={iconKpiDollar} iconClass="bg-[#F0EAFF]" />
        <Kpi label="Annual Revenue" value={money(kpis.arr)} meta="MRR × 12" iconSrc={iconKpiChart} iconClass="bg-[#E4EFFF]" />
        <Kpi label="Past Due" value={kpis.pastDue} meta={`${kpis.cancelled} cancelled`} iconSrc={iconKpiAlert} iconClass="bg-[#FFE5E3]" />
      </div>

      {error ? <p className="mb-3 text-sm text-[#E62845]">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-emerald-600">{message}</p> : null}

      <div className={cn('grid gap-3', panelOpen && selected ? 'xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]' : 'xl:grid-cols-1')}>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E4E8ED] bg-white shadow-[0_1px_1px_rgba(58,71,99,0.06)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E8ED] p-3">
            <div className="relative min-w-0 flex-1 basis-[180px]">
              <IconImg src={iconSearch} size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search organizations..."
                className="h-9 w-full rounded-xl border border-[#E4E8ED] bg-white pr-3 pl-9 text-[13px] text-[#141A29] outline-none placeholder:text-[#6F7B8C] focus:border-[#1C59E5]"
              />
            </div>
            <select
              value={plan}
              onChange={(e) => {
                setPage(1);
                setPlan(e.target.value);
              }}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-medium text-[#141A29]"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-medium text-[#141A29]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <table className="w-full table-fixed text-left text-[13px]">
            <thead>
              <tr className="border-y border-[#E4E8ED] bg-[rgba(243,246,250,0.4)] text-[12px] font-semibold text-[#6F7B8C]">
                <th className="px-3 py-2.5">Organization</th>
                <th className="px-2 py-2.5">Plan</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-2 py-2.5">Members</th>
                <th className="px-2 py-2.5">Next billing</th>
                <th className="px-2 py-2.5">Amount</th>
              </tr>
            </thead>
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
                    className={cn('cursor-pointer border-b border-[#E4E8ED]', active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]')}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
                          style={{ background: PLAN_COLORS[row.plan] ?? '#1c59e5' }}
                        >
                          {letter}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#141A29]">{row.organization}</p>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{row.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[#141A29]">{row.planLabel}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-2.5 text-[#141A29]">{row.members}</td>
                    <td className="px-2 py-2.5 text-[#141A29]">
                      {row.status === 'cancelled' ? 'Cancelled' : fmtDate(row.nextBilling)}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-[#141A29]">{money(row.amount)}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[#94A3B8]">
                    No organizations match your filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E8ED] px-3 py-2.5">
            <p className="text-[12px] text-[#6F7B8C]">
              Showing {from} to {to} of {total} organizations
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl text-[12px] font-semibold',
                    page === n ? 'bg-[#1C59E5] text-white' : 'border border-[#E4E8ED] text-[#141A29]',
                  )}
                >
                  {n}
                </button>
              ))}
              {pageCount > 5 ? (
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="flex size-8 items-center justify-center rounded-xl border border-[#E4E8ED]"
                  aria-label="Next page"
                >
                  <IconImg src={iconNext} size={14} />
                </button>
              ) : null}
              <label className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#E4E8ED] px-2 text-[12px] font-medium text-[#141A29]">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                  className="bg-transparent outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <IconImg src={iconChevron} size={14} />
              </label>
            </div>
          </div>
        </div>

        {panelOpen && selected ? (
          <aside className="min-w-0 rounded-2xl border border-[#E4E8ED] bg-white p-4 shadow-[0_2px_8px_rgba(58,71,99,0.06)] xl:self-start">
            <div className="flex justify-end">
              <button type="button" aria-label="Close" onClick={() => setPanelOpen(false)} className="flex size-5 items-center justify-center">
                <IconImg src={iconClose} size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <span
                className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                style={{ background: PLAN_COLORS[selected.plan] ?? '#1c59e5' }}
              >
                {(selected.organization[0] || '?').toUpperCase()}
              </span>
              <h2 className="mt-3 text-[15px] font-bold text-[#141A29]">{selected.organization}</h2>
              <p className="mt-1 text-[12px] text-[#6F7B8C]">{selected.email || 'No billing email'}</p>
              <div className="mt-2">
                <StatusPill status={selected.status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Plan</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">{selected.planLabel}</p>
              </div>
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Members</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">{selected.members}</p>
              </div>
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Since</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">{fmtDate(selected.createdAt)}</p>
              </div>
            </div>

            <h3 className="mt-5 text-[13px] font-bold text-[#141A29]">Subscription Details</h3>
            <dl className="mt-2.5 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Billing cycle</dt>
                <dd className="font-medium text-[#141A29]">Monthly</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Next billing</dt>
                <dd className="font-medium text-[#141A29]">
                  {selected.status === 'cancelled' ? 'Cancelled' : fmtDate(selected.nextBilling)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Amount</dt>
                <dd className="font-medium text-[#141A29]">{money(selected.amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Payment method</dt>
                <dd className="font-medium text-[#141A29]">Invoice</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Invoice email</dt>
                <dd className="truncate font-medium text-[#141A29]">{selected.invoiceEmail || '—'}</dd>
              </div>
            </dl>

            <h3 className="mt-5 text-[13px] font-bold text-[#141A29]">Usage this period</h3>
            <div className="mt-2.5">
              <UsageBar
                label="Participant minutes"
                used={selected.minutesUsed}
                limit={Math.max(1, selected.minutesIncluded)}
                barColor="#1C59E5"
              />
            </div>

            <label className="mt-5 block text-[12px] font-semibold text-[#141A29]">
              Change plan
              <select
                value={selected.plan}
                disabled={busy}
                onChange={(e) => void changePlan(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-xl border border-[#E4E8ED] bg-white px-2 text-[12px]"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to={`/admin/workspaces/${selected.workspaceId}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(28,89,229,0.4)] text-[12px] font-semibold text-[#1C59E5]"
              >
                Organization
              </Link>
              <Link
                to="/admin/invoices"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(28,89,229,0.4)] text-[12px] font-semibold text-[#1C59E5]"
              >
                Invoices
              </Link>
            </div>
            {selected.status === 'cancelled' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void reactivate()}
                className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[rgba(28,89,229,0.4)] text-[12px] font-semibold text-[#1C59E5] disabled:opacity-60"
              >
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancelSub()}
                className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[rgba(230,40,69,0.4)] text-[12px] font-semibold text-[#E62845] disabled:opacity-60"
              >
                Cancel subscription
              </button>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
