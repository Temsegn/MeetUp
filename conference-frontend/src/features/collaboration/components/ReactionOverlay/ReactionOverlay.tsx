import React from 'react';
import { ReactionEvent } from '../../hooks/useReactions';

interface ReactionOverlayProps {
  reactions: ReactionEvent[];
  /** participantId → display name */
  peerNames?: Map<string, string>;
  /** This user's participantId */
  ownParticipantId?: string;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({
  reactions,
  peerNames,
  ownParticipantId,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map(r => {
        const isOwn = r.peerId === ownParticipantId;
        const senderName = isOwn
          ? 'You'
          : (peerNames?.get(r.peerId) ?? '');

        return (
          <div
            key={r.id}
            className="absolute bottom-24 flex flex-col items-center gap-0.5 animate-float-up"
            style={{ left: `${r.offsetX}%` }}
          >
            <span className="text-4xl sm:text-5xl drop-shadow-lg select-none">
              {r.reaction}
            </span>
            {senderName && (
              <span className="text-[10px] sm:text-xs font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                {senderName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
