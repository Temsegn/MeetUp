import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.service';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  EmptyState,
  Field,
  SAAS_CARD,
  SAAS_PRIMARY,
  SAAS_TEXT_INPUT,
  SearchField,
  TableSkeleton,
} from '../components/AdminUi';

export function AdminBillingPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .billing()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load billing.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Billing" subtitle="Platform revenue and failed charges." />
        <TableSkeleton cols={4} rows={3} />
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
  return (
    <div>
      <AdminPageHeader title="Billing" subtitle="Platform revenue and failed charges across all organizations." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="MRR" value={`$${Number(data.mrr ?? 0).toLocaleString()}`} />
        <AdminKpiCard label="ARR" value={`$${Number(data.arr ?? 0).toLocaleString()}`} />
        <AdminKpiCard label="Active subscriptions" value={Number(data.activeSubscriptions ?? 0)} />
        <AdminKpiCard
          label="Past due"
          value={Number(data.pastDueCount ?? 0)}
          meta={`$${Number(data.pastDueAmount ?? 0)} at risk`}
        />
      </div>
      <div className={`${SAAS_CARD} mt-5 p-5`}>
        <h2 className="text-[15px] font-semibold text-[#151D2B]">Subscriptions by plan</h2>
        <ul className="mt-3 grid gap-2 text-[13px] sm:grid-cols-3">
          {Object.entries(byPlan).map(([k, v]) => (
            <li key={k} className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 capitalize text-[#334155]">
              {k}: <strong className="text-[#151D2B]">{v}</strong>
            </li>
          ))}
          {Object.keys(byPlan).length === 0 ? (
            <li className="text-[12px] text-[#94A3B8]">No subscription mix yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .auditLogs({ search })
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <AdminPageHeader title="Audit log" subtitle="Admin actions across users, organizations, and billing." />
      <AdminTableShell
        title="Events"
        subtitle="Search by actor, action, or target."
        toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search actions..." />}
      >
        {loading ? (
          <TableSkeleton cols={4} />
        ) : (
          <AdminTable>
            <AdminTHead columns={[{ label: 'When' }, { label: 'Actor' }, { label: 'Action' }, { label: 'Target' }]} />
            <tbody>
              {items.length === 0 ? (
                <EmptyState colSpan={4} title="No audit events yet" description="Admin changes will appear here." />
              ) : (
                items.map((row) => (
                  <tr key={String(row.id)} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-4 py-3 text-[#6F7B8C]">{new Date(String(row.at)).toLocaleString()}</td>
                    <td className="px-2 py-3">{String(row.actorEmail)}</td>
                    <td className="px-2 py-3 font-medium">{String(row.action)}</td>
                    <td className="px-4 py-3 text-[#6F7B8C]">
                      {String(row.targetType)} {String(row.targetId)}
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
    adminApi.getSystemSettings().then(setData);
  }, []);

  if (!data) return <p className="text-[13px] text-[#6F7B8C]">Loading settings…</p>;

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
      <div className={`${SAAS_CARD} space-y-4 p-5`}>
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
        <label className="flex items-center gap-2 text-[13px] text-[#334155]">
          <input
            type="checkbox"
            checked={Boolean(general.maintenanceMode)}
            onChange={(e) => setData({ ...data, general: { ...general, maintenanceMode: e.target.checked } })}
            className="size-4 rounded border-[#CBD5E1] text-[#016BE6]"
          />
          Maintenance mode
        </label>
        <div>
          <p className="text-[12px] font-semibold text-[#334155]">Feature flags</p>
          <div className="mt-2 space-y-2">
            {Object.keys(featureFlags).map((key) => (
              <label key={key} className="flex items-center gap-2 text-[13px] capitalize text-[#334155]">
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
                {key.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
        {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
        {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
        <button type="button" disabled={busy} onClick={() => void save()} className={SAAS_PRIMARY}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
