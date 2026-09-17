import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, StatusBadge } from '../components/AdminUi';

export function AdminWorkspaceDetailPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    adminApi
      .getWorkspace(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-[#6F7B8C]">Loading…</p>;

  const members = (data.members as Array<Record<string, unknown>>) ?? [];
  const sub = data.subscription as Record<string, unknown> | null;
  const owner = data.owner as Record<string, unknown> | null;

  return (
    <div>
      <AdminPageHeader
        title={String(data.name)}
        subtitle={`${String(data.slug)} · Owner ${owner?.email ?? '—'}`}
        actions={
          <>
            <StatusBadge status={String(data.status)} />
            <button
              type="button"
              onClick={() =>
                adminApi
                  .setWorkspaceStatus(id, data.status === 'suspended' ? 'active' : 'suspended')
                  .then(load)
              }
              className="rounded-xl border border-[#E8ECF1] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155]"
            >
              {data.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
            <Link to="/admin/workspaces" className="text-[12px] font-semibold text-[#016BE6]">
              Back
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4">
          <h2 className="text-[14px] font-semibold text-[#151D2B]">Subscription</h2>
          {sub ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[#94A3B8]">Plan</dt>
                <dd className="font-semibold capitalize">{String(sub.planKey)}</dd>
              </div>
              <div>
                <dt className="text-[#94A3B8]">Status</dt>
                <dd>
                  <StatusBadge status={String(sub.status)} />
                </dd>
              </div>
              <div>
                <dt className="text-[#94A3B8]">MRR</dt>
                <dd className="font-semibold">${String(sub.mrr)}</dd>
              </div>
              <div>
                <dt className="text-[#94A3B8]">Usage</dt>
                <dd className="font-semibold">
                  {String(sub.participantMinutesUsed)} / {String(sub.participantMinutesIncluded)} min
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[#94A3B8]">No subscription</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4">
          <h2 className="text-[14px] font-semibold text-[#151D2B]">Members ({members.length})</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {members.map((m) => (
              <li key={String(m.userId)} className="flex items-center justify-between text-[13px]">
                <div>
                  <p className="font-medium text-[#151D2B]">{String(m.name)}</p>
                  <p className="text-[11px] text-[#94A3B8]">{String(m.email)}</p>
                </div>
                <div className="text-right">
                  <p className="capitalize text-[#6F7B8C]">{String(m.role)}</p>
                  <StatusBadge status={String(m.accountStatus)} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
