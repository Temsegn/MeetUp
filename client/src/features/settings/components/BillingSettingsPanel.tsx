import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  workspaceService,
  type BillingUsage,
  type PlanInfo,
} from '../../../services/workspace/workspace.service';
import { SettingsCard, SettingsSectionHeader } from './SettingsUi';

export function BillingSettingsPanel() {
  const { activeWorkspace } = useAuth();
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      workspaceService.getBillingUsage(activeWorkspace.workspaceId),
      workspaceService.getBillingPlan(activeWorkspace.workspaceId),
      workspaceService.listInvoices(activeWorkspace.workspaceId).catch(() => ({ invoices: [] })),
    ])
      .then(([usageData, planData, invoices]) => {
        if (cancelled) return;
        setUsage(usageData);
        setPlan(planData.plan);
        setInvoiceCount(invoices.invoices.length);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load billing.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId]);

  const usedPct = usage
    ? Math.min(100, Math.round((usage.used / Math.max(1, usage.included)) * 100))
    : 0;

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Billing & Plan"
        description="Participant-minute usage for this workspace."
        action={
          <Link
            to="/app/billing"
            className="text-[12px] font-semibold text-[#016BE6] hover:underline"
          >
            Open full billing
          </Link>
        }
      />
      {loading ? <p className="text-[12px] text-[#6F7B8C]">Loading billing…</p> : null}
      {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
      {!loading && usage ? (
        <>
          <p className="text-[13px] font-semibold text-[#151D2B]">
            Current plan · {plan?.name ?? usage.planKey}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {(
              [
                ['Used', usage.used],
                ['Included', usage.included],
                ['Remaining', usage.remaining],
                ['Overage', usage.overage],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                  {label}
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-[#151D2B]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8EEF5]">
            <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="mt-3 text-[12px] text-[#6F7B8C]">
            Invoices on file: {invoiceCount}. Payment methods connect when a provider is enabled.
          </p>
        </>
      ) : null}
    </SettingsCard>
  );
}
