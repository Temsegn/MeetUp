import { ChevronDown } from 'lucide-react';
import { SectionCard } from '../../dashboard/components/SectionCard';
import { cn } from '../../../lib/cn';
import { ENGAGEMENT_DAYS } from '../data/reports.data';

const Y_TICKS = [100, 75, 50, 25, 0];

type Props = {
  attendance: number[];
  camera: number[];
};

export function MeetingEngagementChart({ attendance, camera }: Props) {
  const showCamera = camera.some((v) => v > 0);

  return (
    <SectionCard
      title="Meeting Engagement"
      action={
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-[#E1E7EE] px-2 py-0.5 text-[10px] font-semibold text-[#6F7B8C] hover:bg-[#F8FAFC]"
        >
          Weekly
          <ChevronDown className="size-3" />
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-[#6F7B8C]">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#016BE6]" /> Avg. Join Rate (%)
        </span>
        {showCamera ? (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#93C5FD]" /> Avg. Camera On (%)
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <div className="flex h-40 w-7 shrink-0 flex-col justify-between py-0.5 text-right text-[9px] text-[#94A3B8] sm:h-44">
          {Y_TICKS.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 sm:h-44">
            {Y_TICKS.map((t, i) => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-[#F1F4F8]"
                style={{ top: `${(i / (Y_TICKS.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex h-40 items-end gap-1 sm:h-44 sm:gap-1.5">
            {ENGAGEMENT_DAYS.map((day, i) => (
              <div key={day} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex h-40 w-full items-end justify-center gap-0.5 sm:h-44">
                  <div
                    className={cn(
                      'rounded-t-md bg-[#016BE6]',
                      showCamera ? 'w-2.5 sm:w-3' : 'w-4 sm:w-5',
                    )}
                    style={{ height: `${Math.min(100, attendance[i] ?? 0)}%` }}
                  />
                  {showCamera ? (
                    <div
                      className="w-2.5 rounded-t-md bg-[#93C5FD] sm:w-3"
                      style={{ height: `${Math.min(100, camera[i] ?? 0)}%` }}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-1.5 flex gap-1 sm:gap-1.5">
            {ENGAGEMENT_DAYS.map((day) => (
              <span
                key={day}
                className="min-w-0 flex-1 text-center text-[9px] font-medium text-[#94A3B8]"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
