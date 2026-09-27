import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminTable,
  AdminTHead,
  AlertBanner,
  EmptyState,
  RoleChip,
  SAAS_CARD,
  SAAS_GHOST,
  SAAS_PRIMARY,
  SAAS_TEXT_INPUT,
  SearchField,
  TableRowSkeleton,
} from '../components/AdminUi';
import { money } from '../../workspace/components/InvoiceDocument';

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
  pro: { letter: 'P', iconBg: '#016BE6', tagline: 'For growing teams' },
  enterprise: { letter: 'E', iconBg: '#059669', tagline: 'For large organizations' },
};

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
        title="Plans"
        subtitle="Free, Pro, and Enterprise pricing from the live catalog."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard label="Total plans" value={plans.length} meta="Catalog plans" />
        <AdminKpiCard label="Active plans" value={plans.length} meta="Currently offered" />
        <AdminKpiCard label="Subscribers" value={totalSubscribers.toLocaleString()} meta="Active organizations" />
        <AdminKpiCard label="MRR" value={money(mrr)} meta="From active paid plans" />
        <AdminKpiCard label="Annual revenue" value={money(arr)} meta="MRR × 12" />
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#E1E7EE] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E1E7EE] p-3">
            <SearchField value={search} onChange={setSearch} placeholder="Search plans..." className="sm:w-full" />
          </div>
          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'Plan' },
                { label: 'Price' },
                { label: 'Included minutes' },
                { label: 'Subscribers' },
              ]}
            />
            <tbody>
              {loading ? (
                <TableRowSkeleton cols={4} rows={3} />
              ) : filtered.length === 0 ? (
                <EmptyState colSpan={4} title="No plans" description="No plans match your search." />
              ) : (
                filtered.map((p) => {
                  const style = PLAN_STYLE[p.key];
                  const active = p.key === selected?.key;
                  return (
                    <tr
                      key={p.key}
                      onClick={() => {
                        setSelectedKey(p.key);
                        setEditing(false);
                      }}
                      className={cn(
                        'cursor-pointer border-t border-[#E8ECF1]',
                        active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]',
                      )}
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
                            <p className="truncate text-[13px] font-semibold text-[#151D2B]">{p.name}</p>
                            <p className="truncate text-[11px] text-[#6F7B8C]">{style.tagline}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-bold text-[#151D2B]">{p.monthlyPrice > 0 ? money(p.monthlyPrice) : 'Free'}</p>
                        <p className="text-[11px] text-[#6F7B8C]">/ month</p>
                      </td>
                      <td className="px-2 py-2.5 text-[#6F7B8C]">{p.includedParticipantMinutes.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-[#6F7B8C]">{p.subscribers.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </AdminTable>
        </div>

        <aside className={`${SAAS_CARD} min-w-0 p-4 xl:self-start`}>
          {selected ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                  style={{ background: PLAN_STYLE[selected.key].iconBg }}
                >
                  {PLAN_STYLE[selected.key].letter}
                </span>
                <h2 className="mt-3 text-[15px] font-bold text-[#151D2B]">{selected.name} plan</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6F7B8C]">
                  {PLAN_STYLE[selected.key].tagline}. {selected.subscribers} active organization
                  {selected.subscribers === 1 ? '' : 's'}.
                </p>
                <div className="mt-2">
                  <RoleChip role={selected.key} />
                </div>
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-[#E8ECF1] pt-4 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Monthly price</dt>
                  <dd>
                    {editing ? (
                      <input
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        type="number"
                        min={0}
                        className={`${SAAS_TEXT_INPUT} h-8 w-24 px-2 text-right`}
                      />
                    ) : (
                      <span className="font-bold text-[#151D2B]">
                        {selected.monthlyPrice > 0 ? money(selected.monthlyPrice) : 'Free'}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Included minutes</dt>
                  <dd>
                    {editing ? (
                      <input
                        value={draftMinutes}
                        onChange={(e) => setDraftMinutes(e.target.value)}
                        type="number"
                        min={0}
                        className={`${SAAS_TEXT_INPUT} h-8 w-24 px-2 text-right`}
                      />
                    ) : (
                      <span className="text-[#6F7B8C]">{selected.includedParticipantMinutes.toLocaleString()}</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Overage</dt>
                  <dd className="text-[#6F7B8C]">{money(selected.overageRatePerMinute)} / min</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Members</dt>
                  <dd className="text-[#6F7B8C]">{selected.maxMembers.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Concurrent meetings</dt>
                  <dd className="text-[#6F7B8C]">{selected.maxConcurrentMeetings}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151D2B]">Recording storage</dt>
                  <dd className="text-[#6F7B8C]">{selected.recordingStorageGb} GB</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-[#E8ECF1] pt-4">
                <h3 className="text-[12px] font-bold text-[#151D2B]">Features</h3>
                <ul className="mt-2.5 space-y-2">
                  {[
                    `Messages: ${selected.features.messages ? 'Yes' : 'No'}`,
                    `Reports: ${selected.features.reports ? 'Yes' : 'No'}`,
                    `Waiting room: ${selected.features.waitingRoom ? 'Yes' : 'No'}`,
                    `Auto-record: ${selected.features.autoRecord ? 'Yes' : 'No'}`,
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-[12px] text-[#6F7B8C]">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#016BE6]" strokeWidth={2} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {editing ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => void saveEdit()} className={SAAS_PRIMARY}>
                      {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className={SAAS_GHOST}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={startEdit} className={`${SAAS_GHOST} col-span-2 text-[#016BE6]`}>
                    <Pencil className="size-3.5" /> Edit price & minutes
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
