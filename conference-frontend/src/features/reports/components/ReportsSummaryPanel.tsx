import { ArrowDownRight, ArrowUpRight, FileDown, Lightbulb } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export type SummaryRow = { label: string; value: string; change?: string; up?: boolean };

export type SummaryParticipant = {
  name: string;
  meetings: string;
  time: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  pct: number;
};

type Props = {
  rows: SummaryRow[];
  participants?: SummaryParticipant[];
  insights?: string[];
};

/** Figma right rail — Summary · Top Participants · Insights */
export function ReportsSummaryPanel({
  rows,
  participants = [],
  insights = [],
}: Props) {
  return (
    <aside className="flex w-full flex-col gap-3">
      <section className="rounded-xl border border-[#E8ECF1] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Summary</h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#016BE6] hover:underline"
          >
            <FileDown className="size-3" />
            Export Report
          </button>
        </div>
        <ul>
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between border-b border-[#F1F4F8] py-2.5 last:border-0"
            >
              <span className="text-[11px] text-[#6F7B8C]">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#151D2B]">{row.value}</span>
                {row.change ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-semibold',
                      row.up ? 'text-[#16A34A]' : 'text-[#DC2626]',
                    )}
                  >
                    {row.up ? (
                      <ArrowUpRight className="size-2.5" />
                    ) : (
                      <ArrowDownRight className="size-2.5" />
                    )}
                    {row.change}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#E8ECF1] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Top Participants</h3>
          <button type="button" className="text-[11px] font-semibold text-[#016BE6] hover:underline">
            View all
          </button>
        </div>
        {participants.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-[#8A94A6]">No participants in this range.</p>
        ) : (
          <ul className="space-y-3">
            {participants.map((p) => (
              <li key={p.name} className="flex items-center gap-2.5">
                <UserAvatar
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  avatarColor={p.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#151D2B]">{p.name}</p>
                  <p className="text-[10px] text-[#8A94A6]">{p.meetings}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                  {p.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[#E8ECF1] bg-[#F8FBFF] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-2 flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-[#016BE6]" />
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Insights</h3>
        </div>
        {insights.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-[#8A94A6]">
            Insights appear once your workspace has meeting activity in this range.
          </p>
        ) : (
          <>
            <ul className="space-y-2 text-[11px] leading-relaxed text-[#475569]">
              {insights.map((line) => (
                <li key={line} className="flex gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#016BE6]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-[11px] font-semibold text-[#016BE6] hover:underline"
            >
              View Detailed Insights →
            </button>
          </>
        )}
      </section>
    </aside>
  );
}
