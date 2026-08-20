import type { RemoteUiCommand } from '../remote-control.constants';

export type RemoteControlLifecycle =
  | 'idle'
  | 'pending'
  | 'accepted'
  | 'active'
  | 'stopping'
  | 'revoked'
  | 'ended';

export type RemoteControlProtocol =
  | 'REMOTE_CONTROL_REQUEST'
  | 'REMOTE_CONTROL_ACCEPTED'
  | 'REMOTE_CONTROL_REJECTED'
  | 'REMOTE_CONTROL_STARTED'
  | 'REMOTE_CONTROL_ACTION'
  | 'REMOTE_CONTROL_STOPPED'
  | 'REMOTE_CONTROL_REVOKED'
  | 'REMOTE_CONTROL_CURSOR'
  | 'REMOTE_CONTROL_UI_STATE'
  | 'REMOTE_CONTROL_DRAFT'
  | 'REMOTE_CONTROL_VIEW';

export interface ControlPeerRef {
  participantId: string;
  userId: string;
  name: string;
  socketId: string;
}

export interface RemoteControlSession {
  sessionId: string;
  roomId: string;
  requester: ControlPeerRef;
  controlled: ControlPeerRef;
  state: RemoteControlLifecycle;
  permissions: readonly RemoteUiCommand[];
  lastSeq: number;
  createdAt: number;
  acceptedAt?: number;
  endedAt?: number;
  endReason?: string;
}

export interface ActionAttribution {
  initiatorId: string;
  initiatorName: string;
  executorId: string;
  executorName: string;
}

export interface RemoteControlActionEnvelope {
  type: 'REMOTE_CONTROL_ACTION';
  sessionId: string;
  requesterId: string;
  controlledUserId: string;
  actionType: RemoteUiCommand;
  payload: Record<string, unknown>;
  timestamp: number;
  seq: number;
  authorization: { roomId: string; permissions: readonly RemoteUiCommand[] };
  attribution: ActionAttribution;
}

export interface ControlledUiState {
  version: number;
  sidebar: 'chat' | 'participants' | null;
  layout: 'gallery' | 'presentation';
  selectedParticipantId: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  chatDraft: string;
  showAllParticipants: boolean;
  scrollTop: number;
}

export interface RemoteControlHistoryEvent {
  id: string;
  sessionId: string;
  roomId: string;
  at: number;
  seq?: number;
  action: string;
  controllerId: string;
  controllerName: string;
  controlledUserId: string;
  controlledName: string;
  result: 'ok' | 'rejected';
  metadata?: Record<string, unknown>;
}

export type RemoteControlAuditAction =
  | 'RC_REQUEST_CREATED'
  | 'RC_REQUEST_ACCEPTED'
  | 'RC_REQUEST_REJECTED'
  | 'RC_SESSION_STARTED'
  | 'RC_COMMAND_FORWARDED'
  | 'RC_COMMAND_REJECTED'
  | 'RC_VIEW_SWITCHED'
  | 'RC_REVOKED'
  | 'RC_STOPPED'
  | 'RC_DISCONNECT'
  | 'RC_SESSION_ENDED';

export interface RemoteControlAuditEvent {
  action: RemoteControlAuditAction;
  sessionId?: string;
  roomId?: string;
  actorParticipantId?: string;
  metadata?: Record<string, unknown>;
  at: number;
}

export interface MeetingPresencePort {
  getPeer(roomId: string, participantId: string): ControlPeerRef | null;
  isInRoom(roomId: string, participantId: string): boolean;
}

export class RemoteControlError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'RemoteControlError';
  }
}
