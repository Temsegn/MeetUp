import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { adminApi } from '../api/admin.service';
import {
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  EmptyState,
  PersonCell,
  RoleChip,
  SAAS_CARD,
  SAAS_GHOST,
  StatusBadge,
} from '../components/AdminUi';

export function AdminWorkspaceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = () => {
    adminApi
      .getWorkspace(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load organization.'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !data) {
    return (
      <div>
        <AlertBanner tone="error">{error}</AlertBanner>
        <button type="button" className={`${SAAS_GHOST} mt-3`} onClick={() => navigate('/admin/workspaces')}>
          Back to organizations
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[13px] text-[#6F7B8C]">Loading organization…</p>;
  }

  const members = (data.members as Array<Record<string, unknown>>) ?? [];
  const sub = data.subscription as Record<string, unknown> | null;
  const owner = data.owner as Record<string, unknown> | null;
  const name = String(data.name);
  const status = String(data.status);
  const used = Number(sub?.participantMinutesUsed ?? 0);
  const included = Number(sub?.participantMinutesIncluded ?? 1);
  const usagePct = Math.min(100, Math.round((used / Math.max(included, 1)) * 100));

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setWorkspaceStatus(id, status === 'suspended' ? 'active' : 'suspended');
      setConfirmOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={name}
        subtitle={`${String(data.slug)} · Owner ${owner?.email ?? '—'}`}
        breadcrumb={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Organizations', to: '/admin/workspaces' },
          { label: name },
        ]}
        actions={
          <>
            <StatusBadge status={status} />
            <button type="button" className={SAAS_GHOST} onClick={() => setConfirmOpen(true)}>
              {status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${SAAS_CARD} p-5`}>
          <h2 className="text-[15px] font-semibold text-[#151D2B]">Subscription</h2>
          {sub ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <dt className="text-[11px] font-medium text-[#94A3B8]">Plan</dt>
                  <dd className="mt-1">
                    <RoleChip role={String(sub.planKey)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-[#94A3B8]">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={String(sub.status)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-[#94A3B8]">MRR</dt>
                  <dd className="mt-1 text-[16px] font-bold text-[#151D2B]">${String(sub.mrr)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-[#94A3B8]">Owner</dt>
                  <dd className="mt-1 text-[#334155]">{String(owner?.name ?? '—')}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[#334155]">Participant minutes</span>
                  <span className="text-[#6F7B8C]">
                    {used.toLocaleString()} / {included.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF1]">
                  <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${usagePct}%` }} />
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-[#94A3B8]">No subscription on this organization.</p>
          )}
        </div>

        <AdminTableShell title={`Members (${members.length})`} subtitle="People with access to this organization.">
          <AdminTable>
            <AdminTHead columns={[{ label: 'Member' }, { label: 'Role' }, { label: 'Status' }]} />
            <tbody>
              {members.length === 0 ? (
                <EmptyState colSpan={3} title="No members yet" />
              ) : (
                members.map((m) => (
                  <tr key={String(m.userId)} className="border-t border-[#E2E7ED]/70 text-[12px]">
                    <td className="px-4 py-2.5">
                      <PersonCell
                        name={String(m.name)}
                        email={String(m.email)}
                        avatarColor={m.avatarColor as string | null}
                        to={`/admin/users/${String(m.userId)}`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <RoleChip role={String(m.role)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={String(m.accountStatus ?? 'active')} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <p className="mt-4 text-[12px]">
        <Link to="/admin/workspaces" className="font-semibold text-[#016BE6] hover:underline">
          ← All organizations
        </Link>
      </p>

      <ConfirmDialog
        open={confirmOpen}
        danger={status !== 'suspended'}
        busy={busy}
        title={status === 'suspended' ? `Reactivate ${name}?` : `Suspend ${name}?`}
        description={
          status === 'suspended'
            ? 'Members will regain access to meetings and billing.'
            : 'Members of this organization will not be able to hold meetings until you reactivate it.'
        }
        confirmLabel={status === 'suspended' ? 'Reactivate' : 'Suspend'}
        onConfirm={() => void toggle()}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
