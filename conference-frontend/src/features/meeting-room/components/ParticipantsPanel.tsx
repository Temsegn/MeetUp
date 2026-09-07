import { X, MicOff, Check } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ParticipantRowMenu, type ParticipantModerationAction } from './ParticipantRowMenu';

export type PanelParticipant = {
  id: string;
  name: string;
  role?: string;
  muted?: boolean;
  isYou?: boolean;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export type WaitingParticipant = {
  requestId: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  isGuest?: boolean;
};

type Props = {
  participants: PanelParticipant[];
  waiting?: WaitingParticipant[];
  isHostViewer?: boolean;
  remoteControlPendingId?: string | null;
  onClose: () => void;
  onParticipantAction?: (participantId: string, action: ParticipantModerationAction) => void;
  onAdmitWaiting?: (requestId: string) => void;
  onDenyWaiting?: (requestId: string) => void;
};

export function ParticipantsPanel({
  participants,
  waiting = [],
  isHostViewer,
  remoteControlPendingId,
  onClose,
  onParticipantAction,
  onAdmitWaiting,
  onDenyWaiting,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white">
      <div className="flex items-center justify-between border-b border-[#F1F4F8] px-3 py-2.5">
        <h3 className="text-[13px] font-semibold text-[#151D2B]">Participants ({participants.length})</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#64748B] hover:bg-[#F8FAFC]" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        {isHostViewer && waiting.length > 0 ? (
          <div>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#B45309]">
              Waiting to join ({waiting.length})
            </p>
            <ul className="space-y-1">
              {waiting.map((w) => (
                <li key={w.requestId} className="flex items-center gap-2 rounded-lg bg-[#FFFBEB] px-2 py-2">
                  <UserAvatar
                    name={w.name}
                    avatarUrl={w.avatarUrl}
                    avatarColor={w.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{w.name}</p>
                    <p className="text-[10px] text-[#92400E]">{w.isGuest ? 'Guest' : 'Registered'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdmitWaiting?.(w.requestId)}
                    className="rounded-lg bg-[#016BE6] p-1.5 text-white hover:bg-[#0056EF]"
                    aria-label={`Admit ${w.name}`}
                    title="Admit"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDenyWaiting?.(w.requestId)}
                    className="rounded-lg border border-[#FECACA] p-1.5 text-[#DC2626] hover:bg-[#FEF2F2]"
                    aria-label={`Deny ${w.name}`}
                    title="Deny"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="space-y-1">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#F8FAFC]">
              <UserAvatar
                name={p.name}
                avatarUrl={p.avatarUrl}
                avatarColor={p.avatarColor}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-[#151D2B]">
                  {p.name}
                  {p.isYou ? ' (You)' : ''}
                </p>
                <p className="truncate text-[10px] text-[#8A94A6]">{p.role || 'Participant'}</p>
              </div>
              {p.muted ? <MicOff className="size-3.5 shrink-0 text-[#DC2626]" /> : null}
              <ParticipantRowMenu
                participantName={p.name}
                muted={p.muted}
                isHostViewer={isHostViewer}
                isYou={p.isYou}
                remoteControlPending={remoteControlPendingId === p.id}
                onModerate={
                  onParticipantAction ? (action) => onParticipantAction(p.id, action) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
