import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import {
  workspaceService,
  type BillingUsage,
  type PlanInfo,
  type BillingSubscription,
} from '../../../services/workspace/workspace.service';

export function BillingPage() {
  const { activeWorkspace } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [meetings, setMeetings] = useState<
    { meetingId: string | null; title: string; participantMinutes: number; durationSeconds: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isOwner = activeWorkspace?.role === 'owner';
  const isAdmin = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      workspaceService.listPlans(activeWorkspace.workspaceId),
      workspaceService.getBillingPlan(activeWorkspace.workspaceId),
      workspaceService.getBillingUsage(activeWorkspace.workspaceId),
      isAdmin
        ? workspaceService.getBillingUsageByMeeting(activeWorkspace.workspaceId)
        : Promise.resolve({ meetings: [] }),
    ])
      .then(([planList, planData, usageData, meetingData]) => {
        setPlans(planList);
        setSubscription(planData.subscription);
        setPlan(planData.plan);
        setUsage(usageData);
        setMeetings(meetingData.meetings);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load billing.'))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId, isAdmin]);

  const changePlan = async (planKey: 'free' | 'pro' | 'enterprise') => {
    if (!activeWorkspace?.workspaceId || !isOwner) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await workspaceService.changePlan(activeWorkspace.workspaceId, planKey);
      setSubscription(data.subscription);
      setPlan(data.plan);
      setMessage(`Plan updated to ${data.plan.name}.`);
      const usageData = await workspaceService.getBillingUsage(activeWorkspace.workspaceId);
      setUsage(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change plan.');
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
            subtitle="Participant-minute usage across your organization."
          />
        </div>

        <div className="space-y-4 px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
          {loading ? <p className="text-[13px] text-[#6F7B8C]">Loading billing…</p> : null}
          {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
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
                Period {new Date(usage.periodStart).toLocaleDateString()} –{' '}
                {new Date(usage.periodEnd).toLocaleDateString()}
                {subscription ? ` · status ${subscription.status}` : ''}
              </p>
            </section>
          ) : null}

          <section className="grid gap-3 lg:grid-cols-3">
            {plans.map((p) => {
              const active = plan?.key === p.key || usage?.planKey === p.key;
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
                    {p.includedParticipantMinutes.toLocaleString()}
                    <span className="ml-1 text-[12px] font-medium text-[#6F7B8C]">participant-min</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-[11px] text-[#6F7B8C]">
                    <li>Up to {p.maxMembers} members</li>
                    <li>{p.maxConcurrentMeetings} concurrent meetings</li>
                    <li>{p.recordingStorageGb} GB recordings</li>
                    <li>Messages: {p.features.messages ? 'Yes' : 'No'}</li>
                    <li>Reports: {p.features.reports ? 'Yes' : 'No'}</li>
                  </ul>
                  {isOwner && !active ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void changePlan(p.key)}
                      className="mt-4 h-9 w-full rounded-xl bg-[#016BE6] text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
                    >
                      Switch to {p.name}
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
            <h2 className="mb-2 text-[13px] font-semibold text-[#151D2B]">Payment method</h2>
            <p className="text-[12px] text-[#6F7B8C]">
              Add a card for overage billing and plan upgrades. Stripe checkout wiring comes next.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 h-9 rounded-xl border border-[#E1E7EE] px-3.5 text-[12px] font-semibold text-[#8A94A6]"
            >
              Add payment method (coming soon)
            </button>
          </section>
        </div>
      </div>
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
