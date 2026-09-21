import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader } from '../components/AdminUi';

import iconSearch from '../assets/plans/search.svg';
import iconFilter from '../assets/plans/filter.svg';
import iconMore from '../assets/plans/more.svg';
import iconCheck from '../assets/plans/check.svg';
import iconPencil from '../assets/plans/pencil.svg';
import iconTrash from '../assets/plans/trash.svg';
import iconKpiDoc from '../assets/plans/kpi-doc.svg';
import iconKpiCheck from '../assets/plans/kpi-check.svg';
import iconKpiUsers from '../assets/plans/kpi-users.svg';
import iconKpiDollar from '../assets/plans/kpi-dollar.svg';
import iconKpiChart from '../assets/plans/kpi-chart.svg';

type PlanKey = 'business' | 'pro' | 'enterprise' | 'starter' | 'trial';

type PlanRow = {
  key: PlanKey;
  letter: string;
  name: string;
  detailTitle: string;
  tagline: string;
  description: string;
  iconBg: string;
  price: number;
  priceSuffix: string;
  billingCycle: 'Monthly' | 'One-time';
  subscribers: number;
  status: 'active' | 'inactive';
  planId: string;
  created: string;
  updated: string;
  features: string[];
};

/** Exact Figma catalog (49:4495) — colors, copy, prices. */
const FIGMA_PLANS: PlanRow[] = [
  {
    key: 'business',
    letter: 'B',
    name: 'Business',
    detailTitle: 'Business Plan',
    tagline: 'For small teams',
    description: 'Perfect for small teams getting started with advanced collaboration.',
    iconBg: '#8143e6',
    price: 29,
    priceSuffix: '/month',
    billingCycle: 'Monthly',
    subscribers: 512,
    status: 'active',
    planId: 'plan_business_001',
    created: 'Jan 10, 2024',
    updated: 'Apr 15, 2025',
    features: [
      'Up to 50 participants per meeting',
      '100 GB cloud recording storage',
      'Custom meeting links',
      'Calendar integrations',
      'Email & chat support',
      'Reports & analytics',
    ],
  },
  {
    key: 'pro',
    letter: 'P',
    name: 'Pro',
    detailTitle: 'Pro Plan',
    tagline: 'For growing teams',
    description: 'Built for growing teams that need more capacity and collaboration tools.',
    iconBg: '#0067ee',
    price: 59,
    priceSuffix: '/month',
    billingCycle: 'Monthly',
    subscribers: 436,
    status: 'active',
    planId: 'plan_pro_001',
    created: 'Jan 10, 2024',
    updated: 'Apr 15, 2025',
    features: [
      'Up to 100 participants per meeting',
      '250 GB cloud recording storage',
      'Custom meeting links',
      'Calendar integrations',
      'Email & chat support',
      'Reports & analytics',
    ],
  },
  {
    key: 'enterprise',
    letter: 'E',
    name: 'Enterprise',
    detailTitle: 'Enterprise Plan',
    tagline: 'For large organizations',
    description: 'Advanced controls and scale for large organizations.',
    iconBg: '#0fa05c',
    price: 129,
    priceSuffix: '/month',
    billingCycle: 'Monthly',
    subscribers: 210,
    status: 'active',
    planId: 'plan_enterprise_001',
    created: 'Jan 10, 2024',
    updated: 'Apr 15, 2025',
    features: [
      'Up to 500 participants per meeting',
      '1 TB cloud recording storage',
      'Custom meeting links',
      'Calendar integrations',
      'Priority email & chat support',
      'Reports & analytics',
    ],
  },
  {
    key: 'starter',
    letter: 'S',
    name: 'Starter',
    detailTitle: 'Starter Plan',
    tagline: 'For individuals',
    description: 'A free starting point for individuals exploring Samtal Meet.',
    iconBg: '#ed990e',
    price: 0,
    priceSuffix: '/month',
    billingCycle: 'Monthly',
    subscribers: 76,
    status: 'active',
    planId: 'plan_starter_001',
    created: 'Jan 10, 2024',
    updated: 'Apr 15, 2025',
    features: [
      'Up to 10 participants per meeting',
      '5 GB cloud recording storage',
      'Custom meeting links',
      'Calendar integrations',
      'Community support',
      'Basic reports',
    ],
  },
  {
    key: 'trial',
    letter: 'T',
    name: 'Trial',
    detailTitle: 'Trial Plan',
    tagline: '14-day free trial',
    description: 'Try premium features free for 14 days — no charge until you upgrade.',
    iconBg: '#e2348d',
    price: 0,
    priceSuffix: '/14 days',
    billingCycle: 'One-time',
    subscribers: 16,
    status: 'inactive',
    planId: 'plan_trial_001',
    created: 'Jan 10, 2024',
    updated: 'Apr 15, 2025',
    features: [
      'Up to 50 participants per meeting',
      '100 GB cloud recording storage',
      'Custom meeting links',
      'Calendar integrations',
      'Email & chat support',
      'Reports & analytics',
    ],
  },
];

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

function Kpi({
  label,
  value,
  meta,
  iconSrc,
  iconClass,
}: {
  label: string;
  value: string | number;
  meta: string;
  iconSrc: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E8ED] bg-white p-3.5 shadow-[0_1px_1px_rgba(21,30,53,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <IconImg src={iconSrc} size={16} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#151E35]">{value}</p>
      <p className="mt-1 text-[11px] text-[#6F7B8C]">{meta}</p>
    </div>
  );
}

function StatusPill({ status }: { status: 'active' | 'inactive' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex rounded-full bg-[#DAF7E3] px-2.5 py-0.5 text-[11px] font-semibold text-[#005F2E]">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#F3F6FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6F7B8C]">
      Inactive
    </span>
  );
}

export function AdminPlansPage() {
  const [liveSubs, setLiveSubs] = useState<Record<string, number>>({});
  const [mrr, setMrr] = useState(24560);
  const [arr, setArr] = useState(294720);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [selectedKey, setSelectedKey] = useState<PlanKey>('business');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.listPlans().catch(() => null), adminApi.billing().catch(() => null)])
      .then(([plansRes, billing]) => {
        if (plansRes?.items) {
          const map: Record<string, number> = {};
          for (const p of plansRes.items) {
            const key = String(p.key);
            const subs = Number(p.subscribers ?? 0);
            if (key === 'enterprise') map.enterprise = subs;
            if (key === 'pro') map.pro = subs;
            if (key === 'free') map.starter = subs;
          }
          setLiveSubs(map);
        }
        if (billing) {
          const nextMrr = Number(billing.mrr ?? 0);
          const nextArr = Number(billing.arr ?? nextMrr * 12);
          if (nextMrr > 0) setMrr(nextMrr);
          if (nextArr > 0) setArr(nextArr);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  const plans = useMemo(
    () =>
      FIGMA_PLANS.map((p) => ({
        ...p,
        subscribers: liveSubs[p.key] ?? p.subscribers,
      })),
    [liveSubs],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.tagline.toLowerCase().includes(term) &&
        !p.planId.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (statusFilter === 'active' && p.status !== 'active') return false;
      if (statusFilter === 'inactive' && p.status !== 'inactive') return false;
      if (cycleFilter === 'monthly' && p.billingCycle !== 'Monthly') return false;
      if (cycleFilter === 'one-time' && p.billingCycle !== 'One-time') return false;
      return true;
    });
  }, [plans, search, statusFilter, cycleFilter]);

  const selected =
    filtered.find((p) => p.key === selectedKey) ??
    plans.find((p) => p.key === selectedKey) ??
    plans[0];

  const activeCount = plans.filter((p) => p.status === 'active').length;
  const totalSubscribers = plans.reduce((s, p) => s + p.subscribers, 0);

  return (
    <div>
      <AdminPageHeader
        title="Subscription Plans"
        subtitle="Create and manage subscription plans and pricing."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC6C7C] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1)] hover:bg-[#D45A6C]"
          >
            <Plus className="size-3.5" strokeWidth={2.2} /> Create Plan
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Total Plans"
          value={plans.length}
          meta="All subscription plans"
          iconSrc={iconKpiDoc}
          iconClass="bg-[#E3EEFF]"
        />
        <Kpi
          label="Active Plans"
          value={activeCount}
          meta="Currently active plans"
          iconSrc={iconKpiCheck}
          iconClass="bg-[#DAF7E3]"
        />
        <Kpi
          label="Total Subscribers"
          value={totalSubscribers.toLocaleString()}
          meta="Across all plans"
          iconSrc={iconKpiUsers}
          iconClass="bg-[#EFEBFF]"
        />
        <Kpi
          label="MRR"
          value={`$${mrr.toLocaleString()}`}
          meta="Monthly Recurring Revenue"
          iconSrc={iconKpiDollar}
          iconClass="bg-[#FFEFCD]"
        />
        <Kpi
          label="Annual Revenue"
          value={`$${arr.toLocaleString()}`}
          meta="From all paid plans"
          iconSrc={iconKpiChart}
          iconClass="bg-[#E3EEFF]"
        />
      </div>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E4E8ED] bg-white shadow-[0_1px_1px_rgba(21,30,53,0.04)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E8ED] p-3">
            <div className="relative min-w-0 flex-1 basis-[180px]">
              <IconImg
                src={iconSearch}
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans..."
                className="h-9 w-full rounded-xl border border-[#E4E8ED] bg-white pr-3 pl-9 text-[13px] text-[#151E35] outline-none placeholder:text-[#6F7B8C] focus:border-[#0067EE]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] text-[#6F7B8C]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] text-[#6F7B8C]"
            >
              <option value="">All Billing Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="one-time">One-time</option>
            </select>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E4E8ED] bg-white px-2.5 text-[12px] font-semibold text-[#0067EE]"
            >
              <IconImg src={iconFilter} size={14} /> Filters
            </button>
          </div>

          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E4E8ED] text-[12px] font-bold text-[#151E35]">
                <th className="px-3 py-2.5">Plan Name</th>
                <th className="px-2 py-2.5">Price</th>
                <th className="px-2 py-2.5">Billing Cycle</th>
                <th className="px-2 py-2.5">Subscribers</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-2 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const active = p.key === selected?.key;
                return (
                  <tr
                    key={p.key}
                    onClick={() => setSelectedKey(p.key)}
                    className={cn(
                      'cursor-pointer border-t border-[#E4E8ED]',
                      active ? 'bg-[#F5F8FF]' : 'hover:bg-[#F8FAFC]',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
                          style={{ background: p.iconBg }}
                        >
                          {p.letter}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#151E35]">{p.name}</p>
                          <p className="truncate text-[11px] text-[#6F7B8C]">{p.tagline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <p className="font-bold text-[#151E35]">${p.price.toFixed(2)}</p>
                      <p className="text-[11px] text-[#6F7B8C]">{p.priceSuffix}</p>
                    </td>
                    <td className="px-2 py-2.5 text-[#6F7B8C]">{p.billingCycle}</td>
                    <td className="px-2 py-2.5 text-[#6F7B8C]">{p.subscribers.toLocaleString()}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center"
                        aria-label="Actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKey(p.key);
                        }}
                      >
                        <IconImg src={iconMore} size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[#94A3B8]">
                    No plans match your filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="border-t border-[#E4E8ED] px-3 py-2.5">
            <p className="text-[12px] text-[#6F7B8C]">
              Showing 1 to {filtered.length} of {filtered.length} plans
            </p>
          </div>
        </div>

        <aside className="min-w-0 rounded-2xl border border-[#E4E8ED] bg-white p-4 shadow-[0_1px_1px_rgba(21,30,53,0.04)] xl:self-start">
          {selected ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-[16px] text-[20px] font-bold text-white"
                  style={{ background: selected.iconBg }}
                >
                  {selected.letter}
                </span>
                <h2 className="mt-3 text-[15px] font-bold text-[#151E35]">{selected.detailTitle}</h2>
                <div className="mt-2">
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6F7B8C]">{selected.description}</p>
              </div>

              <dl className="mt-4 space-y-2.5 border-t border-[#E4E8ED] pt-4 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Price</dt>
                  <dd>
                    <span className="font-bold text-[#151E35]">${selected.price.toFixed(2)}</span>
                    <span className="text-[#6F7B8C]"> USD / month</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Billing Cycle</dt>
                  <dd className="text-[#6F7B8C]">{selected.billingCycle}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Plan ID</dt>
                  <dd className="truncate text-[#6F7B8C]">{selected.planId}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Created</dt>
                  <dd className="text-[#6F7B8C]">{selected.created}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-[#151E35]">Last Updated</dt>
                  <dd className="text-[#6F7B8C]">{selected.updated}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-[#E4E8ED] pt-4">
                <h3 className="text-[12px] font-bold text-[#151E35]">Features</h3>
                <ul className="mt-2.5 space-y-2">
                  {selected.features.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-[12px] text-[#6F7B8C]">
                      <IconImg src={iconCheck} size={14} className="mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#0067EE] text-[12px] font-semibold text-[#0067EE] hover:bg-[#F0F7FF]"
                >
                  <IconImg src={iconPencil} size={14} /> Edit Plan
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#ED3345] text-[12px] font-semibold text-[#ED3345] hover:bg-[#FFF5F5]"
                >
                  <IconImg src={iconTrash} size={14} /> Deactivate Plan
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
