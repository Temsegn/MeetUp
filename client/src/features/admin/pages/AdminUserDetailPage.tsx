import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, StatusBadge } from '../components/AdminUi';

export function AdminUserDetailPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getUser(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [id]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-[#6F7B8C]">Loading…</p>;

  const workspaces = (data.workspaces as Array<Record<string, unknown>>) ?? [];

  return (
    <div>
      <AdminPageHeader
        title={String(data.name)}
        subtitle={String(data.email)}
        actions={
          <>
            <StatusBadge status={String(data.accountStatus)} />
            <Link to="/admin/users" className="text-[12px] font-semibold text-[#016BE6]">
              Back
            </Link>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 text-[13px]">
          <h2 className="font-semibold text-[#151D2B]">Profile</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-[#94A3B8]">Job title</dt>
              <dd>{String(data.jobTitle || '—')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#94A3B8]">Phone</dt>
              <dd>{String(data.phone || '—')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#94A3B8]">Platform role</dt>
              <dd className="capitalize">{String(data.platformRole).replace('_', ' ')}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4">
          <h2 className="text-[14px] font-semibold">Workspaces</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {workspaces.map((w) => (
              <li key={String(w.workspaceId)} className="flex justify-between">
                <Link to={`/admin/workspaces/${String(w.workspaceId)}`} className="font-medium hover:text-[#016BE6]">
                  {String(w.name)}
                </Link>
                <span className="capitalize text-[#6F7B8C]">{String(w.role)}</span>
              </li>
            ))}
            {workspaces.length === 0 ? <li className="text-[#94A3B8]">No workspace memberships</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
