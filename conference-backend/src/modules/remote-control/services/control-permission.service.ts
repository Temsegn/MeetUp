import type { MeetingPresencePort } from '../types/remote-control.types';
import { RemoteControlError } from '../types/remote-control.types';

export function assertSameMeetingMembership(
  presence: MeetingPresencePort,
  roomId: string,
  requesterParticipantId: string,
  targetParticipantId: string,
) {
  const requester = presence.getPeer(roomId, requesterParticipantId);
  const target = presence.getPeer(roomId, targetParticipantId);
  if (!requester || !target) {
    throw new RemoteControlError('Both participants must be in the same meeting.', 'NOT_IN_ROOM', 403);
  }
  if (requester.participantId === target.participantId) {
    throw new RemoteControlError('You cannot control yourself.', 'SELF_CONTROL', 400);
  }
  return { requester, target };
}

export function assertActorUserId(expectedUserId: string, actualUserId: string): void {
  if (expectedUserId !== actualUserId) {
    throw new RemoteControlError('Participant identity mismatch.', 'IMPERSONATION', 403);
  }
}
