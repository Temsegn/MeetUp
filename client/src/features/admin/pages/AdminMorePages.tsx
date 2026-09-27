import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CreditCard } from 'lucide-react';
import { adminApi } from '../api/admin.service';
import { money } from '../../workspace/components/InvoiceDocument';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  EmptyState,
  Field,
  FormSkeleton,
  KpiRowSkeleton,
  PaginationBar,
  RoleChip,
  SAAS_CARD,
  SAAS_GHOST,
  SAAS_PRIMARY,
  SAAS_TEXT_INPUT,
  SearchField,
  StatusBadge,
  TableSkeleton,
  useDebouncedValue,
} from '../components/AdminUi';

type PastDueRow = {
  id: string;
  workspaceId: string;
  organization: string;
  email: string;
  planLabel: string;
  amount: number;
  members: number;
};

type DueInvoice = {
  id: string;
  number: string;
  organization: string;
  total: number;
  dueAt: string;
  status: string;
};

export function AdminBillingPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [pastDue, setPastDue] = useState<PastDueRow[]>([]);
  const [dueInvoices, setDueInvoices] = useState<DueInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.billing(),
      adminApi.listSubscriptions({ status: 'past_due', limit: 25, page: 1 }),
      adminApi.invoices({ status: 'issued', limit: 8 }),
    ])
      .then(([billing, subs, invoices]) => {
        setData(billing);
        setPastDue(
          (subs.items ?? []).map((row) => ({
            id: String(row.id),
            workspaceId: String(row.workspaceId ?? ''),
            organization: String(row.organization ?? '—'),
            email: String(row.email ?? ''),
            planLabel: String(row.planLabel ?? row.plan ?? '—'),
            amount: Number(row.amount ?? 0),
            members: Number(row.members ?? 0),
          })),
        );
        setDueInvoices(
          (invoices.items ?? []).map((row) => ({
            id: String(row.id),
            number: String(row.number ?? ''),
            organization: String(row.organization ?? '—'),
            total: Number(row.total ?? 0),
            dueAt: String(row.dueAt ?? ''),
            status: String(row.status ?? 'issued'),
          })),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load billing.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <AdminPageHeader
          title="Billing"
          subtitle="Platform revenue, past-due accounts, and invoices waiting to be paid."
        />
        <KpiRowSkeleton count={4} />
        <div className={`${SAAS_CARD} mt-5 p-5`}>
          <span className="mb-3 inline-block h-4 w-40 animate-pulse rounded-md bg-[#E8ECF1]" />
          <div className="grid gap-2 sm:grid-cols-3">
            <span className="h-16 animate-pulse rounded-xl bg-[#E8ECF1]" />
            <span className="h-16 animate-pulse rounded-xl bg-[#E8ECF1]" />
            <span className="h-16 animate-pulse rounded-xl bg-[#E8ECF1]" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className={SAAS_CARD}>
            <TableSkeleton cols={4} rows={4} />
          </div>
          <div className={SAAS_CARD}>
            <TableSkeleton cols={3} rows={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <AdminPageHeader title="Billing" subtitle="Platform revenue and failed charges." />
        <AlertBanner tone="error">{error ?? 'Could not load billing.'}</AlertBanner>
      </div>
    );
  }

  const byPlan = (data.byPlan as Record<string, number>) ?? {};
  const planTotal = Object.values(byPlan).reduce((sum, n) => sum + Number(n), 0) || 1;

  return (
    <div>
      <AdminPageHeader
        title="Billing"
        subtitle="Platform revenue, past-due organizations, and invoices waiting to be paid."
        actions={
          <>
            <Link to="/admin/subscriptions" className={SAAS_GHOST}>
              Subscriptions
            </Link>
            <Link to="/admin/invoices" className={SAAS_PRIMARY}>
              All invoices
            </Link>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="MRR"
          value={money(Number(data.mrr ?? 0))}
          meta="Active paid plans"
          icon={<CreditCard className="size-4" />}
        />
        <AdminKpiCard label="ARR" value={money(Number(data.arr ?? 0))} meta="MRR × 12" />
        <AdminKpiCard
          label="Active subscriptions"
          value={Number(data.activeSubscriptions ?? 0)}
          meta="Currently billed"
        />
        <AdminKpiCard
          label="Past due"
          value={Number(data.pastDueCount ?? 0)}
          meta={`${money(Number(data.pastDueAmount ?? 0))} at risk`}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className={`${SAAS_CARD} mt-5 p-5`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Plan mix</h2>
            <p className="mt-0.5 text-[12px] text-[#6F7C8C]">Active subscriptions by catalog plan.</p>
          </div>
          <Link to="/admin/plans" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#016BE6]">
            Manage plans <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(['free', 'pro', 'enterprise'] as const).map((key) => {
            const count = Number(byPlan[key] ?? 0);
            const pct = Math.round((count / planTotal) * 100);
            return (
              <li key={key} className="rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <RoleChip role={key} />
                  <span className="text-[15px] font-bold tabular-nums text-[#151D2B]">{count}</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E8ECF1]">
                  <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-[#94A3B8]">{pct}% of active</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <AdminTableShell
          title={`Past due (${pastDue.length})`}
          subtitle="Organizations that need attention."
        >
          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'Organization' },
                { label: 'Plan' },
                { label: 'At risk' },
                { label: 'Status' },
              ]}
            />
            <tbody>
              {pastDue.length === 0 ? (
                <EmptyState colSpan={4} title="No past-due accounts" description="Every billed organization is current." />
              ) : (
                pastDue.map((row) => (
                  <tr key={row.id} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/admin/workspaces/${row.workspaceId}`}
                        className="font-semibold hover:text-[#016BE6]"
                      >
                        {row.organization}
                      </Link>
                      <p className="text-[11px] text-[#6F7B8C]">{row.email || '—'}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      <RoleChip role={row.planLabel} />
                    </td>
                    <td className="px-2 py-2.5 font-semibold tabular-nums">{money(row.amount)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status="past_due" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>

        <AdminTableShell title="Open invoices" subtitle="Issued invoices waiting for payment.">
          <AdminTable>
            <AdminTHead
              columns={[{ label: 'Invoice' }, { label: 'Organization' }, { label: 'Amount' }, { label: 'Status' }]}
            />
            <tbody>
              {dueInvoices.length === 0 ? (
                <EmptyState colSpan={4} title="No open invoices" description="New invoices appear when a billing period starts." />
              ) : (
                dueInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/invoices/${inv.id}`} className="font-semibold hover:text-[#016BE6]">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">{inv.organization}</td>
                    <td className="px-2 py-2.5 font-semibold tabular-nums">{money(inv.total)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </div>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setLoading(true);
    adminApi
      .auditLogs({ search: debouncedSearch, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <AdminPageHeader title="Audit log" subtitle="Admin actions across users, organizations, and billing." />
      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      <AdminTableShell
        title={`Events (${items.length})`}
        subtitle="Search by actor, action, or target."
        toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search actions..." />}
        footer={
          loading ? undefined : (
            <PaginationBar
              from={items.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              to={Math.min(items.length, safePage * pageSize)}
              total={items.length}
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(n) => {
                setPage(1);
                setPageSize(n);
              }}
              noun="events"
            />
          )
        }
      >
        {loading ? (
          <TableSkeleton cols={4} />
        ) : (
          <AdminTable>
            <AdminTHead columns={[{ label: 'When' }, { label: 'Actor' }, { label: 'Action' }, { label: 'Target' }]} />
            <tbody>
              {pageRows.length === 0 ? (
                <EmptyState colSpan={4} title="No audit events yet" description="Admin changes will appear here." />
              ) : (
                pageRows.map((row) => (
                  <tr key={String(row.id)} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-4 py-3 whitespace-nowrap text-[#6F7B8C]">
                      {new Date(String(row.at)).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">{String(row.actorEmail)}</td>
                    <td className="px-2 py-3 font-medium">{String(row.action).replace(/[._]/g, ' ')}</td>
                    <td className="px-4 py-3 text-[#6F7B8C]">
                      {String(row.targetType)} {String(row.targetId).slice(0, 8)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        )}
      </AdminTableShell>
    </div>
  );
}

export function AdminSystemSettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .getSystemSettings()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load system settings.'));
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="System" subtitle="Global platform configuration for every organization." />
        {error ? <AlertBanner tone="error">{error}</AlertBanner> : <FormSkeleton />}
      </div>
    );
  }

  const general = (data.general as Record<string, unknown>) ?? {};
  const featureFlags = (data.featureFlags as Record<string, boolean>) ?? {};

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await adminApi.updateSystemSettings({
        general,
        featureFlags,
      });
      setData(updated);
      setMessage('Settings saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title="System" subtitle="Global platform configuration for every organization." />
      <div className={`${SAAS_CARD} space-y-5 p-5`}>
        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold text-[#151D2B]">General</h2>
          <Field label="App name">
            <input
              value={String(general.appName ?? '')}
              onChange={(e) => setData({ ...data, general: { ...general, appName: e.target.value } })}
              className={SAAS_TEXT_INPUT}
            />
          </Field>
          <Field label="Support email">
            <input
              value={String(general.supportEmail ?? '')}
              onChange={(e) => setData({ ...data, general: { ...general, supportEmail: e.target.value } })}
              className={SAAS_TEXT_INPUT}
            />
          </Field>
        </section>

        <div className="border-t border-[#E8ECF1]" />

        <section>
          <h2 className="text-[15px] font-semibold text-[#151D2B]">Availability</h2>
          <label className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] px-3.5 py-3">
            <span>
              <span className="block text-[13px] font-semibold text-[#151D2B]">Maintenance mode</span>
              <span className="mt-0.5 block text-[11px] text-[#6F7B8C]">
                Sign-in stays available for super admins; customers see a maintenance notice.
              </span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(general.maintenanceMode)}
              onChange={(e) =>
                setData({ ...data, general: { ...general, maintenanceMode: e.target.checked } })
              }
              className="mt-1 size-4 rounded border-[#CBD5E1] text-[#016BE6]"
            />
          </label>
        </section>

        <div className="border-t border-[#E8ECF1]" />

        <section>
          <h2 className="text-[15px] font-semibold text-[#151D2B]">Feature flags</h2>
          <div className="mt-3 space-y-2">
            {Object.keys(featureFlags).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E8ECF1] px-3.5 py-2.5 text-[13px] text-[#334155]"
              >
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                <input
                  type="checkbox"
                  checked={Boolean(featureFlags[key])}
                  onChange={(e) =>
                    setData({
                      ...data,
                      featureFlags: { ...featureFlags, [key]: e.target.checked },
                    })
                  }
                  className="size-4 rounded border-[#CBD5E1] text-[#016BE6]"
                />
              </label>
            ))}
            {Object.keys(featureFlags).length === 0 ? (
              <p className="text-[12px] text-[#94A3B8]">No feature flags configured.</p>
            ) : null}
          </div>
        </section>

        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
        {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
        <button type="button" disabled={busy} onClick={() => void save()} className={SAAS_PRIMARY}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
