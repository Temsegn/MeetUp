import React from 'react';
import { ReactionEvent } from '../../hooks/useReactions';

interface ReactionOverlayProps {
  reactions: ReactionEvent[];
  peerNames?: Map<string, string>;
  ownParticipantId?: string;
  ownUserName?: string;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({
  reactions,
  peerNames,
  ownParticipantId,
  ownUserName,
}) => {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 h-32">
      <div className="relative mx-auto h-full w-full max-w-4xl">
        {reactions.map((r) => {
          const isOwn = r.peerId === ownParticipantId;
          const displayName = isOwn
            ? (ownUserName ?? peerNames?.get(ownParticipantId ?? '') ?? 'You')
            : (peerNames?.get(r.peerId) ?? 'Guest');

          return (
            <div
              key={r.id}
              className="absolute bottom-0 flex flex-col items-center gap-1 animate-reaction-pop"
              style={{ left: `${r.offsetX}%` }}
            >
              <span className="text-4xl drop-shadow-lg select-none sm:text-5xl">{r.reaction}</span>
              <span className="max-w-[140px] truncate rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-md">
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
