import { cn } from '../../../lib/cn';

export function KpiCard({
  label,
  value,
  meta,
  hrefLabel,
  onClick,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  meta: string;
  hrefLabel: string;
  onClick?: () => void;
  tone?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const tones = {
    blue: 'bg-[#e2f0ff] text-brand',
    green: 'bg-[#daf7e3] text-success',
    purple: 'bg-[#edebff] text-purple-600',
    orange: 'bg-[#ffecd8] text-orange-600',
  };

  return (
    <div className="flex min-h-[137px] flex-col rounded-[10px] border border-border-app bg-white p-3.5 shadow-[0_1px_3px_rgba(83,100,128,0.06)]">
      <div className="flex items-center gap-2">
        <span className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-bold', tones[tone])}>
          ●
        </span>
        <span className="text-[11px] font-semibold text-text">{label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-text">{value}</p>
          <p className="mt-0.5 text-[9px] text-text-muted">{meta}</p>
        </div>
        <div className="h-8 w-20 rounded bg-gradient-to-r from-brand-muted to-transparent opacity-80" />
      </div>
      <button
        type="button"
        onClick={onClick}
        className="mt-auto pt-2 text-left text-[9px] font-semibold text-brand-link"
      >
        {hrefLabel} →
      </button>
    </div>
  );
}

export function PageCard({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-border-app bg-white p-5 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold text-text">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusPill({
  children,
  tone = 'success',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const map = {
    success: 'bg-[#daf7e3] text-success',
    warning: 'bg-[#ffecd8] text-orange-700',
    danger: 'bg-red-100 text-danger',
    neutral: 'bg-slate-100 text-text-muted',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', map[tone])}>
      {children}
    </span>
  );
}
