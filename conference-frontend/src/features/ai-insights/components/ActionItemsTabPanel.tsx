import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Lightbulb,
  ListTodo,
  MoreHorizontal,
  PlayCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { cn } from '../../../lib/cn';
import {
  DEMO_AI_MEETING,
  type ActionItem,
  type ActionItemPriority,
  type ActionItemStatus,
} from '../data/ai-insights.data';

const CARD =
  'rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

const PAGE_SIZE = 8;

const STATUS_STYLE: Record<ActionItemStatus, string> = {
  Completed: 'bg-[#DCFCE7] text-[#15803D]',
  'In Progress': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Not Started': 'bg-[#F1F5F9] text-[#475569]',
};

const PRIORITY_STYLE: Record<ActionItemPriority, string> = {
  High: 'bg-[#FEE2E2] text-[#B91C1C]',
  Medium: 'bg-[#FFEDD5] text-[#C2410C]',
  Low: 'bg-[#F1F5F9] text-[#64748B]',
};

type Props = {
  meeting?: typeof DEMO_AI_MEETING;
};

/** Action Items tab — Figma 138:9751, app-sized. */
export function ActionItemsTabPanel({ meeting = DEMO_AI_MEETING }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ActionItemStatus>('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<ActionItem[]>(() =>
    meeting.actionItems.map((a) => ({ ...a, done: a.status === 'Completed' || a.done })),
  );

  const owners = useMemo(
    () => ['All', ...new Set(items.map((i) => i.ownerName))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (ownerFilter !== 'All' && item.ownerName !== ownerFilter) return false;
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter, ownerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.status === 'Completed').length;
    const inProgress = items.filter((i) => i.status === 'In Progress').length;
    const notStarted = items.filter((i) => i.status === 'Not Started').length;
    const overdue = items.filter((i) => i.id === 'a9').length;
    return {
      total: items.length,
      completed,
      inProgress,
      notStarted,
      overdue,
    };
  }, [items]);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected[r.id]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = { ...prev };
      const value = !allOnPageSelected;
      for (const row of pageRows) next[row.id] = value;
      return next;
    });
  };

  const toggleDone = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const done = !item.done;
        return {
          ...item,
          done,
          status: done ? 'Completed' : item.status === 'Completed' ? 'In Progress' : item.status,
        };
      }),
    );
  };

  const donutGradient = useMemo(() => {
    let cursor = 0;
    const stops: string[] = [];
    for (const o of meeting.actionOwnerShares) {
      const start = cursor;
      cursor += (o.pct / 100) * 360;
      stops.push(`${o.color} ${start}deg ${cursor}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [meeting.actionOwnerShares]);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]">
      <section className={cn(CARD, 'min-w-0 p-3.5 sm:p-4')}>
        <h3 className="text-[15px] font-bold text-[#151D2B]">Action Items</h3>
        <p className="mt-1 text-[12px] text-[#6F7B8C]">
          Tasks and next steps identified in this meeting. Stay on top of owners and due dates.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<ClipboardList className="size-3.5" />}
            iconClass="bg-[#EBF2FF] text-[#016BE6]"
            label="Total Action Items"
            value={String(stats.total)}
          />
          <StatCard
            icon={<CheckCircle2 className="size-3.5" />}
            iconClass="bg-[#DCFCE7] text-[#15803D]"
            label="Completed"
            value={String(stats.completed)}
          />
          <StatCard
            icon={<PlayCircle className="size-3.5" />}
            iconClass="bg-[#DBEAFE] text-[#1D4ED8]"
            label="In Progress"
            value={String(stats.inProgress)}
          />
          <StatCard
            icon={<ListTodo className="size-3.5" />}
            iconClass="bg-[#F1F5F9] text-[#475569]"
            label="Not Started"
            value={String(stats.notStarted)}
          />
          <StatCard
            icon={<AlertTriangle className="size-3.5" />}
            iconClass="bg-[#FEE2E2] text-[#B91C1C]"
            label="Overdue"
            value={String(stats.overdue)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search action items"
              className="h-9 w-full rounded-[14px] border border-[#E1E7EE] bg-white pr-3 pl-8 text-[12px] text-[#151D2B] outline-none placeholder:text-[#8A94A6] focus:border-[#016BE6]"
            />
          </div>
          <FilterSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v as 'All' | ActionItemStatus);
              setPage(1);
            }}
            options={['All', 'Completed', 'In Progress', 'Not Started']}
            labelAll="All Status"
          />
          <FilterSelect
            value={ownerFilter}
            onChange={(v) => {
              setOwnerFilter(v);
              setPage(1);
            }}
            options={owners}
            labelAll="All Owners"
          />
          <button
            type="button"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#151D2B] hover:bg-[#F8FAFC]"
          >
            <Download className="size-3.5" />
            Export
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#F1F4F8]">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[36px]" />
              <col />
              <col className="w-[108px]" />
              <col className="w-[92px]" />
              <col className="w-[72px]" />
              <col className="w-[68px]" />
              <col className="w-[32px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#F1F4F8] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                <th className="px-2 py-2.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="size-3.5 rounded border-[#CBD5E1]"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-1.5 py-2.5">Action Item</th>
                <th className="px-1.5 py-2.5">Owner</th>
                <th className="px-1.5 py-2.5">Status</th>
                <th className="px-1.5 py-2.5">Due</th>
                <th className="px-1.5 py-2.5">Priority</th>
                <th className="px-1 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-b border-[#F8FAFC] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-2 py-2.5 align-middle">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[row.id])}
                      onChange={() =>
                        setSelected((s) => ({ ...s, [row.id]: !s[row.id] }))
                      }
                      className="size-3.5 rounded border-[#CBD5E1]"
                      aria-label={`Select ${row.text}`}
                    />
                  </td>
                  <td className="px-1.5 py-2.5 align-middle">
                    <button
                      type="button"
                      title={row.text}
                      onClick={() => toggleDone(row.id)}
                      className={cn(
                        'line-clamp-2 w-full text-left text-[11px] font-semibold leading-snug text-[#151D2B]',
                        row.done && 'line-through opacity-60',
                      )}
                    >
                      {row.text}
                    </button>
                  </td>
                  <td className="px-1.5 py-2.5 align-middle">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <UserAvatar
                        name={row.ownerName}
                        avatarUrl={row.avatarUrl}
                        avatarColor={row.avatarColor}
                        size="xs"
                      />
                      <span className="truncate text-[11px] text-[#334155]" title={row.ownerName}>
                        {row.assignee}
                      </span>
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 align-middle">
                    <span
                      className={cn(
                        'inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                        STATUS_STYLE[row.status],
                      )}
                    >
                      {row.status === 'In Progress'
                        ? 'Progress'
                        : row.status === 'Not Started'
                          ? 'Open'
                          : row.status}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 align-middle text-[11px] text-[#6F7B8C]">
                    {row.due}
                  </td>
                  <td className="px-1.5 py-2.5 align-middle">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                        PRIORITY_STYLE[row.priority],
                      )}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-1 py-2.5 align-middle">
                    <button
                      type="button"
                      className="rounded-lg p-0.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569]"
                      aria-label="More"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-[#8A94A6]">
                    No action items match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#6F7B8C]">
            Showing {(safePage - 1) * PAGE_SIZE + (pageRows.length ? 1 : 0)} to{' '}
            {(safePage - 1) * PAGE_SIZE + pageRows.length} of {filtered.length} action items
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold',
                  n === safePage
                    ? 'bg-[#016BE6] text-white'
                    : 'border border-[#E1E7EE] text-[#475569] hover:bg-[#F8FAFC]',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-3">
        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <h3 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Action Items by Owner</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="relative size-[112px] shrink-0 rounded-full"
              style={{ background: donutGradient }}
              aria-hidden
            >
              <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[18px] font-bold text-[#151D2B]">{stats.total}</span>
                <span className="text-[10px] font-medium text-[#8A94A6]">Total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {meeting.actionOwnerShares.map((o) => (
                <li key={o.name} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-[#334155]">{o.name}</span>
                  <span className="shrink-0 text-[#6F7B8C]">
                    {o.count} ({o.pct}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[#151D2B]">Upcoming Deadlines</h3>
            <button
              type="button"
              className="text-[12px] font-semibold text-[#016BE6] hover:underline"
            >
              View Calendar
            </button>
          </div>
          <ul className="space-y-2.5">
            {meeting.upcomingDeadlines.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-2.5 rounded-lg border border-[#F1F4F8] px-2.5 py-2"
              >
                <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-[#016BE6]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#6F7B8C]">{d.date}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#151D2B]">{d.text}</p>
                </div>
                <UserAvatar
                  name={d.text}
                  avatarUrl={d.avatarUrl}
                  avatarColor={d.avatarColor}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(CARD, 'p-3.5 sm:p-4')}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-[#7C3AED]" />
            <h3 className="text-[13px] font-semibold text-[#151D2B]">AI Recommendation</h3>
          </div>
          <p className="text-[12px] leading-relaxed text-[#475569]">
            {meeting.actionRecommendation}
          </p>
          <div className="mt-3 flex gap-2 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2.5">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[#016BE6]" />
            <p className="text-[11px] leading-relaxed text-[#1E40AF]">
              Tip: Assign owners and due dates to improve accountability and follow-through.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#F1F4F8] bg-[#F8FAFC] px-2.5 py-2.5">
      <div className="flex items-start gap-2">
        <span className={cn('flex size-7 items-center justify-center rounded-lg', iconClass)}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold leading-tight text-[#8A94A6]">{label}</p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[#151D2B]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  labelAll,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelAll: string;
}) {
  return (
    <label className="relative inline-flex h-9 items-center rounded-[14px] border border-[#E1E7EE] bg-white px-3 text-[12px] font-medium text-[#151D2B]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent pr-5 outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'All' ? labelAll : o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-[#6F7B8C]" />
    </label>
  );
}
