import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { workspaceService } from '../../../services/workspace/workspace.service';
import { SettingsCard, SettingsSectionHeader } from './SettingsUi';
import { TableSkeleton } from '../../admin/components/AdminUi';

type AuditRow = {
  id: string;
  action: string;
  userId: string | null;
  email: string | null;
  ip: string | null;
  createdAt: string;
};

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function AuditLogsPanel() {
  const { activeWorkspace } = useAuth();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    workspaceService
      .listAuditLogs(activeWorkspace.workspaceId, { page, limit })
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
          setLogs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isStaff =
    activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Audit logs"
        description={
          isStaff
            ? 'Security and account activity for members of this workspace.'
            : 'Your recent security and account activity.'
        }
      />
      {error ? <p className="mb-3 text-[12px] text-[#DC2626]">{error}</p> : null}
      {loading ? (
        <TableSkeleton cols={4} rows={6} />
      ) : logs.length === 0 ? (
        <p className="text-[12px] text-[#6F7B8C]">No audit events yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#EEF1F5]">
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#8A94A6]">When</th>
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#8A94A6]">Action</th>
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#8A94A6]">User</th>
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#8A94A6]">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b border-[#F1F4F8] last:border-b-0">
                    <td className="px-2 py-2.5 text-[12px] text-[#475569]">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2.5 text-[12px] font-medium text-[#151D2B]">
                      {formatAction(row.action)}
                    </td>
                    <td className="px-2 py-2.5 text-[12px] text-[#475569]">
                      {row.email || row.userId || '—'}
                    </td>
                    <td className="px-2 py-2.5 text-[12px] text-[#8A94A6]">{row.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#8A94A6]">
                Page {page} of {totalPages} · {total} events
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 rounded-lg border border-[#E1E7EE] px-2.5 text-[12px] font-semibold text-[#334155] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 rounded-lg border border-[#E1E7EE] px-2.5 text-[12px] font-semibold text-[#334155] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </SettingsCard>
  );
}
