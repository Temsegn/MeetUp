import { WifiOff } from 'lucide-react';

type Props = {
  title: string;
  displayName?: string;
  isRejoining?: boolean;
  error?: string | null;
  onRejoin: () => void;
  onLeave: () => void;
};

/**
 * Full-screen recovery destination after the 20s reconnect window.
 * Not the meetings list — only this meeting + Rejoin.
 */
export function MeetingRejoinScreen({
  title,
  displayName,
  isRejoining = false,
  error = null,
  onRejoin,
  onLeave,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-[#F7F9FC] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
          <WifiOff className="size-7" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-[20px] font-bold tracking-tight text-[#151D2B] sm:text-[22px]">
          Connection lost
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#667383]">
          You were disconnected from{' '}
          <span className="font-semibold text-[#151D2B]">{title.trim() || 'this meeting'}</span>
          {displayName?.trim() ? (
            <>
              {' '}
              as <span className="font-semibold text-[#151D2B]">{displayName.trim()}</span>
            </>
          ) : null}
          . Your admission is saved — rejoin to continue.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#DC2626]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onRejoin}
          disabled={isRejoining}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#016BE6] text-[14px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
        >
          {isRejoining ? 'Rejoining…' : 'Rejoin meeting'}
        </button>
        <button
          type="button"
          onClick={onLeave}
          disabled={isRejoining}
          className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl border border-[#E0E7EE] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
