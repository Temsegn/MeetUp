import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import {
  workspaceService,
  type BillingInvoice,
  type BillingUsage,
  type PlanInfo,
  type BillingSubscription,
  type PaymentMethodInfo,
  type CheckoutCard,
} from '../../../services/workspace/workspace.service';
import { fmtDate, InvoiceStatusPill, money } from '../components/InvoiceDocument';
import { PlanCheckoutModal } from '../components/PlanCheckoutModal';
import { Bone, KpiRowSkeleton, SAAS_CARD, TableSkeleton } from '../../admin/components/AdminUi';

export function BillingPage() {
  const { activeWorkspace } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [meetings, setMeetings] = useState<
    { meetingId: string | null; title: string; participantMinutes: number; durationSeconds: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<
    | { mode: 'upgrade'; plan: PlanInfo }
    | { mode: 'card' }
    | null
  >(null);

  const isOwner = activeWorkspace?.role === 'owner';
  const isAdmin = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const load = async () => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [planList, planData, usageData, invoiceData, meetingData, methodData] = await Promise.all([
        workspaceService.listPlans(activeWorkspace.workspaceId),
        workspaceService.getBillingPlan(activeWorkspace.workspaceId),
        workspaceService.getBillingUsage(activeWorkspace.workspaceId),
        workspaceService.listInvoices(activeWorkspace.workspaceId),
        isAdmin
          ? workspaceService.getBillingUsageByMeeting(activeWorkspace.workspaceId)
          : Promise.resolve({ meetings: [] }),
        workspaceService.listPaymentMethods(activeWorkspace.workspaceId),
      ]);
      setPlans(planList);
      setSubscription(planData.subscription);
      setPlan(planData.plan);
      setUsage(usageData);
      setInvoices(invoiceData.invoices);
      setMeetings(meetingData.meetings);
      setMethods(methodData.paymentMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.workspaceId, isAdmin]);

  const currentPrice = plan?.monthlyPrice ?? 0;

  const startPlanChange = (next: PlanInfo) => {
    if (!activeWorkspace?.workspaceId || !isOwner) return;
    setError(null);
    setMessage(null);
    if ((next.monthlyPrice ?? 0) > currentPrice) {
      setCheckout({ mode: 'upgrade', plan: next });
      return;
    }
    void applyDowngrade(next.key);
  };

  const applyDowngrade = async (planKey: 'free' | 'pro' | 'enterprise') => {
    if (!activeWorkspace?.workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await workspaceService.changePlan(activeWorkspace.workspaceId, planKey);
      setSubscription(data.subscription);
      setPlan(data.plan);
      setMessage(`Plan updated to ${data.plan.name}.`);
      await refreshAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change plan.');
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterChange = async () => {
    if (!activeWorkspace?.workspaceId) return;
    const [usageData, invoiceData, methodData] = await Promise.all([
      workspaceService.getBillingUsage(activeWorkspace.workspaceId),
      workspaceService.listInvoices(activeWorkspace.workspaceId),
      workspaceService.listPaymentMethods(activeWorkspace.workspaceId),
    ]);
    setUsage(usageData);
    setInvoices(invoiceData.invoices);
    setMethods(methodData.paymentMethods);
  };

  const payUpgrade = async (card?: CheckoutCard) => {
    if (!activeWorkspace?.workspaceId || checkout?.mode !== 'upgrade') return;
    setBusy(true);
    setError(null);
    try {
      const data = await workspaceService.upgradePlan(
        activeWorkspace.workspaceId,
        checkout.plan.key,
        card,
      );
      setSubscription(data.subscription);
      setPlan(data.plan);
      setMethods(data.paymentMethods);
      setMessage(`Demo payment OK. Upgraded to ${data.plan.name}.`);
      setCheckout(null);
      await refreshAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveCard = async (card?: CheckoutCard) => {
    if (!activeWorkspace?.workspaceId || !card) return;
    setBusy(true);
    setError(null);
    try {
      const data = await workspaceService.addPaymentMethod(activeWorkspace.workspaceId, card);
      setMethods(data.paymentMethods);
      setMessage('Card saved. You can use it to pay for Pro or Enterprise.');
      setCheckout(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card.');
    } finally {
      setBusy(false);
    }
  };

  const usedPct = usage
    ? Math.min(100, Math.round((usage.used / Math.max(1, usage.included)) * 100))
    : 0;

  return (
    <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-[#E8ECF1] px-3.5 pt-3.5 pb-3 sm:px-5 md:pl-6 lg:pr-6">
          <AppHeader
            title="Billing & Plan"
            subtitle="Live participant-minute usage, plan, and invoices for this workspace."
          />
        </div>

        <div className="space-y-4 px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
          {loading ? (
            <div className="space-y-4">
              <div className={SAAS_CARD + ' p-4'}>
                <Bone className="h-4 w-40" />
                <div className="mt-4">
                  <KpiRowSkeleton count={4} />
                </div>
                <Bone className="mt-4 h-2 w-full rounded-full" />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={SAAS_CARD + ' p-4'}>
                    <Bone className="h-4 w-24" />
                    <Bone className="mt-3 h-7 w-20" />
                    <Bone className="mt-3 h-3 w-full" />
                    <Bone className="mt-2 h-3 w-3/4" />
                    <Bone className="mt-4 h-9 w-full rounded-[14px]" />
                  </div>
                ))}
              </div>
              <div className={SAAS_CARD}>
                <div className="border-b border-[#E2E7ED] px-4 py-3">
                  <Bone className="h-4 w-28" />
                </div>
                <TableSkeleton cols={4} rows={4} />
              </div>
            </div>
          ) : null}
          {error && !checkout ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
          {message ? <p className="text-[12px] text-[#059669]">{message}</p> : null}

          {!loading && usage ? (
            <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="size-4 text-[#016BE6]" />
                <h2 className="text-[13px] font-semibold text-[#151D2B]">
                  Current plan · {plan?.name ?? usage.planKey}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Used" value={`${usage.used}`} />
                <Stat label="Included" value={`${usage.included}`} />
                <Stat label="Remaining" value={`${usage.remaining}`} />
                <Stat label="Overage" value={`${usage.overage}`} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8EEF5]">
                <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-[#8A94A6]">
                Period {fmtDate(usage.periodStart)} – {fmtDate(usage.periodEnd)}
                {subscription ? ` · ${subscription.status}` : ''}
                {plan ? ` · ${money(plan.monthlyPrice ?? 0)} / month` : ''}
              </p>
            </section>
          ) : null}

          <section className="grid gap-3 lg:grid-cols-3">
            {plans.map((p) => {
              const active = plan?.key === p.key || usage?.planKey === p.key;
              const isUpgrade = (p.monthlyPrice ?? 0) > currentPrice;
              return (
                <div
                  key={p.key}
                  className={`rounded-xl border p-4 ${
                    active ? 'border-[#016BE6] bg-[#F8FBFF]' : 'border-[#E8ECF1] bg-white'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-[#151D2B]">{p.name}</h3>
                    {active ? (
                      <span className="rounded-full bg-[#016BE6] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[20px] font-bold text-[#151D2B]">
                    {(p.monthlyPrice ?? 0) > 0 ? money(p.monthlyPrice ?? 0) : 'Free'}
                    <span className="ml-1 text-[12px] font-medium text-[#6F7B8C]">/ month</span>
                  </p>
                  <p className="mt-1 text-[12px] text-[#6F7B8C]">
                    {p.includedParticipantMinutes.toLocaleString()} participant-min included
                  </p>
                  <ul className="mt-3 space-y-1 text-[11px] text-[#6F7B8C]">
                    <li>Up to {p.maxMembers} members</li>
                    <li>{p.maxConcurrentMeetings} concurrent meetings</li>
                    <li>{p.recordingStorageGb} GB recordings</li>
                    <li>Overage {money(p.overageRatePerMinute)} / min</li>
                  </ul>
                  {isOwner && !active ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startPlanChange(p)}
                      className="mt-4 h-9 w-full rounded-xl bg-[#016BE6] text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
                    >
                      {isUpgrade ? `Pay ${money(p.monthlyPrice ?? 0)} · Upgrade to ${p.name}` : `Switch to ${p.name}`}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>

          {isAdmin && meetings.length > 0 ? (
            <section className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[#F1F4F8] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#151D2B]">Usage by meeting</h2>
              </div>
              <ul className="divide-y divide-[#F1F4F8]">
                {meetings.map((m) => (
                  <li key={m.meetingId ?? m.title} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{m.title}</p>
                    <p className="shrink-0 text-[12px] text-[#475569]">{m.participantMinutes} min</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!isOwner ? (
            <p className="text-[12px] text-[#8A94A6]">Only the workspace owner can change the billing plan.</p>
          ) : null}

          <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-[#151D2B]">Payment method</h2>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCheckout({ mode: 'card' });
                  }}
                  className="text-[12px] font-semibold text-[#016BE6]"
                >
                  Add card
                </button>
              ) : null}
            </div>
            {methods.length === 0 ? (
              <p className="text-[12px] text-[#6F7B8C]">
                No card on file. Pay with a card to upgrade to Pro or Enterprise. Only the brand, last 4 digits,
                and expiry are saved.
              </p>
            ) : (
              <ul className="space-y-2">
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-[#F1F4F8] px-3 py-2">
                    <p className="text-[12px] font-semibold text-[#151D2B]">
                      {m.brand.charAt(0).toUpperCase() + m.brand.slice(1)} •••• {m.last4}
                    </p>
                    <p className="text-[11px] text-[#6F7B8C]">
                      {m.exp}
                      {m.isDefault ? ' · Default' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#F1F4F8] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[#151D2B]">Invoices</h2>
            </div>
            {invoices.length === 0 && !loading ? (
              <p className="px-4 py-6 text-[12px] text-[#6F7B8C]">
                No invoices yet. One is created for the current billing period when a plan is active.
              </p>
            ) : (
              <ul className="divide-y divide-[#F1F4F8]">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      to={`/app/billing/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FAFC]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#151D2B]">{inv.number}</p>
                        <p className="text-[11px] text-[#8A94A6]">
                          {fmtDate(inv.issuedAt)} · {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[12px] font-semibold text-[#151D2B]">
                          {money(inv.total, inv.currency)}
                        </span>
                        <InvoiceStatusPill status={inv.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <PlanCheckoutModal
        open={Boolean(checkout)}
        mode={checkout?.mode === 'card' ? 'card' : 'upgrade'}
        title={
          checkout?.mode === 'upgrade'
            ? `Upgrade to ${checkout.plan.name}`
            : 'Add payment method'
        }
        amount={checkout?.mode === 'upgrade' ? checkout.plan.monthlyPrice ?? 0 : 0}
        savedMethods={methods}
        busy={busy}
        error={error}
        onClose={() => {
          setCheckout(null);
          setError(null);
        }}
        onPay={checkout?.mode === 'card' ? saveCard : payUpgrade}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">{label}</p>
      <p className="mt-1 text-[16px] font-bold text-[#151D2B]">{value}</p>
    </div>
  );
}
