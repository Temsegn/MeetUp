import { ChevronDown } from 'lucide-react';
import { SectionCard } from '../../dashboard/components/SectionCard';

type DayPoint = { date: string; participantMinutes: number; meetings?: number };

type Props = {
  byDay?: DayPoint[];
};

/**
 * Figma Meeting Activity Trend — dual series (Meetings + Participants) with Daily control.
 */
export function MeetingActivityTrend({ byDay = [] }: Props) {
  const points = byDay.slice(-7);
  const hasData = points.some((p) => p.participantMinutes > 0 || (p.meetings ?? 0) > 0);

  const meetingVals = points.map((p) => p.meetings ?? 0);
  const participantVals = points.map((p) => p.participantMinutes);
  const meetingMax = Math.max(...meetingVals, 1);
  const participantMax = Math.max(...participantVals, 1);

  const dayLabels =
    points.length > 0
      ? points.map((p) => {
          const d = new Date(p.date + 'T12:00:00');
          return Number.isNaN(d.getTime())
            ? p.date.slice(5)
            : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
        })
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <SectionCard
      title="Meeting Activity Trend"
      action={
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-[#E1E7EE] px-2 py-0.5 text-[10px] font-semibold text-[#6F7B8C] hover:bg-[#F8FAFC]"
        >
          Daily
          <ChevronDown className="size-3" />
        </button>
      }
    >
      <div className="mb-2 flex items-center gap-3 text-[11px] text-[#6F7B8C]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-[#016BE6]" /> Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-[#93C5FD]" /> Participants
        </span>
      </div>

      {!hasData ? (
        <div className="h-40 w-full sm:h-44">
          <svg viewBox="0 0 400 168" className="h-full w-full" aria-hidden>
            {[0, 36, 72, 108, 144].map((y) => (
              <line key={y} x1="36" y1={y} x2="380" y2={y} stroke="#F1F4F8" strokeWidth="1" />
            ))}
            {['100', '75', '50', '25', '0'].map((label, i) => (
              <text key={label} x="28" y={i * 36 + 4} textAnchor="end" fill="#94A3B8" fontSize="9">
                {label}
              </text>
            ))}
            {dayLabels.map((label, i) => (
              <text
                key={label + i}
                x={60 + (i / Math.max(dayLabels.length - 1, 1)) * 310}
                y={158}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="9"
              >
                {label}
              </text>
            ))}
          </svg>
          <p className="-mt-6 text-center text-[11px] text-[#8A94A6]">No activity in this range</p>
        </div>
      ) : (
        <div className="h-40 w-full sm:h-44">
          <svg viewBox="0 0 400 168" className="h-full w-full" role="img" aria-label="Meeting activity trend">
            {[0, 36, 72, 108, 144].map((y) => (
              <line key={y} x1="36" y1={y} x2="380" y2={y} stroke="#F1F4F8" strokeWidth="1" />
            ))}
            {['100', '75', '50', '25', '0'].map((label, i) => (
              <text key={label} x="28" y={i * 36 + 4} textAnchor="end" fill="#94A3B8" fontSize="9">
                {label}
              </text>
            ))}
            {(() => {
              const n = Math.max(points.length - 1, 1);
              const toCoords = (vals: number[], max: number) =>
                vals.map((v, i) => {
                  const x = 60 + (i / n) * 310;
                  const y = 140 - (v / max) * 120;
                  return { x, y };
                });
              const meet = toCoords(meetingVals, meetingMax);
              const parts = toCoords(participantVals, participantMax);
              const line = (coords: { x: number; y: number }[]) =>
                coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ');
              const area =
                parts.length > 0
                  ? `${line(parts)} L${parts[parts.length - 1].x} 160 L${parts[0].x} 160 Z`
                  : '';
              return (
                <>
                  <defs>
                    <linearGradient id="meetGradFigma" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {area ? <path d={area} fill="url(#meetGradFigma)" /> : null}
                  <path
                    d={line(parts)}
                    fill="none"
                    stroke="#93C5FD"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={line(meet)}
                    fill="none"
                    stroke="#016BE6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {dayLabels.map((label, i) => (
                    <text
                      key={label + i}
                      x={60 + (i / n) * 310}
                      y={158}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                    >
                      {label}
                    </text>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </SectionCard>
  );
}
