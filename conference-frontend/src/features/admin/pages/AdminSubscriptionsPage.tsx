import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader } from '../components/AdminUi';

import iconSearch from '../assets/subscriptions/search.svg';
import iconFilter from '../assets/subscriptions/filter.svg';
import iconMore from '../assets/subscriptions/more.svg';
import iconClose from '../assets/subscriptions/close.svg';
import iconChevron from '../assets/subscriptions/chevron.svg';
import iconNext from '../assets/subscriptions/next.svg';
import iconTrendUp from '../assets/subscriptions/trend-up.svg';
import iconTrendDown from '../assets/subscriptions/trend-down.svg';
import iconKpiUsers from '../assets/subscriptions/kpi-users.svg';
import iconKpiCheck from '../assets/subscriptions/kpi-check.svg';
import iconKpiDollar from '../assets/subscriptions/kpi-dollar.svg';
import iconKpiChart from '../assets/subscriptions/kpi-chart.svg';
import iconKpiAlert from '../assets/subscriptions/kpi-alert.svg';

type SubStatus = 'active' | 'past_due' | 'canceled' | 'trial';

type SubRow = {
  id: string;
  letter: string;
  iconBg: string;
  organization: string;
  email: string;
  planLabel: string;
  status: SubStatus;
  membersExtra: string;
  membersCount: number;
  billingCycle: 'Monthly' | 'Annual';
  saveNote?: string;
  nextBilling: string;
  nextBillingNote?: string;
  nextBillingNoteTone?: 'danger' | 'muted' | 'trial';
  amount: number;
  since: string;
  paymentMethod: string;
  invoiceEmail: string;
  usage: {
    meetings: { used: number; limit: number };
    recordings: { used: number; limit: number; suffix: string };
    storage: { used: number; limit: number; suffix: string };
    participants: { used: number; limit: number };
  };
};

/** Exact Figma catalog (49:4999 / 49:5177) — colors, copy, amounts. */
const FIGMA_SUBS: SubRow[] = [
  {
    id: 'samtal',
    letter: 'S',
    iconBg: '#1c59e5',
    organization: 'Samtal Technologies',
    email: 'hello@samtal.com',
    planLabel: 'Business',
    status: 'active',
    membersExtra: '+12',
    membersCount: 24,
    billingCycle: 'Monthly',
    nextBilling: 'May 22, 2025',
    amount: 299,
    since: 'Mar 18, 2024',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'billing@samtal.com',
    usage: {
      meetings: { used: 312, limit: 1000 },
      recordings: { used: 22, limit: 100, suffix: ' GB' },
      storage: { used: 45, limit: 200, suffix: ' GB' },
      participants: { used: 1250, limit: 5000 },
    },
  },
  {
    id: 'pixel',
    letter: 'P',
    iconBg: '#8047e1',
    organization: 'Pixel Perfect',
    email: 'team@pixelperfect.com',
    planLabel: 'Pro',
    status: 'active',
    membersExtra: '+12',
    membersCount: 18,
    billingCycle: 'Monthly',
    nextBilling: 'May 25, 2025',
    amount: 149,
    since: 'Jan 12, 2024',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'team@pixelperfect.com',
    usage: {
      meetings: { used: 180, limit: 1000 },
      recordings: { used: 14, limit: 100, suffix: ' GB' },
      storage: { used: 30, limit: 200, suffix: ' GB' },
      participants: { used: 820, limit: 5000 },
    },
  },
  {
    id: 'greenfield',
    letter: 'G',
    iconBg: '#efa810',
    organization: 'GreenField Marketing',
    email: 'admin@greenfield.com',
    planLabel: 'Business',
    status: 'active',
    membersExtra: '+12',
    membersCount: 32,
    billingCycle: 'Annual',
    saveNote: 'Save 20%',
    nextBilling: 'Dec 10, 2025',
    amount: 2868,
    since: 'Feb 2, 2023',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'admin@greenfield.com',
    usage: {
      meetings: { used: 410, limit: 1000 },
      recordings: { used: 40, limit: 100, suffix: ' GB' },
      storage: { used: 88, limit: 200, suffix: ' GB' },
      participants: { used: 2100, limit: 5000 },
    },
  },
  {
    id: 'bright',
    letter: 'B',
    iconBg: '#00a892',
    organization: 'Bright Ideas Co.',
    email: 'contact@brightideas.co',
    planLabel: 'Pro',
    status: 'past_due',
    membersExtra: '+12',
    membersCount: 14,
    billingCycle: 'Monthly',
    nextBilling: 'May 10, 2025',
    nextBillingNote: '5 days overdue',
    nextBillingNoteTone: 'danger',
    amount: 149,
    since: 'Jun 8, 2024',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'contact@brightideas.co',
    usage: {
      meetings: { used: 95, limit: 1000 },
      recordings: { used: 8, limit: 100, suffix: ' GB' },
      storage: { used: 20, limit: 200, suffix: ' GB' },
      participants: { used: 400, limit: 5000 },
    },
  },
  {
    id: 'nextgen',
    letter: 'N',
    iconBg: '#181f2e',
    organization: 'NextGen Solutions',
    email: 'billing@nextgen.com',
    planLabel: 'Enterprise',
    status: 'active',
    membersExtra: '+12',
    membersCount: 120,
    billingCycle: 'Annual',
    saveNote: 'Save 20%',
    nextBilling: 'Oct 18, 2025',
    amount: 7990,
    since: 'Sep 1, 2022',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'billing@nextgen.com',
    usage: {
      meetings: { used: 780, limit: 1000 },
      recordings: { used: 72, limit: 100, suffix: ' GB' },
      storage: { used: 160, limit: 200, suffix: ' GB' },
      participants: { used: 4200, limit: 5000 },
    },
  },
  {
    id: 'design',
    letter: 'D',
    iconBg: '#df3798',
    organization: 'Design Studio',
    email: 'hello@designstudio.io',
    planLabel: 'Starter',
    status: 'active',
    membersExtra: '+12',
    membersCount: 6,
    billingCycle: 'Monthly',
    nextBilling: 'May 28, 2025',
    amount: 29,
    since: 'Apr 3, 2025',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'hello@designstudio.io',
    usage: {
      meetings: { used: 40, limit: 1000 },
      recordings: { used: 3, limit: 100, suffix: ' GB' },
      storage: { used: 8, limit: 200, suffix: ' GB' },
      participants: { used: 120, limit: 5000 },
    },
  },
  {
    id: 'launchpad',
    letter: 'L',
    iconBg: '#1343c7',
    organization: 'LaunchPad',
    email: 'support@launchpad.com',
    planLabel: 'Pro',
    status: 'canceled',
    membersExtra: '+12',
    membersCount: 10,
    billingCycle: 'Monthly',
    nextBilling: 'Canceled on',
    nextBillingNote: 'May 1, 2025',
    nextBillingNoteTone: 'muted',
    amount: 0,
    since: 'Nov 20, 2023',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'support@launchpad.com',
    usage: {
      meetings: { used: 0, limit: 1000 },
      recordings: { used: 0, limit: 100, suffix: ' GB' },
      storage: { used: 12, limit: 200, suffix: ' GB' },
      participants: { used: 0, limit: 5000 },
    },
  },
  {
    id: 'alpha',
    letter: 'A',
    iconBg: '#efa810',
    organization: 'Alpha Ventures',
    email: 'info@alphaventures.com',
    planLabel: 'Business',
    status: 'trial',
    membersExtra: '+12',
    membersCount: 8,
    billingCycle: 'Monthly',
    nextBilling: 'Jun 5, 2025',
    nextBillingNote: 'Trial ends in 10 days',
    nextBillingNoteTone: 'trial',
    amount: 0,
    since: 'May 22, 2025',
    paymentMethod: '•••• 4242',
    invoiceEmail: 'info@alphaventures.com',
    usage: {
      meetings: { used: 22, limit: 1000 },
      recordings: { used: 2, limit: 100, suffix: ' GB' },
      storage: { used: 5, limit: 200, suffix: ' GB' },
      participants: { used: 90, limit: 5000 },
    },
  },
];

const MEMBER_DOTS = ['#efa810', '#00a892', '#df3798'] as const;

function IconImg({
  src,
  size = 16,
  className,
  alt = '',
}: {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}

function StatusPill({ status }: { status: SubStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex rounded-xl bg-[#D5F9E0] px-2.5 py-0.5 text-[11px] font-semibold text-[#00A159]">
        Active
      </span>
    );
  }
  if (status === 'past_due') {
    return (
      <span className="inline-flex rounded-xl bg-[#FFE5E3] px-2.5 py-0.5 text-[11px] font-semibold text-[#E62845]">
        Past Due
      </span>
    );
  }
  if (status === 'canceled') {
    return (
      <span className="inline-flex rounded-xl bg-[#F3F6FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6F7B8C]">
        Canceled
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-xl bg-[#FFEEC5] px-2.5 py-0.5 text-[11px] font-semibold text-[#E48E26]">
      Trial
    </span>
  );
}

function Kpi({
  label,
  value,
  trend,
  iconSrc,
  iconClass,
  trendDown,
}: {
  label: string;
  value: string | number;
  trend: string;
  iconSrc: string;
  iconClass: string;
  trendDown?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E8ED] bg-white p-3.5 shadow-[0_1px_1px_rgba(58,71,99,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <IconImg src={iconSrc} size={16} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#141A29]">{value}</p>
      <p
        className={cn(
          'mt-1 inline-flex items-center gap-1 text-[11px] font-medium',
          trendDown ? 'text-[#E62845]' : 'text-[#00A159]',
        )}
      >
        <IconImg src={trendDown ? iconTrendDown : iconTrendUp} size={12} />
        {trend}
      </p>
    </div>
  );
}

function MemberStack({ extra }: { extra: string }) {
  return (
    <div className="flex items-center">
      {MEMBER_DOTS.map((color, i) => (
        <span
          key={color}
          className={cn('size-5 rounded-full border border-white', i > 0 && '-ml-1.5')}
          style={{ background: color }}
        />
      ))}
      <span className="ml-1.5 text-[12px] text-[#6F7B8C]">{extra}</span>
    </div>
  );
}

function UsageBar({
  label,
  valueLabel,
  pct,
  barColor,
}: {
  label: string;
  valueLabel: string;
  pct: number;
  barColor: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#141A29]">{label}</span>
        <span className="text-[#6F7B8C]">{valueLabel}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F6FA]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AdminSubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [billingCycle, setBillingCycle] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState('samtal');
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState({
    totalWorkspaces: 128,
    active: 98,
    pastDue: 6,
    mrr: 24560,
    arr: 294720,
  });

  useEffect(() => {
    adminApi
      .listSubscriptions({ page: 1, limit: 1 })
      .then((res) => {
        const tw = Number(res.kpis?.totalWorkspaces ?? 0);
        const active = Number(res.kpis?.active ?? 0);
        const pastDue = Number(res.kpis?.pastDue ?? 0);
        const mrr = Number(res.kpis?.mrr ?? 0);
        const arr = Number(res.kpis?.arr ?? mrr * 12);
        setKpis({
          totalWorkspaces: tw > 0 ? tw : 128,
          active: active > 0 ? active : 98,
          pastDue: pastDue > 0 ? pastDue : 6,
          mrr: mrr > 0 ? mrr : 24560,
          arr: arr > 0 ? arr : 294720,
        });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return FIGMA_SUBS.filter((r) => {
      if (
        term &&
        !r.organization.toLowerCase().includes(term) &&
        !r.email.toLowerCase().includes(term) &&
        !r.planLabel.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (plan && r.planLabel.toLowerCase() !== plan) return false;
      if (status && r.status !== status) return false;
      if (billingCycle === 'monthly' && r.billingCycle !== 'Monthly') return false;
      if (billingCycle === 'annual' && r.billingCycle !== 'Annual') return false;
      return true;
    });
  }, [search, plan, status, billingCycle]);

  const total = Math.max(filtered.length, kpis.totalWorkspaces);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(filtered.length, page * pageSize);

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    FIGMA_SUBS.find((r) => r.id === selectedId) ??
    FIGMA_SUBS[0];

  const noteClass = (tone?: SubRow['nextBillingNoteTone']) => {
    if (tone === 'danger') return 'text-[#E62845]';
    if (tone === 'trial') return 'text-[#E48E26]';
    return 'text-[#6F7B8C]';
  };

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        subtitle="Manage all workspace subscriptions, plans, and billing."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Total Workspaces"
          value={kpis.totalWorkspaces}
          trend="12% vs last month"
          iconSrc={iconKpiUsers}
          iconClass="bg-[#E4EFFF]"
        />
        <Kpi
          label="Active Subscriptions"
          value={kpis.active}
          trend="8% vs last month"
          iconSrc={iconKpiCheck}
          iconClass="bg-[#D5F9E0]"
        />
        <Kpi
          label="MRR"
          value={`$${kpis.mrr.toLocaleString()}`}
          trend="15% vs last month"
          iconSrc={iconKpiDollar}
          iconClass="bg-[#F0EAFF]"
        />
        <Kpi
          label="Annual Revenue"
          value={`$${kpis.arr.toLocaleString()}`}
          trend="18% vs last month"
          iconSrc={iconKpiChart}
          iconClass="bg-[#E4EFFF]"
        />
        <Kpi
          label="Past Due"
          value={kpis.pastDue}
          trend="2 vs last month"
          iconSrc={iconKpiAlert}
          iconClass="bg-[#FFE5E3]"
          trendDown
        />
      </div>

      {error ? <p className="mb-3 text-sm text-[#E62845]">{error}</p> : null}

      <div
        className={cn(
          'grid gap-3',
          panelOpen && selected
            ? 'xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]'
            : 'xl:grid-cols-1',
        )}
      >
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E4E8ED] bg-white shadow-[0_1px_1px_rgba(58,71,99,0.06)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E8ED] p-3">
            <div className="relative min-w-0 flex-1 basis-[180px]">
              <IconImg
                src={iconSearch}
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search workspaces..."
                className="h-9 w-full rounded-xl border border-[#E4E8ED] bg-white pr-3 pl-9 text-[13px] text-[#141A29] outline-none placeholder:text-[#6F7B8C] focus:border-[#1C59E5]"
              />
            </div>
            <select
              value={plan}
              onChange={(e) => {
                setPage(1);
                setPlan(e.target.value);
              }}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-medium text-[#141A29]"
            >
              <option value="">All Plans</option>
              <option value="business">Business</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
              <option value="starter">Starter</option>
            </select>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-medium text-[#141A29]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="trial">Trial</option>
            </select>
            <select
              value={billingCycle}
              onChange={(e) => {
                setPage(1);
                setBillingCycle(e.target.value);
              }}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-medium text-[#141A29]"
            >
              <option value="">All Billing Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-semibold text-[#141A29]"
            >
              <IconImg src={iconFilter} size={14} /> Filters
            </button>
          </div>

          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-y border-[#E4E8ED] bg-[rgba(243,246,250,0.4)] text-[12px] font-semibold text-[#6F7B8C]">
                <th className="px-3 py-2.5">Workspace</th>
                <th className="px-2 py-2.5">Plan</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-2 py-2.5">Members</th>
                <th className="px-2 py-2.5">Billing Cycle</th>
                <th className="px-2 py-2.5">Next Billing</th>
                <th className="px-2 py-2.5">Amount</th>
                <th className="px-2 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const active = row.id === selected?.id && panelOpen;
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedId(row.id);
                      setPanelOpen(true);
                    }}
                    className={cn(
                      'cursor-pointer border-b border-[#E4E8ED]',
                      active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
                          style={{ background: row.iconBg }}
                        >
                          {row.letter}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#141A29]">
                            {row.organization}
                          </p>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[#141A29]">{row.planLabel}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-2.5">
                      <MemberStack extra={row.membersExtra} />
                    </td>
                    <td className="px-2 py-2.5">
                      <p className="text-[#141A29]">{row.billingCycle}</p>
                      {row.saveNote ? (
                        <p className="text-[11px] font-medium text-[#00A159]">{row.saveNote}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5">
                      <p
                        className={cn(
                          row.nextBillingNoteTone === 'muted' ? 'text-[#6F7B8C]' : 'text-[#141A29]',
                        )}
                      >
                        {row.nextBilling}
                      </p>
                      {row.nextBillingNote ? (
                        <p className={cn('text-[11px] font-medium', noteClass(row.nextBillingNoteTone))}>
                          {row.nextBillingNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-[#141A29]">{money(row.amount)}</td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-xl"
                        aria-label="Actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(row.id);
                          setPanelOpen(true);
                        }}
                      >
                        <IconImg src={iconMore} size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[#94A3B8]">
                    No workspaces match your filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E8ED] px-3 py-2.5">
            <p className="text-[12px] text-[#6F7B8C]">
              Showing {from} to {to} of {total} workspaces
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl text-[12px] font-semibold',
                    page === n
                      ? 'bg-[#1C59E5] text-white'
                      : 'border border-[#E4E8ED] text-[#141A29]',
                  )}
                >
                  {n}
                </button>
              ))}
              {pageCount > 5 ? (
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="flex size-8 items-center justify-center rounded-xl border border-[#E4E8ED]"
                  aria-label="Next page"
                >
                  <IconImg src={iconNext} size={14} />
                </button>
              ) : null}
              <label className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#E4E8ED] px-2 text-[12px] font-medium text-[#141A29]">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                  className="bg-transparent outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <IconImg src={iconChevron} size={14} />
              </label>
            </div>
          </div>
        </div>

        {panelOpen && selected ? (
          <aside className="min-w-0 rounded-2xl border border-[#E4E8ED] bg-white p-4 shadow-[0_2px_8px_rgba(58,71,99,0.06)] xl:self-start">
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPanelOpen(false)}
                className="flex size-5 items-center justify-center"
              >
                <IconImg src={iconClose} size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <span
                className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                style={{ background: selected.iconBg }}
              >
                {selected.letter}
              </span>
              <h2 className="mt-3 text-[15px] font-bold text-[#141A29]">{selected.organization}</h2>
              <p className="mt-1 text-[12px] text-[#6F7B8C]">{selected.email}</p>
              <div className="mt-2">
                <StatusPill status={selected.status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Plan</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">{selected.planLabel}</p>
              </div>
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Members</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">
                  {selected.membersCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#E4E8ED] p-2.5">
                <p className="text-[10px] text-[#6F7B8C]">Since</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#141A29]">{selected.since}</p>
              </div>
            </div>

            <h3 className="mt-5 text-[13px] font-bold text-[#141A29]">Subscription Details</h3>
            <dl className="mt-2.5 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Billing Cycle</dt>
                <dd className="font-medium text-[#141A29]">{selected.billingCycle}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Next Billing Date</dt>
                <dd className="font-medium text-[#141A29]">
                  {selected.status === 'canceled' ? selected.nextBillingNote : selected.nextBilling}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Amount</dt>
                <dd className="font-medium text-[#141A29]">{money(selected.amount)} USD</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Payment Method</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="rounded bg-[#E4EFFF] px-1 py-0.5 text-[9px] font-extrabold italic text-[#1343C7]">
                    VISA
                  </span>
                  <span className="font-medium text-[#141A29]">{selected.paymentMethod}</span>
                  <button type="button" className="font-semibold text-[#1C59E5]">
                    Edit
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6F7B8C]">Invoice Email</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-[#141A29]">{selected.invoiceEmail}</span>
                  <button type="button" className="shrink-0 font-semibold text-[#1C59E5]">
                    Edit
                  </button>
                </dd>
              </div>
            </dl>

            <h3 className="mt-5 text-[13px] font-bold text-[#141A29]">Usage This Month</h3>
            <div className="mt-2.5 space-y-3.5">
              <UsageBar
                label="Meetings"
                valueLabel={`${selected.usage.meetings.used.toLocaleString()} / ${selected.usage.meetings.limit.toLocaleString()}`}
                pct={(selected.usage.meetings.used / selected.usage.meetings.limit) * 100}
                barColor="#1C59E5"
              />
              <UsageBar
                label="Recordings"
                valueLabel={`${selected.usage.recordings.used} / ${selected.usage.recordings.limit}${selected.usage.recordings.suffix}`}
                pct={(selected.usage.recordings.used / selected.usage.recordings.limit) * 100}
                barColor="#00A159"
              />
              <UsageBar
                label="Storage"
                valueLabel={`${selected.usage.storage.used} / ${selected.usage.storage.limit}${selected.usage.storage.suffix}`}
                pct={(selected.usage.storage.used / selected.usage.storage.limit) * 100}
                barColor="#8047E1"
              />
              <UsageBar
                label="Participants"
                valueLabel={`${selected.usage.participants.used.toLocaleString()} / ${selected.usage.participants.limit.toLocaleString()}`}
                pct={(selected.usage.participants.used / selected.usage.participants.limit) * 100}
                barColor="#EFA810"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(28,89,229,0.4)] text-[12px] font-semibold text-[#1C59E5]"
              >
                Change Plan
              </button>
              <Link
                to="/admin/invoices"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(28,89,229,0.4)] text-[12px] font-semibold text-[#1C59E5]"
              >
                View Invoices
              </Link>
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[rgba(230,40,69,0.4)] text-[12px] font-semibold text-[#E62845]"
            >
              Cancel Subscription
            </button>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
