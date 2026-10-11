import { cn } from '../../../lib/cn';
import { VideoTile, type LiveParticipant } from './VideoTile';

const MAX_VISIBLE = 10;

type Props = {
  tiles: LiveParticipant[];
  onOpenParticipants: () => void;
};

/** Above/below horizontal grids; caps at 10 with a +N more cell. */
export function MeetingVideoGrid({ tiles, onOpenParticipants }: Props) {
  const total = tiles.length;
  const overflow = Math.max(0, total - MAX_VISIBLE);
  const showOverflowCell = overflow > 0;
  // When overflowing, reserve one cell for +N (show 9 people + overflow).
  const visible = showOverflowCell ? tiles.slice(0, MAX_VISIBLE - 1) : tiles.slice(0, MAX_VISIBLE);
  const count = visible.length + (showOverflowCell ? 1 : 0);

  return (
    <div
      className={cn(
        'grid h-full min-h-0 min-w-0 gap-1 sm:gap-2',
        'auto-rows-fr',
        count <= 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-2',
        count === 3 && 'grid-cols-2',
        count === 4 && 'grid-cols-2',
        count === 5 && 'grid-cols-2 sm:grid-cols-3',
        count === 6 && 'grid-cols-2 sm:grid-cols-3',
        count >= 7 && count <= 9 && 'grid-cols-3',
        count >= 10 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
      )}
    >
      {visible.map((p, index) => (
        <VideoTile
          key={p.id}
          participant={p}
          isScreenShare={p.isScreenShare}
          className={cn(
            'h-full min-h-0 w-full min-w-0',
            count === 3 && index === 2 && 'col-span-2 mx-auto max-w-[50%]',
            count === 5 && index === 3 && 'sm:col-span-1',
            count === 5 && index === 4 && 'col-span-2 mx-auto max-w-[50%] sm:col-span-1 sm:max-w-none',
          )}
        />
      ))}
      {showOverflowCell ? (
        <button
          type="button"
          onClick={onOpenParticipants}
          className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#C5D0DC] bg-[#E8EEF5] text-[#334155] transition-colors hover:border-[#016BE6] hover:bg-[#E5F1FF] hover:text-[#016BE6] sm:rounded-[22px]"
          aria-label={`${overflow} more participants`}
        >
          <span className="text-[22px] font-bold leading-none tracking-tight sm:text-[28px]">
            +{overflow}
          </span>
          <span className="text-[11px] font-semibold sm:text-[12px]">more</span>
        </button>
      ) : null}
    </div>
  );
}
