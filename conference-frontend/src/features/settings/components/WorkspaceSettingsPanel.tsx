import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, Copy, MoreHorizontal, Search, UserPlus } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { compressImageToDataUrl } from '../../../lib/compressImage';
import {
  workspaceService,
  type WorkspaceMember,
} from '../../../services/workspace/workspace.service';
import { WorkspaceSettingsSkeleton } from './SettingsSkeletons';
import { SettingsToggle } from './SettingsUi';
import { cn } from '../../../lib/cn';

type Props = {
  onViewAllMembers: () => void;
  onInviteMembers: () => void;
};

const CARD =
  'rounded-[16px] border border-[#E8ECF1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-4';

const INPUT =
  'h-9 w-full rounded-[10.13px] border border-[#E1E7EE] bg-white px-3 text-[12px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-70';

const LABEL = 'mb-1.5 block text-[12px] font-medium text-[#6F7B8C]';

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className={LABEL}>
      {children}
    </label>
  );
}

/** Figma row: label left, control right */
function SelectRow({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EEF1F5] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <label htmlFor={id} className="shrink-0 text-[12px] font-semibold text-[#151D2B]">
        {label}
      </label>
      <div className="relative min-w-0 max-w-[58%] flex-1 sm:max-w-[220px]">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(INPUT, 'appearance-none truncate pr-8')}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
        />
      </div>
    </div>
  );
}

export function WorkspaceSettingsPanel({ onViewAllMembers, onInviteMembers }: Props) {
  const { activeWorkspace, user, refreshWorkspaces } = useAuth();
  const canEdit = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  /** Only sent on save when the user picks a new logo (or clears it). */
  const [pendingLogo, setPendingLogo] = useState<string | null | undefined>(undefined);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [joinBeforeHost, setJoinBeforeHost] = useState(false);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState('30 minutes');
  const [timeZone, setTimeZone] = useState('(GMT+05:30) Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12-Hour (AM/PM)');
  const [language, setLanguage] = useState('English');

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      workspaceService.get(activeWorkspace.workspaceId),
      workspaceService.listMembers(activeWorkspace.workspaceId).catch(() => [] as WorkspaceMember[]),
    ])
      .then(([ws, memberRows]) => {
        if (cancelled) return;
        setName(ws.name);
        setSlug(ws.slug);
        setEmail(ws.email || `hello@${ws.slug}.samtal.com`);
        setLogoUrl(ws.logoUrl);
        setPendingLogo(undefined);
        setWaitingRoom(Boolean(ws.settings.waitingRoom));
        setAutoRecord(Boolean(ws.settings.autoRecord));
        setJoinBeforeHost(Boolean(ws.settings.joinBeforeHost));
        setMuteOnEntry(Boolean(ws.settings.muteOnEntry));
        setMaxMinutes(`${ws.settings.maxMeetingDurationMinutes ?? 30} minutes`);
        setLanguage(ws.settings.language || 'English');
        setMembers(memberRows);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load workspace.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'All Roles' && m.role !== roleFilter.toLowerCase()) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, memberQuery, roleFilter]);

  const previewMembers = filteredMembers.slice(0, 5);

  const onLogoSelected = async (file: File | null) => {
    if (!file || !canEdit) return;
    setError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, maxBytes: 400_000 });
      setLogoUrl(dataUrl);
      setPendingLogo(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process logo.');
    }
  };

  const saveInfo = async () => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName) {
      setError('Workspace name is required.');
      return;
    }
    if (trimmedSlug.length < 2) {
      setError('Domain must be at least 2 characters.');
      return;
    }
    setSavingInfo(true);
    setMessage(null);
    setError(null);
    try {
      const patch: {
        name: string;
        slug: string;
        email: string;
        logoUrl?: string | null;
      } = {
        name: trimmedName,
        slug: trimmedSlug,
        email: email.trim(),
      };
      if (pendingLogo !== undefined) {
        patch.logoUrl = pendingLogo;
      }
      const updated = await workspaceService.updateSettings(activeWorkspace.workspaceId, patch);
      setName(updated.name);
      setSlug(updated.slug);
      setEmail(updated.email || `hello@${updated.slug}.samtal.com`);
      setLogoUrl(updated.logoUrl);
      setPendingLogo(undefined);
      await refreshWorkspaces();
      setMessage('Workspace information saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingInfo(false);
    }
  };

  const saveSettings = async () => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    setSavingSettings(true);
    setMessage(null);
    setError(null);
    try {
      const parsed = Number.parseInt(maxMinutes, 10);
      await workspaceService.updateSettings(activeWorkspace.workspaceId, {
        waitingRoom,
        autoRecord,
        joinBeforeHost,
        muteOnEntry,
        maxMeetingDurationMinutes: Number.isFinite(parsed) ? parsed : 30,
        language,
      });
      setMessage('Workspace settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const changeRole = async (userId: string, role: 'admin' | 'member') => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    try {
      await workspaceService.changeRole(activeWorkspace.workspaceId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role.');
    }
  };

  const persistToggle = (patch: {
    waitingRoom?: boolean;
    autoRecord?: boolean;
    joinBeforeHost?: boolean;
    muteOnEntry?: boolean;
  }) => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    void workspaceService
      .updateSettings(activeWorkspace.workspaceId, patch)
      .catch(() => setError('Could not update meeting setting.'));
  };

  const copyDomain = async () => {
    try {
      await navigator.clipboard.writeText(`${slug}.samtal.com`);
      setMessage('Domain copied.');
    } catch {
      setError('Could not copy domain.');
    }
  };

  if (loading) {
    return <WorkspaceSettingsSkeleton />;
  }

  return (
    <div className="space-y-3">
      {message ? (
        <div
          className="rounded-[10.13px] border border-[#C7E7D4] bg-[#ECFDF3] px-3.5 py-2 text-[13px] font-medium text-[#027A48]"
          role="status"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          className="rounded-[10.13px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-[13px] font-medium text-[#B91C1C]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
          {/* Workspace Information — full width on top */}
          <section className={CARD}>
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Workspace Information</h2>
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
              Update your workspace details and preferences.
            </p>

            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* Logo + Save */}
              <div className="flex w-full shrink-0 flex-col items-stretch gap-3.5 sm:w-[128px]">
                <div className="relative mx-auto aspect-square w-full max-w-[128px] overflow-hidden rounded-[16px] bg-[#ACCFFF] sm:mx-0 sm:max-w-none">
                  <div className="flex size-full items-center justify-center">
                    <img
                      src={logoUrl || '/samtal-mark.png'}
                      alt="Workspace logo"
                      className={
                        logoUrl
                          ? 'size-full object-cover'
                          : 'size-[72%] object-contain'
                      }
                    />
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      e.target.value = '';
                      void onLogoSelected(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute right-2.5 bottom-2.5 flex size-7 items-center justify-center rounded-full bg-white text-[#475569] shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:text-[#151D2B] disabled:opacity-50"
                    aria-label="Upload workspace logo"
                  >
                    <Camera size={14} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canEdit || savingInfo}
                  onClick={() => void saveInfo()}
                  className="h-9 w-full rounded-[10.13px] bg-[#016BE6] text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
                >
                  {savingInfo ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Name · Email · Domain · Size */}
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="ws-name">Workspace Name</FieldLabel>
                  <input
                    id="ws-name"
                    value={name}
                    disabled={!canEdit}
                    onChange={(e) => setName(e.target.value)}
                    className={INPUT}
                    placeholder="Company or workspace name"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ws-email">Workspace Email</FieldLabel>
                  <input
                    id="ws-email"
                    type="email"
                    value={email}
                    disabled={!canEdit}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT}
                    placeholder="hello@company.com"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ws-domain">Workspace Domain</FieldLabel>
                  <div className="flex h-9 items-center gap-1.5 rounded-[10.13px] border border-[#E1E7EE] bg-white px-3">
                    <input
                      id="ws-domain"
                      value={slug}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSlug(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())
                      }
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[#151D2B] outline-none disabled:opacity-70"
                      placeholder="workspace"
                    />
                    <span className="shrink-0 text-[12px] text-[#6F7B8C]">.samtal.com</span>
                    <button
                      type="button"
                      onClick={() => void copyDomain()}
                      className="ml-0.5 shrink-0 rounded p-0.5 text-[#6F7B8C] hover:bg-[#F8FAFC] hover:text-[#016BE6]"
                      aria-label="Copy domain"
                      title="Copy domain"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel>Workspace Size</FieldLabel>
                  <p className="flex h-9 items-center text-[12px] text-[#151D2B]">
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Figma: left Settings+Meeting, right Members+Danger */}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
              <section className={CARD}>
                <h2 className="text-[13px] font-semibold text-[#151D2B]">Workspace Settings</h2>
                <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                  Configure general settings for your workspace.
                </p>
                <div className="mt-4">
                  <SelectRow
                    id="ws-tz"
                    label="Time Zone"
                    value={timeZone}
                    onChange={setTimeZone}
                    disabled={!canEdit}
                    options={[
                      '(GMT+05:30) Asia/Kolkata',
                      '(GMT+03:00) Asia/Riyadh',
                      '(GMT+00:00) UTC',
                      '(GMT-05:00) America/New_York',
                    ]}
                  />
                  <SelectRow
                    id="ws-date"
                    label="Date Format"
                    value={dateFormat}
                    onChange={setDateFormat}
                    disabled={!canEdit}
                    options={['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']}
                  />
                  <SelectRow
                    id="ws-time"
                    label="Time Format"
                    value={timeFormat}
                    onChange={setTimeFormat}
                    disabled={!canEdit}
                    options={['12-Hour (AM/PM)', '24-Hour']}
                  />
                  <SelectRow
                    id="ws-lang"
                    label="Default Language"
                    value={language}
                    onChange={setLanguage}
                    disabled={!canEdit}
                    options={['English', 'Arabic', 'French']}
                  />
                  <SelectRow
                    id="ws-duration"
                    label="Default Meeting Duration"
                    value={maxMinutes}
                    onChange={setMaxMinutes}
                    disabled={!canEdit}
                    options={[
                      '30 minutes',
                      '45 minutes',
                      '60 minutes',
                      '90 minutes',
                      '120 minutes',
                    ]}
                  />
                </div>
                <button
                  type="button"
                  disabled={!canEdit || savingSettings}
                  onClick={() => void saveSettings()}
                  className="mt-4 h-9 rounded-[10.13px] border border-[#016BE6] bg-white px-4 text-[12px] font-semibold text-[#016BE6] hover:bg-[#E8F1FE] disabled:opacity-60"
                >
                  {savingSettings ? 'Saving…' : 'Save Settings'}
                </button>
              </section>

              <section className={CARD}>
                <h2 className="text-[13px] font-semibold text-[#151D2B]">Meeting Settings</h2>
                <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                  Set default preferences for all meetings in this workspace.
                </p>
                <ul className="mt-4 space-y-4">
                  {(
                    [
                      {
                        key: 'waiting' as const,
                        title: 'Enable Waiting Room',
                        desc: 'When on, members must request to join. Guests always wait for host approval.',
                        value: waitingRoom,
                        set: setWaitingRoom,
                      },
                      {
                        key: 'join' as const,
                        title: 'Enable Join Before Host',
                        desc: 'Allow participants to join before the host',
                        value: joinBeforeHost,
                        set: setJoinBeforeHost,
                      },
                      {
                        key: 'mute' as const,
                        title: 'Mute Participants on Entry',
                        desc: 'Participants will be muted when they join',
                        value: muteOnEntry,
                        set: setMuteOnEntry,
                      },
                      {
                        key: 'record' as const,
                        title: 'Auto Record Meetings',
                        desc: 'Automatically record all meetings',
                        value: autoRecord,
                        set: setAutoRecord,
                      },
                    ]
                  ).map((row) => (
                    <li key={row.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pr-2">
                        <p className="text-[12px] font-semibold text-[#151D2B]">{row.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#6F7B8C]">{row.desc}</p>
                      </div>
                      <SettingsToggle
                        label={row.title}
                        enabled={row.value}
                        disabled={!canEdit}
                        onChange={(next) => {
                          row.set(next);
                          if (row.key === 'waiting') persistToggle({ waitingRoom: next });
                          if (row.key === 'join') persistToggle({ joinBeforeHost: next });
                          if (row.key === 'mute') persistToggle({ muteOnEntry: next });
                          if (row.key === 'record') persistToggle({ autoRecord: next });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <section className={CARD}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-semibold text-[#151D2B]">
                      Members ({members.length})
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                      Manage workspace members and their roles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onInviteMembers}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10.13px] border border-[#016BE6] px-3 text-[12px] font-semibold text-[#016BE6] hover:bg-[#E8F1FE]"
                  >
                    <UserPlus size={14} strokeWidth={2} />
                    Invite Members
                  </button>
                </div>

                <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10.13px] border border-[#E1E7EE] bg-white px-3">
                    <Search size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      placeholder="Search members..."
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[#151D2B] outline-none placeholder:text-[#94A3B8]"
                    />
                  </label>
                  <div className="relative shrink-0">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className={cn(INPUT, 'h-9 w-full appearance-none pr-8 text-[12px] sm:w-[128px]')}
                    >
                      <option>All Roles</option>
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>Member</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
                    />
                  </div>
                </div>

                <ul className="mt-8 divide-y divide-[#EEF1F5]">
                  {previewMembers.length === 0 ? (
                    <li className="py-8 text-center text-[12px] text-[#8A94A6]">No members found.</li>
                  ) : (
                    previewMembers.map((m) => {
                      const isYou = Boolean(user?.id && m.userId === user.id);
                      return (
                        <li key={m.userId} className="flex items-center gap-2.5 py-3">
                          <span className="relative shrink-0">
                            <UserAvatar
                              name={m.name}
                              avatarUrl={m.avatarUrl}
                              avatarColor={m.avatarColor}
                              size="md"
                            />
                            <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                                {m.name}
                              </p>
                              {isYou ? (
                                <span className="shrink-0 rounded-md bg-[#E8F1FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#016BE6]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[11px] text-[#6F7B8C]">{m.email}</p>
                          </div>
                          {m.role === 'owner' || !canEdit ? (
                            <span className="inline-flex h-8 shrink-0 items-center rounded-[10.13px] border border-[#E1E7EE] px-2.5 text-[11px] font-medium capitalize text-[#475569]">
                              {m.role}
                            </span>
                          ) : (
                            <div className="relative shrink-0">
                              <select
                                value={m.role}
                                onChange={(e) =>
                                  void changeRole(m.userId, e.target.value as 'admin' | 'member')
                                }
                                className="h-8 appearance-none rounded-[10.13px] border border-[#E1E7EE] bg-white py-0 pr-7 pl-2.5 text-[11px] font-medium capitalize text-[#334155] outline-none"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>
                              <ChevronDown
                                size={13}
                                className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[#6F7B8C]"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            className="shrink-0 rounded-md p-1 text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569]"
                            aria-label={`More actions for ${m.name}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={onViewAllMembers}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#016BE6] hover:underline"
                  >
                    View all members
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </section>

              <section className={CARD}>
                <h2 className="text-[13px] font-semibold text-[#151D2B]">Danger Zone</h2>
                <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                  Permanently delete your workspace and all associated data.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#E1212D]">Delete Workspace</p>
                    <p className="mt-0.5 text-[11px] text-[#6F7B8C]">
                      Once you delete your workspace, there is no going back.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit || activeWorkspace?.role !== 'owner'}
                    className="h-9 shrink-0 rounded-[10.13px] border border-[#E1212D] bg-white px-4 text-[12px] font-semibold text-[#E1212D] hover:bg-[#FEF2F2] disabled:opacity-50"
                  >
                    Delete Workspace
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
    </div>
  );
}
