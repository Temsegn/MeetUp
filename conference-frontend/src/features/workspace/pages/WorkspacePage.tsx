import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, CreditCard, Save } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { workspaceService, type Workspace } from '../../../services/workspace/workspace.service';

export function WorkspacePage() {
  const { activeWorkspace } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(120);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    workspaceService
      .get(activeWorkspace.workspaceId)
      .then((ws) => {
        setWorkspace(ws);
        setName(ws.name);
        setWaitingRoom(ws.settings.waitingRoom);
        setAutoRecord(ws.settings.autoRecord);
        setMaxMinutes(ws.settings.maxMeetingDurationMinutes);
      })
      .catch(() => setError('Could not load workspace.'))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId]);

  const save = async () => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await workspaceService.updateSettings(activeWorkspace.workspaceId, {
        name: name.trim(),
        waitingRoom,
        autoRecord,
        maxMeetingDurationMinutes: maxMinutes,
      });
      setWorkspace(updated);
      setMessage('Workspace settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-[#E8ECF1] px-3.5 pt-3.5 pb-3 sm:px-5 md:pl-6 lg:pr-6">
          <AppHeader
            title="Workspace"
            subtitle="Organization settings, defaults, and team access."
          />
        </div>

        <div className="space-y-4 px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
          {loading ? (
            <p className="text-[13px] text-[#6F7B8C]">Loading workspace…</p>
          ) : error && !workspace ? (
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          ) : (
            <>
              <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="size-4 text-[#016BE6]" />
                  <h2 className="text-[13px] font-semibold text-[#151D2B]">Organization</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-semibold text-[#475569]">
                    Workspace name
                    <input
                      type="text"
                      value={name}
                      disabled={!canEdit}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none disabled:bg-[#F8FAFC]"
                    />
                  </label>
                  <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">Slug</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#151D2B]">{workspace?.slug}</p>
                  </div>
                  <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">Your role</p>
                    <p className="mt-1 text-[12px] font-semibold capitalize text-[#151D2B]">
                      {activeWorkspace?.role}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">Created</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#151D2B]">
                      {workspace
                        ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <h2 className="mb-4 text-[13px] font-semibold text-[#151D2B]">Meeting defaults</h2>
                <div className="space-y-3">
                  <ToggleRow
                    label="Waiting room"
                    description="Admit participants manually before they join."
                    checked={waitingRoom}
                    disabled={!canEdit}
                    onChange={setWaitingRoom}
                  />
                  <ToggleRow
                    label="Auto-record"
                    description="Start recording when a meeting goes live."
                    checked={autoRecord}
                    disabled={!canEdit}
                    onChange={setAutoRecord}
                  />
                  <label className="block text-[12px] font-semibold text-[#475569]">
                    Max meeting duration (minutes)
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={maxMinutes}
                      disabled={!canEdit}
                      onChange={(e) => setMaxMinutes(Number(e.target.value) || 120)}
                      className="mt-1 h-10 w-full max-w-xs rounded-lg border border-[#E1E7EE] px-3 text-[12px] outline-none disabled:bg-[#F8FAFC]"
                    />
                  </label>
                </div>

                {canEdit ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void save()}
                      disabled={saving || !name.trim()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#016BE6] px-3.5 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
                    >
                      <Save className="size-3.5" />
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    {message ? <p className="text-[12px] text-[#059669]">{message}</p> : null}
                    {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
                  </div>
                ) : (
                  <p className="mt-4 text-[12px] text-[#8A94A6]">Only owners and admins can edit workspace settings.</p>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <Link
                  to="/app/workspace/members"
                  className="flex items-start gap-3 rounded-xl border border-[#E8ECF1] bg-white p-4 hover:bg-[#F8FAFC]"
                >
                  <Users className="mt-0.5 size-4 text-[#016BE6]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#151D2B]">Members</p>
                    <p className="mt-0.5 text-[12px] text-[#6F7B8C]">Invite teammates and manage roles.</p>
                  </div>
                </Link>
                <Link
                  to="/app/billing"
                  className="flex items-start gap-3 rounded-xl border border-[#E8ECF1] bg-white p-4 hover:bg-[#F8FAFC]"
                >
                  <CreditCard className="mt-0.5 size-4 text-[#016BE6]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#151D2B]">Billing & Plan</p>
                    <p className="mt-0.5 text-[12px] text-[#6F7B8C]">Participant-minute usage and upgrades.</p>
                  </div>
                </Link>
                <div className="rounded-xl border border-[#E8ECF1] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 size-4 text-[#016BE6]" />
                    <div>
                      <p className="text-[13px] font-semibold text-[#151D2B]">Payment method</p>
                      <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                        Card on file will appear here after Stripe billing is connected.
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-[#8A94A6]">No payment method yet</p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F1F4F8] px-3 py-2.5">
      <div>
        <p className="text-[12px] font-semibold text-[#151D2B]">{label}</p>
        <p className="text-[11px] text-[#8A94A6]">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-[#016BE6]' : 'bg-[#CBD5E1]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
