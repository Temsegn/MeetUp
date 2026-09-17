import { cn } from '../../../lib/cn';

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#151D2B] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-[#6F7B8C]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#151D2B]">{value}</p>
      {meta ? <p className="mt-1 text-[11px] text-[#94A3B8]">{meta}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === 'active' || s === 'paid' || s === 'healthy'
      ? 'bg-emerald-50 text-emerald-700'
      : s === 'suspended' || s === 'past_due' || s === 'overdue' || s === 'degraded'
        ? 'bg-amber-50 text-amber-700'
        : s === 'banned' || s === 'cancelled' || s === 'void' || s === 'down'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-slate-100 text-slate-600';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', tone)}>
      {status}
    </span>
  );
}

export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
