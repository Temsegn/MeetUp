import { MonitorUp } from 'lucide-react';

type Props = {
  sharing?: boolean;
  sharerName?: string | null;
  title?: string;
};

/** Bottom “Shared Screen” card from Figma — live preview cue or empty state. */
export function MeetingSharedScreenCard({
  sharing = false,
  sharerName,
  title = 'Shared Screen',
}: Props) {
  return (
    <section className="flex h-full min-h-[180px] flex-col overflow-hidden rounded-[22px] border border-[#E0E7EE] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#121B29] sm:text-[18px]">
          {title}
        </h2>
        {sharing ? (
          <span className="rounded-full bg-[#E8F1FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#076BEE]">
            Live
          </span>
        ) : null}
      </div>

      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#F0F5FA]">
        {sharing ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 p-4 text-center">
            <MonitorUp className="size-8 text-[#076BEE]" />
            <p className="text-[14px] font-semibold text-[#121B29]">
              {sharerName ? `${sharerName} is presenting` : 'Screen share in progress'}
            </p>
            <p className="text-[12px] text-[#667383]">Full share is shown in the main stage above</p>
          </div>
        ) : (
          <div className="flex h-full min-h-[140px] flex-col justify-end gap-3 p-4">
            <div className="flex h-16 items-end gap-1.5 px-1">
              {[40, 55, 35, 70, 48, 62, 45, 78, 52, 68, 58, 72].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-[#B8D4F8]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#121B29]">No one is sharing yet</p>
              <span className="rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[11px] font-semibold text-[#076BEE]">
                Ready
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
