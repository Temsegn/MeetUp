import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Check,
  ChevronDown,
  Info,
  Mail,
  Minus,
  Pencil,
  Phone,
  User,
} from 'lucide-react';
import { initialsFromName, UserAvatar } from '../../../components/ui/UserAvatar';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import {
  workspaceService,
  type WorkspaceMember,
} from '../../../services/workspace/workspace.service';

type Mode = 'view' | 'edit';

type Props = {
  userId: string;
  mode: Mode;
  onBack: () => void;
  onEdit: () => void;
  onSaved: () => void;
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

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <p className="rounded-[14px] border border-[#EEF1F5] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-medium text-[#151D2B]">
        {value || '—'}
      </p>
    </div>
  );
}

export function MemberUserPanel({ userId, mode, onBack, onEdit, onSaved }: Props) {
  const { activeWorkspace, user: me } = useAuth();
  const isOwner = activeWorkspace?.role === 'owner';
  const canManage = isOwner || activeWorkspace?.role === 'admin';
  const isEdit = mode === 'edit';

  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    workspaceService
      .listMembers(activeWorkspace.workspaceId)
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((m) => m.userId === userId) ?? null;
        if (!found) {
          setError('Member not found.');
          setMember(null);
          return;
        }
        setMember(found);
        setName(found.name ?? '');
        setEmail(found.email ?? '');
        setPhone(found.phone ?? '');
        setDepartment(found.department ?? '');
        setJobTitle(found.jobTitle ?? '');
        setRole(found.role === 'owner' ? 'member' : found.role);
        setStatus(found.status ?? 'active');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load member.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId, userId]);

  const previewName = name.trim() || 'User';
  const previewEmail = email.trim() || '—';
  const previewDept = department || '—';
  const previewRole = member?.role === 'owner' ? 'owner' : role;

  const permissions = useMemo(
    () =>
      PERMS.map((p) => ({
        ...p,
        allowed:
          previewRole === 'owner' || previewRole === 'admin' ? p.admin || p.key === 'billing' : p.member,
      })),
    [previewRole],
  );

  const canEditFields = Boolean(canManage && member && member.role !== 'owner');
  const canEditRole = Boolean(
    canEditFields && isOwner && member && member.userId !== me?.id,
  );

  const save = async () => {
    if (!activeWorkspace?.workspaceId || !member || !canEditFields) return;
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const patch: {
        name: string;
        phone: string;
        jobTitle: string;
        department: string;
        role?: 'admin' | 'member';
      } = {
        name: name.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
      };
      if (canEditRole && role !== member.role) {
        patch.role = role;
      }
      const updated = await workspaceService.updateMember(
        activeWorkspace.workspaceId,
        member.userId,
        patch,
      );
      setMember({ ...member, ...updated });
      setName(updated.name ?? name);
      setPhone(updated.phone ?? phone);
      setJobTitle(updated.jobTitle ?? jobTitle);
      setDepartment(updated.department ?? department);
      if (updated.role === 'admin' || updated.role === 'member') setRole(updated.role);
      setMessage('Member updated.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save member.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={CARD}>
        <p className="text-[12px] text-[#6F7B8C]">Loading member…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className={CARD}>
        <p className="text-[12px] text-[#B91C1C]">{error || 'Member not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 h-9 rounded-[14px] border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#475569]"
        >
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className="rounded-[14px] border border-[#C7E7D4] bg-[#ECFDF3] px-3.5 py-2 text-[12px] font-medium text-[#027A48]"
          role="status"
        >
          {message}
        </div>
      ) : null}
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
          'grid items-start gap-4',
          isEdit ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-1 max-w-[720px]',
          busy && 'pointer-events-none opacity-60',
        )}
        aria-busy={busy}
      >
        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold text-[#151D2B]">User Information</h2>
              <p className="mt-0.5 text-[11px] text-[#6F7B8C]">
                {isEdit ? 'Update this member’s details and role.' : 'Member profile details.'}
              </p>
            </div>
            {!isEdit && canEditFields ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[14px] bg-[#016BE6] px-3 text-[12px] font-semibold text-white hover:bg-[#0056EF]"
              >
                <Pencil size={13} strokeWidth={2.5} />
                Edit
              </button>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="mt-4 space-y-3.5">
              <div className="flex items-center gap-3 rounded-[14px] border border-[#EEF1F5] bg-[#F8FAFC] p-3">
                <UserAvatar
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  avatarColor={member.avatarColor}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#151D2B]">{member.name}</p>
                  <p className="truncate text-[11px] text-[#6F7B8C]">{member.email}</p>
                </div>
                <span className="ml-auto inline-flex rounded-md bg-[#EEF0FF] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#5B6CFF]">
                  {member.role}
                </span>
              </div>
              <ReadField label="Full Name" value={member.name} />
              <ReadField label="Work Email" value={member.email} />
              <ReadField label="Phone Number" value={member.phone ?? ''} />
              <ReadField label="Department" value={member.department ?? ''} />
              <ReadField label="Job Title" value={member.jobTitle ?? ''} />
              <ReadField label="Role" value={member.role} />
              <ReadField label="Status" value={status} />
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3.5">
                <div>
                  <label htmlFor="mu-name" className={LABEL}>
                    Full Name <span className="text-[#E1212D]">*</span>
                  </label>
                  <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                    <User size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      id="mu-name"
                      value={name}
                      disabled={!canEditFields || busy}
                      onChange={(e) => setName(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="mu-email" className={LABEL}>
                    Work Email
                  </label>
                  <div className={cn(INPUT, 'flex items-center gap-2 bg-[#F8FAFC] px-3')}>
                    <Mail size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      id="mu-email"
                      type="email"
                      value={email}
                      disabled
                      title="Email cannot be changed here"
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#8A94A6]">Email is not editable.</p>
                </div>
                <div>
                  <label htmlFor="mu-phone" className={LABEL}>
                    Phone Number
                  </label>
                  <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                    <Phone size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      id="mu-phone"
                      type="tel"
                      value={phone}
                      disabled={!canEditFields || busy}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="mu-dept" className={LABEL}>
                    Department
                  </label>
                  <div className="relative">
                    <select
                      id="mu-dept"
                      value={department}
                      disabled={!canEditFields || busy}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={cn(
                        INPUT,
                        'appearance-none px-3 pr-8 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]',
                      )}
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
                  <label htmlFor="mu-job" className={LABEL}>
                    Job Title
                  </label>
                  <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                    <Briefcase size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      id="mu-job"
                      value={jobTitle}
                      disabled={!canEditFields || busy}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Enter job title"
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <h2 className="mt-6 text-[13px] font-semibold text-[#151D2B]">Role & Access</h2>
              <div className="mt-4 space-y-3.5">
                <div>
                  <label htmlFor="mu-role" className={LABEL}>
                    Role <span className="text-[#E1212D]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="mu-role"
                      value={role}
                      disabled={!canEditRole || busy || member.role === 'owner'}
                      onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
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
              </div>
            </>
          )}
        </section>

        {isEdit ? (
          <aside className="flex flex-col gap-4">
            <section className={CARD}>
              <h2 className="text-[13px] font-semibold text-[#151D2B]">User Preview</h2>
              <div className="mt-4 flex flex-col items-center text-center">
                {member.avatarUrl ? (
                  <UserAvatar
                    name={previewName}
                    avatarUrl={member.avatarUrl}
                    avatarColor={member.avatarColor}
                    size="lg"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full bg-[#EEF0FF] text-[16px] font-bold text-[#5B6CFF]">
                    {initialsFromName(previewName)}
                  </div>
                )}
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
                  Permissions update when you change the member role.
                </p>
              </div>
            </section>
          </aside>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pb-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="h-9 min-w-[100px] rounded-[14px] border border-[#E1E7EE] bg-white px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          {isEdit ? 'Cancel' : 'Back'}
        </button>
        {isEdit && canEditFields ? (
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
            className="inline-flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-[14px] bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
