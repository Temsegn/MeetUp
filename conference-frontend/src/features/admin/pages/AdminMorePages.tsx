import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.service';
import { AdminKpiCard, AdminPageHeader, AdminTableShell } from '../components/AdminUi';

export function AdminBillingPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    adminApi.billing().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <p className="text-sm text-[#6F7B8C]">Loading billing…</p>;
  const byPlan = (data.byPlan as Record<string, number>) ?? {};
  return (
    <div>
      <AdminPageHeader title="Billing" subtitle="Platform revenue and failed charges" />
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
      <div className="mt-5 rounded-2xl border border-[#E8ECF1] bg-white p-4">
        <h2 className="text-[14px] font-semibold">Subscriptions by plan</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3 text-[13px]">
          {Object.entries(byPlan).map(([k, v]) => (
            <li key={k} className="rounded-xl bg-[#F8FAFC] px-3 py-2 capitalize">
              {k}: <strong>{v}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    adminApi.auditLogs({ search }).then((res) => setItems(res.items));
  }, [search]);
  return (
    <div>
      <AdminPageHeader title="Audit Logs" subtitle="Platform admin actions" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search actions…"
        className="mb-4 h-10 w-full max-w-md rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
      />
      <AdminTableShell>
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#6F7B8C]">
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-4 py-2.5">Actor</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">Target</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={String(row.id)} className="border-t border-[#E8ECF1]">
                <td className="px-4 py-3">{new Date(String(row.at)).toLocaleString()}</td>
                <td className="px-4 py-3">{String(row.actorEmail)}</td>
                <td className="px-4 py-3">{String(row.action)}</td>
                <td className="px-4 py-3">
                  {String(row.targetType)} {String(row.targetId)}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">
                  No audit events yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

export function AdminSystemSettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.getSystemSettings().then(setData);
  }, []);

  if (!data) return <p className="text-sm text-[#6F7B8C]">Loading settings…</p>;

  const general = (data.general as Record<string, unknown>) ?? {};
  const featureFlags = (data.featureFlags as Record<string, boolean>) ?? {};

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await adminApi.updateSystemSettings({
        general,
        featureFlags,
      });
      setData(updated);
      setMessage('Settings saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title="System Settings" subtitle="Global platform configuration" />
      <div className="space-y-4 rounded-2xl border border-[#E8ECF1] bg-white p-5">
        <label className="block text-[12px] font-medium">
          App name
          <input
            value={String(general.appName ?? '')}
            onChange={(e) =>
              setData({ ...data, general: { ...general, appName: e.target.value } })
            }
            className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
          />
        </label>
        <label className="block text-[12px] font-medium">
          Support email
          <input
            value={String(general.supportEmail ?? '')}
            onChange={(e) =>
              setData({ ...data, general: { ...general, supportEmail: e.target.value } })
            }
            className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={Boolean(general.maintenanceMode)}
            onChange={(e) =>
              setData({ ...data, general: { ...general, maintenanceMode: e.target.checked } })
            }
          />
          Maintenance mode
        </label>
        <div>
          <p className="text-[12px] font-medium">Feature flags</p>
          <div className="mt-2 space-y-2">
            {Object.keys(featureFlags).map((key) => (
              <label key={key} className="flex items-center gap-2 text-[13px] capitalize">
                <input
                  type="checkbox"
                  checked={Boolean(featureFlags[key])}
                  onChange={(e) =>
                    setData({
                      ...data,
                      featureFlags: { ...featureFlags, [key]: e.target.checked },
                    })
                  }
                />
                {key}
              </label>
            ))}
          </div>
        </div>
        {message ? <p className="text-sm text-[#016BE6]">{message}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-xl bg-[#016BE6] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
