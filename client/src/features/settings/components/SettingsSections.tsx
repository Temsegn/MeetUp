import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronDown, Link2, Settings as SettingsIcon } from 'lucide-react';
import type { User, UserSettings } from '../../../services/auth/auth.service';
import {
  SettingsCard,
  SettingsField,
  SettingsSectionHeader,
  SettingsToggle,
} from './SettingsUi';

type Common = {
  settings: UserSettings;
  busy?: boolean;
};

export function ProfileSection({
  user,
  name,
  email,
  phone,
  jobTitle,
  department,
  role,
  avatarPreview,
  busy,
  message,
  error,
  fileRef,
  onName,
  onEmail,
  onPhone,
  onJobTitle,
  onDepartment,
  onPickPhoto,
  onPhotoSelected,
  onSave,
}: {
  user: User | null;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  role: string;
  avatarPreview: string | null;
  busy: boolean;
  message: string;
  error: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPhone: (v: string) => void;
  onJobTitle: (v: string) => void;
  onDepartment: (v: string) => void;
  onPickPhoto: () => void;
  onPhotoSelected: (file: File | null) => void;
  onSave: () => void;
}) {
  const initial = (name || user?.name || '?').charAt(0).toUpperCase();
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';

  const DEPARTMENTS = [
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

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Profile"
        description="Update your personal information and profile picture."
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="mx-auto flex w-full max-w-[9rem] shrink-0 flex-col items-center gap-3 sm:mx-0 sm:items-start">
          <div className="relative">
            <div
              className="flex size-28 items-center justify-center overflow-hidden rounded-full bg-[#D4E3FF] text-3xl font-bold text-[#016BE6]"
              style={
                user?.avatarColor && !avatarPreview
                  ? { background: user.avatarColor, color: '#fff' }
                  : undefined
              }
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="size-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              onClick={onPickPhoto}
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#016BE6] text-white shadow"
              aria-label="Change profile photo"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="w-full rounded-full bg-[#016BE6] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField id="settings-name" label="Full Name" value={name} onChange={onName} />
            <SettingsField
              id="settings-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={onEmail}
              readOnly
              hint="Email can’t be changed. It’s tied to your account."
            />
            <SettingsField
              id="settings-phone"
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={onPhone}
            />
            <SettingsField
              id="settings-role"
              label="Role"
              value={roleLabel}
              onChange={() => undefined}
              readOnly
              hint="Role is set by your workspace admin."
            />
            <SettingsField
              id="settings-title"
              label="Job Title"
              value={jobTitle}
              onChange={onJobTitle}
            />
            <div>
              <label
                htmlFor="settings-dept"
                className="mb-1.5 block text-[13px] font-semibold text-[#151D2B]"
              >
                Department
              </label>
              <div className="relative">
                <select
                  id="settings-dept"
                  value={department}
                  onChange={(e) => onDepartment(e.target.value)}
                  className="h-[42px] w-full appearance-none rounded-[10.13px] border border-[#D0D7E2] bg-white px-3.5 pr-9 text-[13px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  {department && !DEPARTMENTS.includes(department) ? (
                    <option value={department}>{department}</option>
                  ) : null}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#6F7B8C]"
                />
              </div>
            </div>
          </div>
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {message ? <p className="text-[13px] text-[#00A45C]">{message}</p> : null}
        </div>
      </div>
    </SettingsCard>
  );
}

export function AccountSection({ settings }: Common) {
  const rows = [
    { label: 'Account Type', value: settings.account.plan, action: 'Change Plan' },
    {
      label: 'Meeting Capacity',
      value: `${settings.account.meetingCapacity} participants`,
      action: 'Manage',
    },
    { label: 'Your Role', value: settings.account.role, action: 'View Permissions' },
  ];

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Account"
        description="Manage your account settings and preferences."
      />
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F4F8] pb-4 last:border-0 last:pb-0"
          >
            <span className="text-[13px] font-semibold text-[#151D2B]">{row.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#6F7B8C]">{row.value}</span>
              <button type="button" className="text-[13px] font-semibold text-[#016BE6] hover:underline">
                {row.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

export function NotificationsSection({
  settings,
  busy,
  onToggle,
}: Common & {
  onToggle: (key: keyof UserSettings['notifications'], value: boolean) => void;
}) {
  const items: {
    key: keyof UserSettings['notifications'];
    title: string;
    desc: string;
  }[] = [
    { key: 'meetings', title: 'Meeting Reminders', desc: 'Receive reminders for upcoming meetings' },
    { key: 'email', title: 'Email Notifications', desc: 'Receive updates via email' },
    { key: 'push', title: 'Push Notifications', desc: 'Receive push notifications on desktop' },
    { key: 'messages', title: 'New Message Alerts', desc: 'Get notified for new messages' },
  ];

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Notifications"
        description="Choose how you want to receive notifications."
      />
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 border-b border-[#F1F4F8] pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-[13px] font-semibold text-[#151D2B]">{item.title}</p>
              <p className="text-[12px] text-[#6F7B8C]">{item.desc}</p>
            </div>
            <SettingsToggle
              label={item.title}
              enabled={settings.notifications[item.key]}
              disabled={busy}
              onChange={(v) => onToggle(item.key, v)}
            />
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

export function AudioVideoSection({
  settings,
  busy,
  onChange,
}: Common & {
  onChange: (patch: Partial<UserSettings['audioVideo']>) => void;
}) {
  const rows: { key: keyof UserSettings['audioVideo']; label: string }[] = [
    { key: 'microphone', label: 'Microphone' },
    { key: 'camera', label: 'Camera' },
    { key: 'speaker', label: 'Speaker' },
  ];

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Audio & Video"
        description="Configure your audio and video settings."
      />
      <div className="space-y-4">
        {rows.map((row) => (
          <label key={row.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[13px] font-medium text-[#151D2B]">{row.label}</span>
            <span className="relative inline-flex min-w-[14rem] items-center">
              <select
                disabled={busy}
                value={settings.audioVideo[row.key]}
                onChange={(e) => onChange({ [row.key]: e.target.value })}
                className="w-full appearance-none rounded-lg border border-[#D0D7E2] bg-white py-2 pr-8 pl-3 text-[12px] font-semibold text-[#334155] outline-none focus:border-[#016BE6]"
              >
                <option>{settings.audioVideo[row.key]}</option>
                <option>Default — System Device</option>
                <option>External USB Device</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#94A3B8]" />
            </span>
          </label>
        ))}
      </div>
      <button type="button" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#016BE6] hover:underline">
        <Link2 size={14} />
        Test Audio & Video
      </button>
    </SettingsCard>
  );
}

export function RecordingSection({
  settings,
  busy,
  onChange,
}: Common & {
  onChange: (patch: Partial<UserSettings['recording']>) => void;
}) {
  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Recording"
        description="Manage recording preferences and storage."
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-[#151D2B]">Auto Record Meetings</p>
            <p className="text-[12px] text-[#6F7B8C]">Automatically record meetings</p>
          </div>
          <SettingsToggle
            label="Auto Record Meetings"
            enabled={settings.recording.autoRecord}
            disabled={busy}
            onChange={(v) => onChange({ autoRecord: v })}
          />
        </div>

        <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] font-semibold text-[#151D2B]">Recording Quality</span>
          <span className="relative inline-flex min-w-[10rem] items-center">
            <select
              disabled={busy}
              value={settings.recording.quality}
              onChange={(e) => onChange({ quality: e.target.value })}
              className="w-full appearance-none rounded-lg border border-[#D0D7E2] bg-white py-2 pr-8 pl-3 text-[12px] font-semibold text-[#334155] outline-none focus:border-[#016BE6]"
            >
              <option>High (1080p)</option>
              <option>Medium (720p)</option>
              <option>Standard (480p)</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#94A3B8]" />
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-[13px] font-semibold text-[#151D2B]">Cloud Storage</span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAF1]">
            <div className="h-full w-1/4 rounded-full bg-[#016BE6]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6F7B8C]">12.4 GB used of 50 GB</span>
            <button type="button" className="text-[13px] font-semibold text-[#016BE6] hover:underline">
              Manage Storage
            </button>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

export function SecuritySection({
  settings,
  busy,
  onToggle,
}: Common & {
  onToggle: (key: keyof UserSettings['security'], value: boolean) => void;
}) {
  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Security"
        description="Manage your security and privacy settings."
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#F1F4F8] pb-4">
          <div>
            <p className="text-[13px] font-semibold text-[#151D2B]">Two-Factor Authentication</p>
            <p className="text-[12px] text-[#6F7B8C]">Add an extra layer of security to your account</p>
          </div>
          <Link
            to="/settings/security"
            className="rounded-lg border border-[#016BE6] px-4 py-1.5 text-[13px] font-semibold text-[#016BE6] hover:bg-[#E8F1FF]"
          >
            Enable
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-[#F1F4F8] pb-4">
          <div>
            <p className="text-[13px] font-semibold text-[#151D2B]">Meeting Password</p>
            <p className="text-[12px] text-[#6F7B8C]">Require password for instant meetings</p>
          </div>
          <SettingsToggle
            label="Meeting Password"
            enabled={settings.security.meetingPassword}
            disabled={busy}
            onChange={(v) => onToggle('meetingPassword', v)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-[#151D2B]">Waiting Room</p>
            <p className="text-[12px] text-[#6F7B8C]">Enable waiting room for all meetings</p>
          </div>
          <SettingsToggle
            label="Waiting Room"
            enabled={settings.security.waitingRoom}
            disabled={busy}
            onChange={(v) => onToggle('waitingRoom', v)}
          />
        </div>
      </div>
    </SettingsCard>
  );
}

export function IntegrationsSection({
  settings,
  busy,
  onToggle,
}: Common & {
  onToggle: (key: keyof UserSettings['integrations'], value: boolean) => void;
}) {
  const items: {
    key: keyof UserSettings['integrations'];
    name: string;
    color: string;
  }[] = [
    { key: 'googleCalendar', name: 'Google Calendar', color: 'bg-[#EA4335]' },
    { key: 'slack', name: 'Slack', color: 'bg-[#4A154B]' },
    { key: 'outlook', name: 'Microsoft Outlook', color: 'bg-[#0078D4]' },
  ];

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Integrations"
        description="Connect with your favorite tools."
        action={<SettingsIcon size={18} className="text-[#94A3B8]" />}
      />
      <div className="space-y-4">
        {items.map((item) => {
          const connected = settings.integrations[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 border-b border-[#F1F4F8] pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg text-xs font-bold text-white ${item.color}`}
                >
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#151D2B]">{item.name}</p>
                  <p className={`text-[12px] ${connected ? 'text-[#00A45C]' : 'text-[#6F7B8C]'}`}>
                    {connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggle(item.key, !connected)}
                className="text-[13px] font-semibold text-[#016BE6] hover:underline disabled:opacity-50"
              >
                {connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}

export function SimpleSelectSection({
  title,
  description,
  label,
  value,
  options,
  busy,
  onChange,
}: {
  title: string;
  description: string;
  label: string;
  value: string;
  options: string[];
  busy?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <SettingsCard>
      <SettingsSectionHeader title={title} description={description} />
      <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] font-semibold text-[#151D2B]">{label}</span>
        <span className="relative inline-flex min-w-[12rem] items-center">
          <select
            disabled={busy}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#D0D7E2] bg-white py-2 pr-8 pl-3 text-[12px] font-semibold text-[#334155] outline-none focus:border-[#016BE6]"
          >
            {options.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#94A3B8]" />
        </span>
      </label>
    </SettingsCard>
  );
}

export function PlaceholderSettingsCard({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <SettingsCard className={className}>
      <SettingsSectionHeader title={title} description={description} />
      <p className="text-[13px] text-[#6F7B8C]">
        Preferences for this section will sync to your account once available.
      </p>
    </SettingsCard>
  );
}
