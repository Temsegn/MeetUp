import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
  CloudUpload,
  Film,
  MoreHorizontal,
  Plus,
  Users,
  Video,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import { adminApi, type AdminOverview } from '../api/admin.service';
import { StatusBadge } from '../components/AdminUi';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  trend: string;
  icon: typeof Bell;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6F7B8C]">{label}</p>
        <span className={cn('flex size-9 items-center justify-center rounded-full', iconClass)}>
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-2 text-[26px] font-bold tracking-tight text-[#151D2B]">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-emerald-600">{trend}</p>
    </div>
  );
}

function ActivityChart({
  labels,
  meetings,
  users,
}: {
  labels: string[];
  meetings: number[];
  users: number[];
}) {
  const w = 560;
  const h = 220;
  const pad = 28;
  const maxY = Math.max(200, ...meetings, ...users, 1);

  const toPoints = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(vals.length - 1, 1);
        const y = h - pad - (v / maxY) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');

  const area = (vals: number[]) => {
    const pts = vals.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(vals.length - 1, 1);
      const y = h - pad - (v / maxY) * (h - pad * 2);
      return [x, y] as const;
    });
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (!first || !last) return '';
    return `M ${first[0]} ${h - pad} L ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')} L ${last[0]} ${h - pad} Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[220px] w-full">
      {[0, 50, 100, 150, 200].map((tick) => {
        const y = h - pad - (tick / maxY) * (h - pad * 2);
        return (
          <g key={tick}>
            <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#E8ECF1" strokeWidth="1" />
            <text x={8} y={y + 3} className="fill-[#94A3B8]" fontSize="10">
              {tick}
            </text>
          </g>
        );
      })}
      <path d={area(meetings)} fill="url(#meetFill)" opacity="0.35" />
      <path d={area(users)} fill="url(#userFill)" opacity="0.25" />
      <polyline fill="none" stroke="#016BE6" strokeWidth="2.5" points={toPoints(meetings)} />
      <polyline fill="none" stroke="#7C3AED" strokeWidth="2.5" points={toPoints(users)} />
      {labels.map((label, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(labels.length - 1, 1);
        return (
          <text key={label} x={x} y={h - 8} textAnchor="middle" className="fill-[#94A3B8]" fontSize="10">
            {label}
          </text>
        );
      })}
      <defs>
        <linearGradient id="meetFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#016BE6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#016BE6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="userFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ROOM_COLORS = ['#016BE6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load overview'));
  }, []);

  const usageBars: Array<{
    label: string;
    used: number;
    limit: number;
    usedLabel?: string;
    limitLabel?: string;
  }> = useMemo(() => {
    const s = data?.subscriptionOverview;
    if (!s) return [];
    return [
      { label: 'Rooms', used: s.roomsUsed, limit: s.roomsLimit },
      {
        label: 'Storage',
        used: s.storageUsedGb,
        limit: s.storageLimitGb,
        usedLabel: `${s.storageUsedGb} GB`,
        limitLabel: s.storageLimitGb >= 1024 ? '1 TB' : `${s.storageLimitGb} GB`,
      },
      { label: 'Team Members', used: s.membersUsed, limit: s.membersLimit },
    ];
  }, [data?.subscriptionOverview]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-[#6F7B8C]">Loading SaaS dashboard…</p>;

  const { kpis, growth, topActiveRooms, recentActivity, subscriptionOverview: sub } = data;

  return (
    <div className="pb-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151D2B]">SaaS Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#6F7B8C]">
            Overview of your workspace and meeting activity
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8ECF1] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#334155]">
            <Users className="size-3.5 text-[#016BE6]" />
            {kpis.activeUsers}
          </span>
          <button
            type="button"
            className="rounded-full border border-[#E8ECF1] bg-white p-2 text-[#64748B] hover:bg-[#F8FAFC]"
            aria-label="More"
          >
            <MoreHorizontal className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/workspaces/new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#BE123C]"
          >
            <Plus className="size-3.5" /> Create Room
          </button>
          <div
            className="flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ background: user?.avatarColor || '#016BE6' }}
            title={user?.name}
          >
            {(user?.name || 'A').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Rooms"
          value={kpis.totalRooms}
          trend="+12% vs last 30 days"
          icon={Building2}
          iconClass="bg-[#E2F0FF] text-[#016BE6]"
        />
        <KpiCard
          label="Active Users"
          value={kpis.activeUsers.toLocaleString()}
          trend="+8% vs last 30 days"
          icon={Users}
          iconClass="bg-[#F3E8FF] text-[#7C3AED]"
        />
        <KpiCard
          label="Meetings Today"
          value={kpis.meetingsToday}
          trend="+14% vs yesterday"
          icon={CalendarDays}
          iconClass="bg-[#DCFCE7] text-[#16A34A]"
        />
        <KpiCard
          label="Total Recordings"
          value={kpis.totalRecordings.toLocaleString()}
          trend="+11% vs last 30 days"
          icon={Film}
          iconClass="bg-[#FEF3C7] text-[#D97706]"
        />
        <KpiCard
          label="Storage Used"
          value={`${kpis.storageUsedGb} GB`}
          trend={`+6% of ${kpis.storageLimitGb >= 1024 ? '1 TB' : `${kpis.storageLimitGb} GB`}`}
          icon={CloudUpload}
          iconClass="bg-[#E2F0FF] text-[#016BE6]"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Meeting Activity</h2>
            <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#016BE6]" /> Meetings
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#7C3AED]" /> Active Users
              </span>
              <select className="rounded-lg border border-[#E8ECF1] bg-white px-2 py-1 text-[11px] font-medium">
                <option>Last 30 Days</option>
              </select>
            </div>
          </div>
          <ActivityChart
            labels={growth.labels}
            meetings={growth.meetings ?? growth.organizations}
            users={growth.users}
          />
        </div>

        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-[12px] font-semibold text-[#016BE6] hover:underline">
              View All
            </Link>
          </div>
          <ul className="space-y-3">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E2F0FF] text-[#016BE6]">
                  {item.kind === 'org' ? (
                    <Building2 className="size-3.5" />
                  ) : item.title.toLowerCase().includes('recording') ? (
                    <Film className="size-3.5" />
                  ) : (
                    <Video className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#151D2B] capitalize">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-[#6F7B8C]">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#94A3B8]">{relativeTime(item.at)}</span>
              </li>
            ))}
            {recentActivity.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-[#94A3B8]">No recent activity</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#E8ECF1] px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Top Active Rooms</h2>
            <Link to="/admin/workspaces" className="text-[12px] font-semibold text-[#016BE6] hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#6F7B8C]">
                <tr>
                  <th className="px-4 py-2.5">Room Name</th>
                  <th className="px-4 py-2.5">Members</th>
                  <th className="px-4 py-2.5">Meetings</th>
                  <th className="px-4 py-2.5">Last Activity</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {topActiveRooms.map((room, i) => (
                  <tr key={room.id} className="border-t border-[#E8ECF1]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ background: ROOM_COLORS[i % ROOM_COLORS.length] }}
                        >
                          {room.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#151D2B]">{room.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#334155]">{room.members}</td>
                    <td className="px-4 py-3 text-[#334155]">{room.meetings}</td>
                    <td className="px-4 py-3 text-[#6F7B8C]">{relativeTime(room.lastActivity)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={room.status} />
                    </td>
                  </tr>
                ))}
                {topActiveRooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                      No rooms yet — create rooms in workspaces
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Subscription Overview</h2>
            <Link to="/admin/plans" className="text-[12px] font-semibold text-[#016BE6] hover:underline">
              Manage Plan
            </Link>
          </div>

          {sub ? (
            <>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[#151D2B]">{sub.planName} Plan</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#016BE6]">
                      ${sub.priceMonthly.toFixed(2)}
                      <span className="font-medium text-[#64748B]">/month</span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#6F7B8C]">Platform catalog estimate</p>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {usageBars.map((bar) => {
                  const pct = Math.min(100, Math.round((bar.used / Math.max(bar.limit, 1)) * 100));
                  const usedLabel = bar.usedLabel ?? String(bar.used);
                  const limitLabel = bar.limitLabel ?? String(bar.limit);
                  return (
                    <div key={bar.label}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[#334155]">{bar.label}</span>
                        <span className="text-[#6F7B8C]">
                          {usedLabel} / {limitLabel}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E8ECF1]">
                        <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          <ul className="mt-4 space-y-2 border-t border-[#E8ECF1] pt-3 text-[12px] text-[#64748B]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> API healthy
            </li>
            <li className="flex items-center gap-2">
              <CircleDot className="size-3.5 text-[#016BE6]" /> {kpis.activeMeetings} live meetings
            </li>
            <li className="flex items-center gap-2">
              <Bell className="size-3.5 text-[#F59E0B]" /> {kpis.suspendedOrganizations} suspended orgs
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
