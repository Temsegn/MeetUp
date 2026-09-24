import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { adminApi } from '../api/admin.service';
import {
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  DetailSkeleton,
  EmptyState,
  RoleChip,
  SAAS_CARD,
  SAAS_GHOST,
  SAAS_PRIMARY,
  StatusBadge,
} from '../components/AdminUi';

export function AdminUserDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmNext, setConfirmNext] = useState<'active' | 'suspended' | 'banned' | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi
      .getUser(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load user.'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !data) {
    return (
      <div>
        <AlertBanner tone="error">{error}</AlertBanner>
        <button type="button" className={`${SAAS_GHOST} mt-3`} onClick={() => navigate('/admin/users')}>
          Back to users
        </button>
      </div>
    );
  }

  if (!data) {
    return <DetailSkeleton />;
  }

  const workspaces = (data.workspaces as Array<Record<string, unknown>>) ?? [];
  const status = String(data.accountStatus);
  const name = String(data.name);

  const applyStatus = async () => {
    if (!confirmNext) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.setUserStatus(id, confirmNext);
      setConfirmNext(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={name}
        subtitle={String(data.email)}
        breadcrumb={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Users', to: '/admin/users' },
          { label: name },
        ]}
        actions={
          <>
            <StatusBadge status={status} />
            <button
              type="button"
              className={SAAS_GHOST}
              onClick={() => setConfirmNext(status === 'suspended' ? 'active' : 'suspended')}
            >
              {status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
            {status !== 'banned' ? (
              <button type="button" className={SAAS_GHOST} onClick={() => setConfirmNext('banned')}>
                Ban
              </button>
            ) : (
              <button type="button" className={SAAS_PRIMARY} onClick={() => setConfirmNext('active')}>
                Unban
              </button>
            )}
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={cnCard()}>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={name}
              avatarUrl={data.avatarUrl as string | null}
              avatarColor={data.avatarColor as string | null}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#151D2B]">{name}</p>
              <p className="text-[12px] text-[#6F7B8C]">{String(data.email)}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-[13px]">
            <Row label="Job title" value={String(data.jobTitle || '—')} />
            <Row label="Department" value={String(data.department || '—')} />
            <Row label="Phone" value={String(data.phone || '—')} />
            <div className="flex justify-between gap-4">
              <dt className="text-[#94A3B8]">Platform role</dt>
              <dd>
                <RoleChip role={String(data.platformRole)} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#94A3B8]">Email</dt>
              <dd>
                <StatusBadge status={data.emailVerifiedAt ? 'verified' : 'pending'} />
              </dd>
            </div>
          </dl>
        </div>

        <AdminTableShell title="Organizations" subtitle="Memberships across customer organizations.">
          <AdminTable>
            <AdminTHead columns={[{ label: 'Organization' }, { label: 'Role' }, { label: 'Status' }]} />
            <tbody>
              {workspaces.length === 0 ? (
                <EmptyState colSpan={3} title="No organization memberships" description="This user is not in any organization yet." />
              ) : (
                workspaces.map((w) => (
                  <tr key={String(w.workspaceId)} className="border-t border-[#E2E7ED]/70 text-[12px]">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/workspaces/${String(w.workspaceId)}`}
                        className="font-semibold text-[#151D2B] hover:text-[#016BE6]"
                      >
                        {String(w.name)}
                      </Link>
                      <p className="text-[11px] text-[#6F7B8C]">{String(w.slug ?? '')}</p>
                    </td>
                    <td className="px-2 py-3">
                      <RoleChip role={String(w.role)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={String(w.status ?? 'active')} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <ConfirmDialog
        open={Boolean(confirmNext)}
        danger={confirmNext === 'banned'}
        busy={busy}
        title={
          confirmNext === 'banned'
            ? `Ban ${name}?`
            : confirmNext === 'suspended'
              ? `Suspend ${name}?`
              : `Reactivate ${name}?`
        }
        description={
          confirmNext === 'banned'
            ? 'They will not be able to sign in until an admin unbans the account.'
            : confirmNext === 'suspended'
              ? 'Access is paused until the account is reactivated.'
              : 'The account will be able to sign in again.'
        }
        confirmLabel={confirmNext === 'banned' ? 'Ban user' : confirmNext === 'suspended' ? 'Suspend' : 'Reactivate'}
        onConfirm={() => void applyStatus()}
        onClose={() => {
          if (!busy) setConfirmNext(null);
        }}
      />
    </div>
  );
}

function cnCard() {
  return `${SAAS_CARD} p-5`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#94A3B8]">{label}</dt>
      <dd className="text-right font-medium text-[#151D2B]">{value}</dd>
    </div>
  );
}
