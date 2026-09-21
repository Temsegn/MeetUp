import { CalendarPlus, CloudUpload, LogIn, MonitorUp } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { QuickActionSkeleton } from './DashboardSkeletons';
import {
  DASHBOARD_CARD_RADIUS_CLASS,
  DASHBOARD_QUICK_TILE_RADIUS_CLASS,
} from './dashboardListStyles';

const ACTIONS = [
  {
    icon: CalendarPlus,
    label: 'Schedule Meeting',
    bg: 'bg-[#E8F1FE]',
    text: 'text-[#1A56DB]',
  },
  {
    icon: LogIn,
    label: 'Join with ID',
    bg: 'bg-[#E3F8EC]',
    text: 'text-[#0F7A4A]',
  },
  {
    icon: MonitorUp,
    label: 'Share Screen',
    bg: 'bg-[#EEE9FF]',
    text: 'text-[#6B3FA0]',
  },
  {
    icon: CloudUpload,
    label: 'Upload Recording',
    bg: 'bg-[#FFE8D6]',
    text: 'text-[#C2410C]',
  },
];

export function QuickActionsCard({
  className,
  loading = false,
}: {
  className?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        DASHBOARD_CARD_RADIUS_CLASS,
        'border border-[#E8ECF1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <h3 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Quick Actions</h3>
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5" aria-busy="true" aria-label="Loading actions">
          {Array.from({ length: 4 }, (_, i) => (
            <QuickActionSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                className={cn(
                  a.bg,
                  a.text,
                  DASHBOARD_QUICK_TILE_RADIUS_CLASS,
                  'flex min-h-[72px] flex-col items-center justify-center gap-2 px-2 py-3 text-[10px] font-semibold leading-tight transition-opacity hover:opacity-90',
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
                <span className="text-center">{a.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
