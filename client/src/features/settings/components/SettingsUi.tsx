import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export function SettingsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[10.13px] border border-[#E1E7EE] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SettingsSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight text-[#151D2B]">{title}</h2>
        <p className="mt-0.5 text-[12px] text-[#6F7B8C]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SettingsToggle({
  enabled,
  onChange,
  disabled,
  label,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        enabled ? 'bg-[#016BE6]' : 'bg-[#D1D5DB]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow-md transition-transform',
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function SettingsField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[#151D2B]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-[10.13px] border border-[#D0D7E2] px-3.5 py-2.5 text-[13px] text-[#151D2B] outline-none transition',
          readOnly
            ? 'cursor-not-allowed bg-[#F4F6F9] text-[#64748B]'
            : 'bg-white focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15',
        )}
      />
      {hint ? <p className="mt-1 text-[11px] text-[#6F7B8C]">{hint}</p> : null}
    </div>
  );
}
