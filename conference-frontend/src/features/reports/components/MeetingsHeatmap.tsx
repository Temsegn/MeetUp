import { SectionCard } from '../../dashboard/components/SectionCard';
import { ENGAGEMENT_DAYS, HEATMAP_DATA, HEATMAP_TIMES } from '../data/reports.data';

function heatClass(val: number): string {
  if (val <= 0) return 'bg-[#EFF6FF]';
  if (val <= 2) return 'bg-[#DBEAFE]';
  if (val <= 4) return 'bg-[#BFDBFE]';
  if (val <= 6) return 'bg-[#93C5FD]';
  if (val <= 8) return 'bg-[#60A5FA]';
  return 'bg-[#016BE6]';
}

type Props = {
  data?: number[][];
};

/** Figma heatmap — always renders the grid (zeros = low-activity cells). */
export function MeetingsHeatmap({ data = HEATMAP_DATA }: Props) {
  return (
    <SectionCard title="Meetings by Time of Day">
      <p className="mb-3 text-[11px] text-[#8A94A6]">
        Heatmap shows when your meetings are most active
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[260px]">
          <div className="flex gap-1.5">
            <div className="flex w-10 shrink-0 flex-col justify-between py-0.5">
              {HEATMAP_TIMES.map((t) => (
                <span
                  key={t}
                  className="flex h-8 items-center text-[9px] font-medium text-[#94A3B8] sm:h-9"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              {data.map((row, ri) => (
                <div key={HEATMAP_TIMES[ri]} className="flex h-8 gap-1.5 sm:h-9">
                  {row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className={`h-full min-w-0 flex-1 rounded-md ${heatClass(val)}`}
                      title={`${ENGAGEMENT_DAYS[ci]} ${HEATMAP_TIMES[ri]}: ${val} meetings`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1.5 flex gap-1.5 pl-[2.875rem]">
            {ENGAGEMENT_DAYS.map((d) => (
              <span
                key={d}
                className="min-w-0 flex-1 text-center text-[9px] font-medium text-[#94A3B8]"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 pl-[2.875rem] text-[9px] text-[#94A3B8]">
            <span className="shrink-0">Low Activity</span>
            <div
              className="h-2.5 min-w-0 flex-1 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, #EFF6FF 0%, #BFDBFE 35%, #60A5FA 70%, #016BE6 100%)',
              }}
            />
            <span className="shrink-0">High Activity</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
