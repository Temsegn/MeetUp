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

export function Bone({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block animate-pulse rounded-md bg-[#E8ECF1]', className)} />;
}

export function TableRowSkeleton({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-[#E2E7ED]/70" aria-hidden>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-3 py-3 sm:px-4">
              {j === 0 ? (
                <span className="flex items-center gap-2.5">
                  <Bone className="size-8 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <Bone className="h-3 w-28" />
                    <Bone className="h-2.5 w-20" />
                  </span>
                </span>
              ) : (
                <Bone className="h-3 w-16" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(SAAS_CARD, 'p-4')}>
          <Bone className="h-3 w-20" />
          <Bone className="mt-3 h-7 w-16" />
          <Bone className="mt-2 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="pb-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-5">
        <Bone className="h-7 w-40" />
        <Bone className="mt-2 h-3.5 w-72 max-w-full" />
      </div>
      <KpiRowSkeleton count={5} />
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className={cn(SAAS_CARD, 'p-4')}>
          <Bone className="mb-4 h-4 w-36" />
          <Bone className="h-[180px] w-full rounded-xl" />
        </div>
        <div className={cn(SAAS_CARD, 'space-y-3 p-4')}>
          <Bone className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="size-8 shrink-0 rounded-full" />
              <Bone className="h-3 min-w-0 flex-1" />
              <Bone className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>
      <div className={cn(SAAS_CARD, 'mt-5 overflow-hidden')}>
        <div className="border-b border-[#E2E7ED] px-4 py-3">
          <Bone className="h-4 w-36" />
        </div>
        <TableSkeleton cols={5} rows={5} />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading details">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <Bone className="h-3 w-40" />
          <Bone className="mt-2 h-7 w-48" />
          <Bone className="mt-2 h-3 w-56" />
        </div>
        <Bone className="h-9 w-24 rounded-[14px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(SAAS_CARD, 'p-5')}>
          <div className="flex items-center gap-3">
            <Bone className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-40" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className={cn(SAAS_CARD, 'overflow-hidden')}>
          <div className="border-b border-[#E2E7ED] px-4 py-3">
            <Bone className="h-4 w-32" />
          </div>
          <TableSkeleton cols={3} rows={5} />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading form">
      <Bone className="h-7 w-40" />
      <Bone className="mt-2 h-3.5 w-64 max-w-full" />
      <div className={cn(SAAS_CARD, 'mt-5 space-y-4 p-5')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bone className="h-3 w-24" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Bone className="h-9 w-28 rounded-[14px]" />
      </div>
    </div>
  );
}

export function InvoiceDocSkeleton() {
  return (
    <div className={cn(SAAS_CARD, 'mx-auto max-w-3xl p-6')} aria-busy="true" aria-label="Loading invoice">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Bone className="h-5 w-32" />
          <Bone className="h-3 w-40" />
        </div>
        <Bone className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Bone className="h-16 w-full rounded-xl" />
        <Bone className="h-16 w-full rounded-xl" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
      <Bone className="ml-auto mt-6 h-8 w-32" />
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#F5F7FA]" aria-busy="true" aria-label="Loading admin">
      <div className="hidden h-full w-[240px] shrink-0 bg-[#016BE6] p-4 lg:block">
        <Bone className="h-5 w-24 bg-white/30" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bone key={i} className="h-9 w-full rounded-xl bg-white/20" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </div>
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
