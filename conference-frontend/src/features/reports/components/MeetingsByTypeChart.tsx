import { SectionCard } from '../../dashboard/components/SectionCard';
import { meetingsByTypeBreakdown, type ReportMeeting } from '../data/reports.data';

type Props = { meetings: ReportMeeting[] };

export function MeetingsByTypeChart({ meetings }: Props) {
  const data = meetingsByTypeBreakdown(meetings);
  const total = meetings.length;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <SectionCard title="Meetings by Type">
      {total === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#8A94A6]">No meetings in this range.</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden>
              {data.map((d) => {
                const dash = (d.value / 100) * circumference;
                const gap = circumference - dash;
                const current = offset;
                offset += dash;
                return (
                  <circle
                    key={d.label}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={d.color}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-current}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold leading-none text-[#151D2B]">{total}</span>
              <span className="mt-0.5 text-[10px] text-[#8A94A6]">Total</span>
            </div>
          </div>
          <ul className="w-full space-y-2">
            {data.map((d) => (
              <li key={d.label} className="flex items-center gap-2 text-[11px]">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-[#334155]">{d.label}</span>
                <span className="shrink-0 text-[#8A94A6]">
                  {d.value}% ({d.count})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
