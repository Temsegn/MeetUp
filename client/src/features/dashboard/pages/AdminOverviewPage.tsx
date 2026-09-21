import { Link } from 'react-router-dom';
import { CreditCard, Film, Radio, Users, Video } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useAuth } from '../../../contexts/AuthContext';

export function AdminOverviewPage() {
  const { activeWorkspace } = useAuth();
  const { summary, loading } = useDashboardSummary('week');
  const isStaff =
    activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const billing = summary?.billing;
  const usedPct = billing
    ? Math.min(100, Math.round((billing.used / Math.max(1, billing.included)) * 100))
    : 0;

  return (
    <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-[#E8ECF1] px-3.5 pt-3.5 pb-3 sm:px-5 md:pl-6 lg:pr-6">
          <AppHeader
            title="Admin overview"
            subtitle="Workspace activity, meetings, and plan usage."
          />
        </div>

        <div className="space-y-4 px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
          {!isStaff ? (
            <p className="text-[13px] text-[#6F7B8C]">
              Admin overview is available to workspace owners and admins.
            </p>
          ) : null}

          {loading ? <p className="text-[13px] text-[#6F7B8C]">Loading overview…</p> : null}

          {!loading && isStaff ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  icon={Video}
                  label="Upcoming"
                  value={String(summary?.upcomingMeetings ?? 0)}
                />
                <Stat
                  icon={Radio}
                  label="Live now"
                  value={String(summary?.liveMeetings ?? 0)}
                />
                <Stat
                  icon={Users}
                  label="Participants (period)"
                  value={String(summary?.totalParticipants ?? 0)}
                />
                <Stat
                  icon={Film}
                  label="Recordings"
                  value={String(summary?.totalRecordings ?? 0)}
                />
              </div>

              <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-[#016BE6]" />
                    <h2 className="text-[13px] font-semibold text-[#151D2B]">
                      Plan usage · {billing?.planKey ?? '—'}
                    </h2>
                  </div>
                  <Link
                    to="/app/billing"
                    className="text-[12px] font-semibold text-[#016BE6] hover:underline"
                  >
                    Manage billing
                  </Link>
                </div>
                {billing ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Used" value={`${billing.used}`} />
                      <MiniStat label="Included" value={`${billing.included}`} />
                      <MiniStat label="Remaining" value={`${billing.remaining}`} />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8EEF5]">
                      <div
                        className="h-full rounded-full bg-[#016BE6]"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-[#6F7B8C]">No subscription data yet.</p>
                )}
              </section>

              <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <h2 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Quick links</h2>
                <div className="flex flex-wrap gap-2">
                  <QuickLink to="/app/meetings" label="Meetings" />
                  <QuickLink to="/app/settings/members" label="Members" />
                  <QuickLink to="/app/recordings" label="Recordings" />
                  <QuickLink to="/app/reports" label="Reports" />
                  <QuickLink to="/app/settings/audit" label="Audit logs" />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Video;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 text-[#8A94A6]">
        <Icon className="size-3.5" />
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-[22px] font-bold text-[#151D2B]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">{label}</p>
      <p className="mt-1 text-[16px] font-bold text-[#151D2B]">{value}</p>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center rounded-lg border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
    >
      {label}
    </Link>
  );
}
