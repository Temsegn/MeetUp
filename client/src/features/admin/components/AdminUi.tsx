import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export const SAAS_INPUT =
  'h-9 rounded-[14px] border border-[#E1E7EE] bg-white text-[12px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';

export const SAAS_LABEL = 'mb-1.5 block text-[12px] font-semibold text-[#334155]';

export const SAAS_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] bg-[#016BE6] px-3.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#0059C4] disabled:opacity-60';

export const SAAS_SECONDARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3.5 text-[12px] font-semibold text-[#1968F2] hover:bg-[#F8FAFC] disabled:opacity-60';

export const SAAS_GHOST =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60';

export const SAAS_CARD =
  'rounded-[14px] border border-[#E2E7ED] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

export function useDebouncedValue<T>(value: T, ms = 280): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function AdminPageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{ label: string; to?: string }>;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#94A3B8]">
            {breadcrumb.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 ? <span>/</span> : null}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-[#016BE6]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#64748B]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[22px] font-bold tracking-tight text-[#151D2B] sm:text-[24px]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#6F7B8C]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string | number;
  meta?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn(SAAS_CARD, 'p-4')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-[#E8F1FE] text-[#016BE6]">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#151D2B]">{value}</p>
      {meta ? <p className="mt-1 text-[11px] text-[#94A3B8]">{meta}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[\s-]+/g, '_');
  const tone =
    s === 'active' || s === 'paid' || s === 'healthy' || s === 'verified'
      ? 'bg-[#ECFDF3] text-[#027A48]'
      : s === 'suspended' || s === 'past_due' || s === 'overdue' || s === 'degraded' || s === 'pending'
        ? 'bg-[#FFF7ED] text-[#C2410C]'
        : s === 'banned' || s === 'cancelled' || s === 'void' || s === 'down' || s === 'inactive'
          ? 'bg-[#FEF2F2] text-[#B91C1C]'
          : 'bg-[#F1F5F9] text-[#475569]';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold capitalize', tone)}>
      {label}
    </span>
  );
}

export function RoleChip({ role }: { role: string }) {
  const r = role.toLowerCase().replace(/[\s-]+/g, '_');
  const tone =
    r === 'super_admin' || r === 'owner'
      ? 'bg-[#EEF2FF] text-[#4338CA]'
      : r === 'admin'
        ? 'bg-[#E8F1FE] text-[#016BE6]'
        : 'bg-[#F8FAFC] text-[#475569]';
  const label = role.replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold capitalize', tone)}>
      {label === 'none' ? 'Member' : label}
    </span>
  );
}

export function AlertBanner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const cls =
    tone === 'error'
      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
      : tone === 'success'
        ? 'border-[#C7E7D4] bg-[#ECFDF3] text-[#027A48]'
        : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]';
  return (
    <div className={cn('rounded-[14px] border px-3.5 py-2 text-[12px] font-medium', cls)} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn(SAAS_INPUT, 'flex h-9 w-full items-center gap-2 px-3 sm:w-[220px]', className)}>
      <Search size={14} className="shrink-0 text-[#6F7C8C]" strokeWidth={1.9} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#6F7C8C]"
      />
    </label>
  );
}

export function SelectField({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(SAAS_INPUT, 'h-9 w-full appearance-none px-3 pr-8 text-[12px] text-[#111A2D]')}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7C8C]"
      />
    </div>
  );
}

export function FilterChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string; dot?: string }>;
}) {
  return (
    <div className="flex w-fit max-w-full flex-wrap gap-1.5">
      {options.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[12px] font-semibold transition-colors',
            value === tab.key
              ? 'border-[#016BE6] bg-[#016BE6] text-white shadow-sm'
              : 'border-[#E1E7EE] bg-white text-[#6F7B8C] hover:border-[#CBD5E1] hover:text-[#334155]',
          )}
        >
          {tab.dot ? <span className={cn('size-1.5 shrink-0 rounded-full', tab.dot)} /> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function PersonCell({
  name,
  email,
  avatarUrl,
  avatarColor,
  to,
}: {
  name: string;
  email?: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  to?: string;
}) {
  const title = to ? (
    <Link to={to} className="truncate text-[12px] font-semibold text-[#151D2B] hover:text-[#016BE6]">
      {name}
    </Link>
  ) : (
    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{name}</p>
  );
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar name={name} avatarUrl={avatarUrl} avatarColor={avatarColor} size="md" />
      <div className="min-w-0">
        {title}
        {email ? <p className="truncate text-[11px] text-[#6F7B8C]">{email}</p> : null}
      </div>
    </div>
  );
}

export function AdminTableShell({
  title,
  subtitle,
  toolbar,
  footer,
  children,
}: {
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={SAAS_CARD}>
      {title || toolbar ? (
        <div className="flex flex-col gap-3 border-b border-[#E2E7ED] px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
          {title ? (
            <div className="min-w-0 shrink-0">
              <h2 className="text-[16px] font-bold leading-tight tracking-tight text-[#111A2D]">{title}</h2>
              {subtitle ? <p className="mt-1 text-[12px] leading-snug text-[#6F7C8C]">{subtitle}</p> : null}
            </div>
          ) : <div />}
          {toolbar ? (
            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:shrink-0 sm:pt-1">{toolbar}</div>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </section>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>;
}

export function AdminTHead({ columns }: { columns: Array<{ label: string; align?: 'left' | 'center' | 'right' }> }) {
  return (
    <thead>
      <tr className="border-b border-[#E2E7ED]/70 text-[11px] font-semibold text-[#6F7B8C]">
        {columns.map((col) => (
          <th
            key={col.label}
            className={cn(
              'px-3 py-4 font-semibold sm:px-4',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            )}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function EmptyState({
  title,
  description,
  action,
  colSpan,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="text-[13px] font-semibold text-[#151D2B]">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-sm text-[12px] text-[#8A94A6]">{description}</p> : null}
        {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
      </td>
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-[#E8ECF1]/80 px-4 py-3">
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-[#E8ECF1]" />
          {Array.from({ length: cols - 1 }).map((__, j) => (
            <span
              key={j}
              className="h-3 flex-1 animate-pulse rounded-md bg-[#E8ECF1]"
              style={{ maxWidth: j === 0 ? 180 : 96 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PaginationBar({
  from,
  to,
  total,
  page,
  totalPages,
  pageSize,
  onPage,
  onPageSize,
  noun,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  noun: string;
}) {
  const max = Math.min(3, totalPages);
  const start = Math.min(Math.max(1, page - 1), Math.max(1, totalPages - max + 1));
  const pageNumbers = Array.from({ length: max }, (_, i) => start + i);

  return (
    <div className="grid grid-cols-1 items-center gap-3 border-t border-[#E2E7ED] px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
      <p className="text-[11px] text-[#6F7C8C] sm:justify-self-start">
        Showing {from} to {to} of {total} {noun}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="inline-flex size-7 items-center justify-center rounded-full text-[#6F7C8C] hover:bg-[#F8FAFC] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold',
              n === page ? 'bg-[#016BE6] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]',
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          className="inline-flex size-7 items-center justify-center rounded-full text-[#6F7C8C] hover:bg-[#F8FAFC] disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="relative sm:justify-self-end">
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className={cn(SAAS_INPUT, 'h-8 w-[100px] appearance-none px-2.5 pr-7 text-[11px]')}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[#6F7C8C]" />
      </div>
    </div>
  );
}

export function RowActions({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative inline-flex justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="inline-flex size-8 items-center justify-center rounded-full border border-[#E8ECF1] bg-white text-[#64748B] shadow-sm hover:border-[#D0D7E2] hover:bg-[#F8FAFC] hover:text-[#334155]"
        aria-label={label}
      >
        <MoreHorizontal size={16} strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-11 right-0 z-30 w-44 overflow-hidden rounded-[14px] border border-[#E1E7EE] bg-white py-1 text-left shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)]"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-[#F8FAFC]',
        danger ? 'text-[#B91C1C]' : 'text-[#151D2B]',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={SAAS_LABEL}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-[#94A3B8]">{hint}</p> : null}
    </label>
  );
}

export const SAAS_TEXT_INPUT =
  'h-11 w-full rounded-xl border border-[#E8ECF1] bg-white px-3 text-[13px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';
