import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Check,
  ChevronDown,
  Info,
  Mail,
  Minus,
  Phone,
  Search,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { initialsFromName, UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { SettingsToggle } from './SettingsUi';

type Props = {
  onCancel: () => void;
  onCreated: (info: { name: string; email: string }) => void;
};

const CARD =
  'rounded-[14px] border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5';

const INPUT =
  'h-9 w-full rounded-[14px] border border-[#E1E7EE] bg-white text-[12px] text-[#151D2B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';

const LABEL = 'mb-1.5 block text-[12px] font-medium text-[#6F7B8C]';

const DEPTS = [
  'Product',
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'HR',
  'Finance',
  'Other',
];

type AccessMode = 'default' | 'custom';

const PERMS: { key: string; label: string; member: boolean; admin: boolean }[] = [
  { key: 'join', label: 'Join meetings', member: true, admin: true },
  { key: 'rooms', label: 'View rooms', member: true, admin: true },
  { key: 'create', label: 'Create meetings', member: true, admin: true },
  { key: 'upload', label: 'Upload recordings', member: true, admin: true },
  { key: 'reports', label: 'View reports', member: true, admin: true },
  { key: 'users', label: 'Manage users', member: false, admin: true },
  { key: 'billing', label: 'Manage billing', member: false, admin: false },
  { key: 'org', label: 'Organization settings', member: false, admin: true },
];

export function InviteMemberPanel({ onCancel, onCreated }: Props) {
  const { activeWorkspace } = useAuth();
  const isOwner = activeWorkspace?.role === 'owner';
  const canManage = isOwner || activeWorkspace?.role === 'admin';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [reportsQuery, setReportsQuery] = useState('');
  const [reportsTo, setReportsTo] = useState<WorkspaceDirectoryMember | null>(null);
  const [directory, setDirectory] = useState<WorkspaceDirectoryMember[]>([]);
  const [access, setAccess] = useState<AccessMode>('default');
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !canManage) return;
    let cancelled = false;
    workspaceService
      .listDirectory(activeWorkspace.workspaceId)
      .then((rows) => {
        if (!cancelled) setDirectory(rows);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId, canManage]);

  const reportsMatches = useMemo(() => {
    const q = reportsQuery.trim().toLowerCase();
    if (!q || reportsTo) return [];
    return directory
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [directory, reportsQuery, reportsTo]);

  const previewName = name.trim() || 'Jane Doe';
  const previewEmail = email.trim() || 'jane.doe@example.com';
  const previewDept = department || 'Marketing';
  const previewRole = role;

  const permissions = useMemo(
    () =>
      PERMS.map((p) => ({
        ...p,
        allowed: previewRole === 'admin' ? p.admin : p.member,
      })),
    [previewRole],
  );

  const submit = async () => {
    if (!activeWorkspace?.workspaceId || !canManage) return;
    if (!name.trim() || !email.trim()) {
      setError('Full name and work email are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await workspaceService.invite(activeWorkspace.workspaceId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      await new Promise((r) => window.setTimeout(r, 200));
      onCreated({ name: created.name, email: created.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user.');
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div className={CARD}>
        <p className="text-[12px] text-[#6F7B8C]">Only admins can invite members.</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-9 rounded-[14px] border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#475569]"
        >
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-[12px] font-medium text-[#B91C1C]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className={cn(
          'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]',
          busy && 'pointer-events-none opacity-60',
        )}
        aria-busy={busy}
      >
        {/* Left form */}
        <section className={CARD}>
          <h2 className="text-[13px] font-semibold text-[#151D2B]">User Information</h2>
          <div className="mt-4 space-y-3.5">
            <div>
              <label htmlFor="inv-name" className={LABEL}>
                Full Name <span className="text-[#E1212D]">*</span>
              </label>
              <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                <User size={14} className="shrink-0 text-[#94A3B8]" />
                <input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  disabled={busy}
                  className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-email" className={LABEL}>
                Work Email <span className="text-[#E1212D]">*</span>
              </label>
              <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                <Mail size={14} className="shrink-0 text-[#94A3B8]" />
                <input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter work email"
                  disabled={busy}
                  className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-phone" className={LABEL}>
                Phone Number <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                <Phone size={14} className="shrink-0 text-[#94A3B8]" />
                <input
                  id="inv-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  disabled={busy}
                  className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-dept" className={LABEL}>
                Department <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  id="inv-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={busy}
                  className={cn(INPUT, 'appearance-none px-3 pr-8 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]')}
                >
                  <option value="">Select department</option>
                  {DEPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-job" className={LABEL}>
                Job Title <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                <Briefcase size={14} className="shrink-0 text-[#94A3B8]" />
                <input
                  id="inv-job"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Enter job title"
                  disabled={busy}
                  className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <h2 className="mt-6 text-[13px] font-semibold text-[#151D2B]">Role & Access</h2>
          <div className="mt-4 space-y-3.5">
            <div>
              <label htmlFor="inv-role" className={LABEL}>
                Role <span className="text-[#E1212D]">*</span>
              </label>
              <div className="relative">
                <select
                  id="inv-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                  disabled={busy}
                  className={cn(
                    INPUT,
                    'appearance-none px-3 pr-8 capitalize disabled:cursor-not-allowed disabled:bg-[#F8FAFC]',
                  )}
                >
                  <option value="member">Member</option>
                  {isOwner ? <option value="admin">Admin</option> : null}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
                />
              </div>
            </div>

            <div className="relative">
              <label htmlFor="inv-reports" className={LABEL}>
                Reports To <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              {reportsTo ? (
                <div className="flex items-center gap-2 rounded-[14px] border border-[#E1E7EE] bg-[#F8FAFC] px-3 py-2">
                  <UserAvatar
                    name={reportsTo.name}
                    avatarUrl={reportsTo.avatarUrl}
                    avatarColor={reportsTo.avatarColor}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                      {reportsTo.name}
                    </p>
                    <p className="truncate text-[11px] text-[#6F7B8C]">{reportsTo.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportsTo(null);
                      setReportsQuery('');
                    }}
                    className="rounded-full p-1 text-[#6F7B8C] hover:bg-white hover:text-[#151D2B]"
                    aria-label="Clear selected manager"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className={cn(INPUT, 'relative flex items-center gap-2 px-3')}>
                  <Search size={14} className="shrink-0 text-[#94A3B8]" />
                  <input
                    id="inv-reports"
                    value={reportsQuery}
                    onChange={(e) => setReportsQuery(e.target.value)}
                    placeholder="Search users by name or email"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    autoComplete="off"
                  />
                </div>
              )}
              {reportsMatches.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-[14px] border border-[#E1E7EE] bg-white py-1 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)]">
                  {reportsMatches.map((m) => (
                    <li key={m.userId}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F8FAFC]"
                        onClick={() => {
                          setReportsTo(m);
                          setReportsQuery('');
                        }}
                      >
                        <UserAvatar
                          name={m.name}
                          avatarUrl={m.avatarUrl}
                          avatarColor={m.avatarColor}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-[#151D2B]">
                            {m.name}
                          </span>
                          <span className="block truncate text-[11px] text-[#6F7B8C]">{m.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1.5 text-[11px] text-[#8A94A6]">
                Leave empty if this user doesn&apos;t report to anyone
              </p>
            </div>

            <fieldset className="space-y-2.5">
              <legend className={LABEL}>Access</legend>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-[#E8ECF1] p-3 hover:bg-[#F8FAFC]">
                <input
                  type="radio"
                  name="access"
                  checked={access === 'default'}
                  onChange={() => setAccess('default')}
                  className="mt-0.5 accent-[#016BE6]"
                />
                <span>
                  <span className="block text-[12px] font-semibold text-[#151D2B]">
                    Default Access
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#6F7B8C]">
                    Give user default permissions based on their role.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-[#E8ECF1] p-3 hover:bg-[#F8FAFC]">
                <input
                  type="radio"
                  name="access"
                  checked={access === 'custom'}
                  onChange={() => setAccess('custom')}
                  className="mt-0.5 accent-[#016BE6]"
                />
                <span>
                  <span className="block text-[12px] font-semibold text-[#151D2B]">
                    Custom Access
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#6F7B8C]">
                    Customize permissions for this user.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#EEF1F5] pt-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#151D2B]">Send Invitation</p>
              <p className="mt-0.5 text-[11px] text-[#6F7B8C]">
                User will receive an email invitation to join the organization.
              </p>
            </div>
            <SettingsToggle
              label="Send Invitation"
              enabled={sendInvite}
              onChange={setSendInvite}
            />
          </div>
        </section>

        {/* Right preview */}
        <aside className="flex flex-col gap-4">
          <section className={CARD}>
            <h2 className="text-[13px] font-semibold text-[#151D2B]">User Preview</h2>
            <div className="mt-4 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-[#EEF0FF] text-[16px] font-bold text-[#5B6CFF]">
                {initialsFromName(previewName)}
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#151D2B]">{previewName}</p>
              <p className="mt-0.5 text-[11px] text-[#6F7B8C]">{previewEmail}</p>
            </div>
            <dl className="mt-4 space-y-2 border-t border-[#EEF1F5] pt-3 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Role</dt>
                <dd>
                  <span className="inline-flex rounded-md bg-[#EEF0FF] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#5B6CFF]">
                    {previewRole}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Department</dt>
                <dd className="font-medium text-[#151D2B]">{previewDept}</dd>
              </div>
              {jobTitle.trim() ? (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#6F7B8C]">Job title</dt>
                  <dd className="truncate font-medium text-[#151D2B]">{jobTitle.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className={CARD}>
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Role & Permissions</h2>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#6F7B8C]">Selected Role</span>
              <span className="inline-flex rounded-md bg-[#EEF0FF] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#5B6CFF]">
                {previewRole}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {permissions.map((p) => (
                <li key={p.key} className="flex items-center gap-2 text-[12px]">
                  {p.allowed ? (
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#ECFDF3]">
                      <Check size={10} className="text-[#027A48]" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9]">
                      <Minus size={10} className="text-[#94A3B8]" strokeWidth={3} />
                    </span>
                  )}
                  <span className={p.allowed ? 'text-[#151D2B]' : 'text-[#94A3B8]'}>{p.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2 rounded-[14px] border border-[#E8E9FF] bg-[#F6F7FF] px-3 py-2.5">
              <Info size={14} className="mt-0.5 shrink-0 text-[#5B6CFF]" />
              <p className="text-[11px] leading-snug text-[#475569]">
                Permissions are based on the selected role. You can customize permissions after
                creating the user.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pb-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-9 min-w-[100px] rounded-[14px] border border-[#E1E7EE] bg-white px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !name.trim() || !email.trim()}
          onClick={() => void submit()}
          className="inline-flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-[14px] bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
        >
          {busy ? (
            <>
              <span
                className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              Creating…
            </>
          ) : (
            <>
              <UserPlus size={14} strokeWidth={2.25} />
              Create User
            </>
          )}
        </button>
      </div>
    </div>
  );
}
