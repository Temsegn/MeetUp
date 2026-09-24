import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, TableRowSkeleton } from '../components/AdminUi';
import { money } from '../../workspace/components/InvoiceDocument';

import iconSearch from '../assets/plans/search.svg';
import iconCheck from '../assets/plans/check.svg';
import iconPencil from '../assets/plans/pencil.svg';
import iconKpiDoc from '../assets/plans/kpi-doc.svg';
import iconKpiCheck from '../assets/plans/kpi-check.svg';
import iconKpiUsers from '../assets/plans/kpi-users.svg';
import iconKpiDollar from '../assets/plans/kpi-dollar.svg';
import iconKpiChart from '../assets/plans/kpi-chart.svg';

type PlanKey = 'free' | 'pro' | 'enterprise';

type PlanRow = {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  includedParticipantMinutes: number;
  overageRatePerMinute: number;
  maxMembers: number;
  maxConcurrentMeetings: number;
  recordingStorageGb: number;
  subscribers: number;
  features: {
    messages?: boolean;
    reports?: boolean;
    waitingRoom?: boolean;
    autoRecord?: boolean;
  };
};

const PLAN_STYLE: Record<PlanKey, { letter: string; iconBg: string; tagline: string }> = {
  free: { letter: 'F', iconBg: '#6F7B8C', tagline: 'For getting started' },
  pro: { letter: 'P', iconBg: '#0067ee', tagline: 'For growing teams' },
  enterprise: { letter: 'E', iconBg: '#0fa05c', tagline: 'For large organizations' },
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
    <div className="rounded-2xl border border-[#E4E8ED] bg-white p-3.5 shadow-[0_1px_1px_rgba(21,30,53,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <IconImg src={iconSrc} size={16} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#151E35]">{value}</p>
      <p className="mt-1 text-[11px] text-[#6F7B8C]">{meta}</p>
    </div>
  );
}

function asPlan(row: Record<string, unknown>): PlanRow | null {
  const key = String(row.key);
  if (key !== 'free' && key !== 'pro' && key !== 'enterprise') return null;
  return {
    key,
    name: String(row.name ?? key),
    monthlyPrice: Number(row.priceMonthly ?? row.monthlyPrice ?? 0),
    includedParticipantMinutes: Number(row.includedParticipantMinutes ?? 0),
    overageRatePerMinute: Number(row.overageRatePerMinute ?? 0),
    maxMembers: Number(row.maxMembers ?? 0),
    maxConcurrentMeetings: Number(row.maxConcurrentMeetings ?? 0),
    recordingStorageGb: Number(row.recordingStorageGb ?? 0),
    subscribers: Number(row.subscribers ?? 0),
    features: (row.features as PlanRow['features']) ?? {},
  };
}

export function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [mrr, setMrr] = useState(0);
  const [arr, setArr] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<PlanKey>('pro');
  const [editing, setEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftMinutes, setDraftMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listPlans(), adminApi.billing()])
      .then(([plansRes, billing]) => {
        const next = (plansRes.items ?? []).map(asPlan).filter((p): p is PlanRow => Boolean(p));
        setPlans(next);
        if (next.length && !next.some((p) => p.key === selectedKey)) setSelectedKey(next[0].key);
        const nextMrr = Number(billing.mrr ?? 0);
        setMrr(nextMrr);
        setArr(Number(billing.arr ?? nextMrr * 12));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load plans.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plans.filter(
      (p) => !term || p.name.toLowerCase().includes(term) || p.key.toLowerCase().includes(term),
    );
  }, [plans, search]);

  const selected = filtered.find((p) => p.key === selectedKey) ?? plans.find((p) => p.key === selectedKey) ?? plans[0];
  const totalSubscribers = plans.reduce((s, p) => s + p.subscribers, 0);

  const startEdit = () => {
    if (!selected) return;
    setDraftPrice(String(selected.monthlyPrice));
    setDraftMinutes(String(selected.includedParticipantMinutes));
    setEditing(true);
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.updatePlan(selected.key, {
        monthlyPrice: Number(draftPrice),
        includedParticipantMinutes: Number(draftMinutes),
      });
      const next = (res.items ?? []).map(asPlan).filter((p): p is PlanRow => Boolean(p));
      setPlans(next);
      setEditing(false);
      setMessage(`${selected.name} updated.`);
      const billing = await adminApi.billing();
      const nextMrr = Number(billing.mrr ?? 0);
      setMrr(nextMrr);
      setArr(Number(billing.arr ?? nextMrr * 12));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Subscription Plans"
        subtitle="Free, Pro, and Enterprise pricing from the live catalog."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total Plans" value={plans.length} meta="Catalog plans" iconSrc={iconKpiDoc} iconClass="bg-[#E3EEFF]" />
        <Kpi label="Active Plans" value={plans.length} meta="Currently offered" iconSrc={iconKpiCheck} iconClass="bg-[#DAF7E3]" />
        <Kpi
          label="Total Subscribers"
          value={totalSubscribers.toLocaleString()}
          meta="Active organizations"
          iconSrc={iconKpiUsers}
          iconClass="bg-[#EFEBFF]"
        />
        <Kpi label="MRR" value={money(mrr)} meta="From active paid plans" iconSrc={iconKpiDollar} iconClass="bg-[#FFEFCD]" />
        <Kpi label="Annual Revenue" value={money(arr)} meta="MRR × 12" iconSrc={iconKpiChart} iconClass="bg-[#E3EEFF]" />
      </div>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-emerald-600">{message}</p> : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E4E8ED] bg-white shadow-[0_1px_1px_rgba(21,30,53,0.04)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E8ED] p-3">
            <div className="relative min-w-0 flex-1 basis-[180px]">
              <IconImg src={iconSearch} size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans..."
                className="h-9 w-full rounded-xl border border-[#E4E8ED] bg-white pr-3 pl-9 text-[13px] text-[#151E35] outline-none placeholder:text-[#6F7B8C] focus:border-[#0067EE]"
              />
            </div>
          </div>
          <table className="w-full table-fixed text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E4E8ED] text-[12px] font-bold text-[#151E35]">
                <th className="px-3 py-2.5">Plan Name</th>
                <th className="px-2 py-2.5">Price</th>
                <th className="px-2 py-2.5">Included minutes</th>
                <th className="px-2 py-2.5">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <TableRowSkeleton cols={4} rows={3} /> : filtered.map((p) => {
                const style = PLAN_STYLE[p.key];
                const active = p.key === selected?.key;
                return (
                  <tr
                    key={p.key}
                    onClick={() => {
                      setSelectedKey(p.key);
                      setEditing(false);
                    }}
                    className={cn('cursor-pointer border-t border-[#E4E8ED]', active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]')}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
                          style={{ background: style.iconBg }}
                        >
                          {style.letter}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#151E35]">{p.name}</p>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{style.tagline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <p className="font-bold text-[#151E35]">{p.monthlyPrice > 0 ? money(p.monthlyPrice) : 'Free'}</p>
                      <p className="text-[11px] text-[#6F7B8C]">/ month</p>
                    </td>
                    <td className="px-2 py-2.5 text-[#6F7B8C]">{p.includedParticipantMinutes.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-[#6F7B8C]">{p.subscribers.toLocaleString()}</td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-[#94A3B8]">
                    No plans match your search
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="min-w-0 rounded-2xl border border-[#E4E8ED] bg-white p-4 shadow-[0_1px_1px_rgba(21,30,53,0.04)] xl:self-start">
          {selected ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                  style={{ background: PLAN_STYLE[selected.key].iconBg }}
                >
                  {PLAN_STYLE[selected.key].letter}
                </span>
                <h2 className="mt-3 text-[15px] font-bold text-[#151E35]">{selected.name} Plan</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6F7B8C]">
                  {PLAN_STYLE[selected.key].tagline}. {selected.subscribers} active organizations
                  {selected.subscribers === 1 ? '' : 's'}.
                </p>
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-[#E4E8ED] pt-4 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Monthly price</dt>
                  <dd>
                    {editing ? (
                      <input
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        type="number"
                        min={0}
                        className="h-8 w-24 rounded-lg border border-[#E4E8ED] px-2 text-right"
                      />
                    ) : (
                      <span className="font-bold text-[#151E35]">
                        {selected.monthlyPrice > 0 ? money(selected.monthlyPrice) : 'Free'}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Included minutes</dt>
                  <dd>
                    {editing ? (
                      <input
                        value={draftMinutes}
                        onChange={(e) => setDraftMinutes(e.target.value)}
                        type="number"
                        min={0}
                        className="h-8 w-24 rounded-lg border border-[#E4E8ED] px-2 text-right"
                      />
                    ) : (
                      <span className="text-[#6F7B8C]">{selected.includedParticipantMinutes.toLocaleString()}</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Overage</dt>
                  <dd className="text-[#6F7B8C]">{money(selected.overageRatePerMinute)} / min</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Members</dt>
                  <dd className="text-[#6F7B8C]">{selected.maxMembers.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Concurrent meetings</dt>
                  <dd className="text-[#6F7B8C]">{selected.maxConcurrentMeetings}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Recording storage</dt>
                  <dd className="text-[#6F7B8C]">{selected.recordingStorageGb} GB</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-[#E4E8ED] pt-4">
                <h3 className="text-[12px] font-bold text-[#151E35]">Features</h3>
                <ul className="mt-2.5 space-y-2">
                  {[
                    `Messages: ${selected.features.messages ? 'Yes' : 'No'}`,
                    `Reports: ${selected.features.reports ? 'Yes' : 'No'}`,
                    `Waiting room: ${selected.features.waitingRoom ? 'Yes' : 'No'}`,
                    `Auto-record: ${selected.features.autoRecord ? 'Yes' : 'No'}`,
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-[12px] text-[#6F7B8C]">
                      <IconImg src={iconCheck} size={14} className="mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveEdit()}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0067EE] text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E4E8ED] text-[12px] font-semibold text-[#151E35]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#0067EE] text-[12px] font-semibold text-[#0067EE] hover:bg-[#F0F7FF]"
                  >
                    <IconImg src={iconPencil} size={14} /> Edit price & minutes
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#6F7B8C]">Select a plan</p>
          )}
        </aside>
      </div>
    </div>
  );
}
