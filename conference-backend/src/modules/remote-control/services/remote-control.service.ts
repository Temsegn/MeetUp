import { randomUUID } from 'crypto';
import {
  ACTION_RATE_LIMIT,
  ACTION_RATE_WINDOW_MS,
  CURSOR_RATE_LIMIT,
  DRAFT_RATE_LIMIT,
  HISTORY_LIMIT,
  PENDING_REQUEST_TTL_MS,
  UI_STATE_RATE_LIMIT,
  DEFAULT_CONTROL_PERMISSIONS,
  MAX_SESSION_MS,
} from '../remote-control.constants';
import type { RemoteUiCommand } from '../remote-control.constants';
import { parseActionPayload } from '../validators/remote-control-command.schema';
import type {
  ControlledUiState,
  MeetingPresencePort,
  RemoteControlActionEnvelope,
  RemoteControlAuditEvent,
  RemoteControlHistoryEvent,
  RemoteControlSession,
} from '../types/remote-control.types';
import { RemoteControlError } from '../types/remote-control.types';
import { assertSameMeetingMembership } from './control-permission.service';

export interface RemoteControlTransport {
  emitToSocket(socketId: string, event: string, payload: unknown): void;
}

export interface RemoteControlServiceDeps {
  presence: MeetingPresencePort;
  transport: RemoteControlTransport;
  now?: () => number;
  randomId?: () => string;
  pendingTtlMs?: number;
  onAudit?: (event: RemoteControlAuditEvent) => void;
}

export function createRemoteControlService(deps: RemoteControlServiceDeps) {
  const now = deps.now ?? (() => Date.now());
  const randomId = deps.randomId ?? (() => randomUUID());
  const pendingTtlMs = deps.pendingTtlMs ?? PENDING_REQUEST_TTL_MS;
  const sessions = new Map<string, RemoteControlSession>();
  const rate = new Map<string, { count: number; windowStart: number }>();
  const processedSeq = new Map<string, Set<number>>();
  const audits: RemoteControlAuditEvent[] = [];
  const history = new Map<string, RemoteControlHistoryEvent[]>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const ephemeralRate = new Map<string, { count: number; windowStart: number }>();

  function audit(event: Omit<RemoteControlAuditEvent, 'at'>): void {
    const full = { ...event, at: now() };
    audits.push(full);
    deps.onAudit?.(full);
  }

  function pushHistory(session: RemoteControlSession, event: Omit<RemoteControlHistoryEvent, 'id' | 'at' | 'sessionId' | 'roomId' | 'controllerId' | 'controllerName' | 'controlledUserId' | 'controlledName'>): void {
    const entry: RemoteControlHistoryEvent = {
      id: randomId(),
      at: now(),
      sessionId: session.sessionId,
      roomId: session.roomId,
      controllerId: session.requester.participantId,
      controllerName: session.requester.name,
      controlledUserId: session.controlled.participantId,
      controlledName: session.controlled.name,
      ...event,
    };
    const list = history.get(session.sessionId) ?? [];
    list.push(entry);
    if (list.length > HISTORY_LIMIT) list.splice(0, list.length - HISTORY_LIMIT);
    history.set(session.sessionId, list);
    deps.transport.emitToSocket(session.requester.socketId, 'remote-control:history', entry);
    deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:history', entry);
  }

  function overRate(key: string, limit: number, windowMs: number): boolean {
    const t = now();
    const window = ephemeralRate.get(key) ?? { count: 0, windowStart: t };
    if (t - window.windowStart > windowMs) {
      window.count = 0;
      window.windowStart = t;
    }
    window.count += 1;
    ephemeralRate.set(key, window);
    return window.count > limit;
  }

  function getActiveForControlled(roomId: string, controlledParticipantId: string): RemoteControlSession | undefined {
    return [...sessions.values()].find(
      (s) =>
        s.roomId === roomId &&
        s.controlled.participantId === controlledParticipantId &&
        (s.state === 'pending' || s.state === 'accepted' || s.state === 'active'),
    );
  }

  function getPendingByPair(
    roomId: string,
    requesterId: string,
    controlledId: string,
  ): RemoteControlSession | undefined {
    return [...sessions.values()].find(
      (s) =>
        s.roomId === roomId &&
        s.requester.participantId === requesterId &&
        s.controlled.participantId === controlledId &&
        s.state === 'pending',
    );
  }

  function expirePending(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (!session || session.state !== 'pending') return;
    endSession(session, 'expired', 'REMOTE_CONTROL_REJECTED');
  }

  function endSession(
    session: RemoteControlSession,
    reason: string,
    protocol: 'REMOTE_CONTROL_STOPPED' | 'REMOTE_CONTROL_REVOKED' | 'REMOTE_CONTROL_REJECTED',
  ): void {
    if (session.state === 'ended' || session.state === 'revoked' || session.state === 'stopping') {
      return;
    }
    session.state = reason === 'revoked' ? 'revoked' : 'ended';
    session.endedAt = now();
    session.endReason = reason;
    const timer = timers.get(session.sessionId);
    if (timer) clearTimeout(timer);
    timers.delete(session.sessionId);
    rate.delete(session.sessionId);
    processedSeq.delete(session.sessionId);
    ephemeralRate.delete(`cursor:${session.sessionId}`);
    ephemeralRate.delete(`ui:${session.sessionId}`);
    ephemeralRate.delete(`draft:${session.sessionId}`);

    const event =
      protocol === 'REMOTE_CONTROL_REJECTED'
        ? 'remote-control:rejected'
        : protocol === 'REMOTE_CONTROL_REVOKED'
          ? 'remote-control:revoked'
          : 'remote-control:stopped';

    const payload = {
      type: protocol,
      sessionId: session.sessionId,
      roomId: session.roomId,
      reason,
      requesterId: session.requester.participantId,
      controlledUserId: session.controlled.participantId,
    };
    deps.transport.emitToSocket(session.requester.socketId, event, payload);
    deps.transport.emitToSocket(session.controlled.socketId, event, payload);
    deps.transport.emitToSocket(session.requester.socketId, 'remote-control:ended', payload);
    deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:ended', payload);

    audit({
      action: 'RC_SESSION_ENDED',
      sessionId: session.sessionId,
      roomId: session.roomId,
      metadata: { reason, protocol },
    });
    pushHistory(session, { action: 'RC_SESSION_ENDED', result: 'ok', metadata: { reason } });
  }

  function requireLive(sessionId: string): RemoteControlSession {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new RemoteControlError('Control session not found.', 'SESSION_NOT_FOUND', 404);
    }
    if (session.state === 'ended' || session.state === 'revoked' || session.state === 'stopping') {
      throw new RemoteControlError('Control session has ended.', 'SESSION_ENDED', 409);
    }
    if (now() - session.createdAt > MAX_SESSION_MS) {
      endSession(session, 'ttl', 'REMOTE_CONTROL_STOPPED');
      throw new RemoteControlError('Control session has ended.', 'SESSION_ENDED', 409);
    }
    return session;
  }

  return {
    getSession(sessionId: string): RemoteControlSession | undefined {
      return sessions.get(sessionId);
    },
    listAudits(): RemoteControlAuditEvent[] {
      return [...audits];
    },
    /** Test helper */
    _sessions: sessions,

    requestControl(input: {
      roomId: string;
      requesterParticipantId: string;
      requesterUserId: string;
      targetParticipantId: string;
    }): RemoteControlSession {
    const { requester, target } = assertSameMeetingMembership(
      deps.presence,
      input.roomId,
      input.requesterParticipantId,
      input.targetParticipantId,
    );
      if (requester.userId !== input.requesterUserId) {
        throw new RemoteControlError('Requester identity mismatch.', 'IMPERSONATION', 403);
      }

      const existingPair = getPendingByPair(input.roomId, requester.participantId, target.participantId);
      if (existingPair) {
        return existingPair;
      }

      const busy = getActiveForControlled(input.roomId, target.participantId);
      if (busy) {
        throw new RemoteControlError(
          'This participant already has a control request or session.',
          'SESSION_BUSY',
          409,
        );
      }

      const session: RemoteControlSession = {
        sessionId: randomId(),
        roomId: input.roomId,
        requester,
        controlled: target,
        state: 'pending',
        permissions: DEFAULT_CONTROL_PERMISSIONS,
        lastSeq: 0,
        createdAt: now(),
      };
      sessions.set(session.sessionId, session);
      processedSeq.set(session.sessionId, new Set());
      timers.set(
        session.sessionId,
        setTimeout(() => expirePending(session.sessionId), pendingTtlMs),
      );

      deps.transport.emitToSocket(target.socketId, 'remote-control:request', {
        type: 'REMOTE_CONTROL_REQUEST',
        sessionId: session.sessionId,
        roomId: session.roomId,
        requesterId: requester.participantId,
        requesterName: requester.name,
        controlledUserId: target.participantId,
        permissions: session.permissions,
        timestamp: now(),
      });

      audit({
        action: 'RC_REQUEST_CREATED',
        sessionId: session.sessionId,
        roomId: session.roomId,
        actorParticipantId: requester.participantId,
      });

      return session;
    },

    respond(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      accept: boolean;
    }): RemoteControlSession {
      const session = requireLive(input.sessionId);
      if (session.state !== 'pending') {
        throw new RemoteControlError('This request is no longer pending.', 'NOT_PENDING', 409);
      }
      if (session.controlled.participantId !== input.actorParticipantId) {
        throw new RemoteControlError('Only the requested participant can respond.', 'FORBIDDEN', 403);
      }
      if (session.controlled.userId !== input.actorUserId) {
        throw new RemoteControlError('Controlled identity mismatch.', 'IMPERSONATION', 403);
      }
      if (!deps.presence.isInRoom(session.roomId, session.requester.participantId)
        || !deps.presence.isInRoom(session.roomId, session.controlled.participantId)) {
        endSession(session, 'participant-left', 'REMOTE_CONTROL_STOPPED');
        throw new RemoteControlError('A participant left the meeting.', 'NOT_IN_ROOM', 403);
      }

      if (!input.accept) {
        audit({
          action: 'RC_REQUEST_REJECTED',
          sessionId: session.sessionId,
          roomId: session.roomId,
          actorParticipantId: input.actorParticipantId,
        });
        endSession(session, 'rejected', 'REMOTE_CONTROL_REJECTED');
        return session;
      }

      session.state = 'active';
      session.acceptedAt = now();
      const started = {
        type: 'REMOTE_CONTROL_STARTED' as const,
        sessionId: session.sessionId,
        roomId: session.roomId,
        requesterId: session.requester.participantId,
        requesterName: session.requester.name,
        controlledUserId: session.controlled.participantId,
        controlledName: session.controlled.name,
        permissions: session.permissions,
        timestamp: now(),
      };
      deps.transport.emitToSocket(session.requester.socketId, 'remote-control:started', started);
      deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:started', started);
      audit({
        action: 'RC_REQUEST_ACCEPTED',
        sessionId: session.sessionId,
        roomId: session.roomId,
        actorParticipantId: input.actorParticipantId,
      });
      audit({
        action: 'RC_SESSION_STARTED',
        sessionId: session.sessionId,
        roomId: session.roomId,
      });
      pushHistory(session, { action: 'RC_SESSION_STARTED', result: 'ok' });
      return session;
    },

    dispatchAction(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      seq: number;
      actionType: RemoteUiCommand;
      payload: Record<string, unknown>;
    }): RemoteControlActionEnvelope | 'duplicate' {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      if (session.requester.participantId !== input.actorParticipantId
        || session.requester.userId !== input.actorUserId) {
        audit({
          action: 'RC_COMMAND_REJECTED',
          sessionId: session.sessionId,
          actorParticipantId: input.actorParticipantId,
          metadata: { reason: 'unauthorized-actor', actionType: input.actionType },
        });
        throw new RemoteControlError('You are not the controller for this session.', 'FORBIDDEN', 403);
      }
      if (!deps.presence.isInRoom(session.roomId, session.requester.participantId)
        || !deps.presence.isInRoom(session.roomId, session.controlled.participantId)) {
        endSession(session, 'participant-left', 'REMOTE_CONTROL_STOPPED');
        throw new RemoteControlError('A participant left the meeting.', 'NOT_IN_ROOM', 403);
      }
      if (!session.permissions.includes(input.actionType)) {
        audit({
          action: 'RC_COMMAND_REJECTED',
          sessionId: session.sessionId,
          metadata: { reason: 'command-not-allowed', actionType: input.actionType },
        });
        throw new RemoteControlError('This command is not permitted.', 'COMMAND_NOT_ALLOWED', 403);
      }

      const seen = processedSeq.get(session.sessionId)!;
      if (seen.has(input.seq)) {
        return 'duplicate';
      }
      if (input.seq !== session.lastSeq + 1) {
        audit({
          action: 'RC_COMMAND_REJECTED',
          sessionId: session.sessionId,
          metadata: { reason: 'bad-seq', seq: input.seq, expected: session.lastSeq + 1 },
        });
        throw new RemoteControlError('Invalid command sequence.', 'BAD_SEQUENCE', 400);
      }

      const t = now();
      const window = rate.get(session.sessionId) ?? { count: 0, windowStart: t };
      if (t - window.windowStart > ACTION_RATE_WINDOW_MS) {
        window.count = 0;
        window.windowStart = t;
      }
      window.count += 1;
      rate.set(session.sessionId, window);
      if (window.count > ACTION_RATE_LIMIT) {
        throw new RemoteControlError('Too many control commands.', 'RATE_LIMITED', 429);
      }

      let payload: Record<string, unknown>;
      try {
        payload = parseActionPayload(input.actionType, input.payload);
      } catch {
        throw new RemoteControlError('Invalid command payload.', 'INVALID_PAYLOAD', 400);
      }

      session.lastSeq = input.seq;
      seen.add(input.seq);

      const envelope: RemoteControlActionEnvelope = {
        type: 'REMOTE_CONTROL_ACTION',
        sessionId: session.sessionId,
        requesterId: session.requester.participantId,
        controlledUserId: session.controlled.participantId,
        actionType: input.actionType,
        payload,
        timestamp: t,
        seq: input.seq,
        authorization: { roomId: session.roomId, permissions: session.permissions },
        attribution: {
          initiatorId: session.requester.participantId,
          initiatorName: session.requester.name,
          executorId: session.controlled.participantId,
          executorName: session.controlled.name,
        },
      };

      deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:action', envelope);
      audit({
        action: 'RC_COMMAND_FORWARDED',
        sessionId: session.sessionId,
        roomId: session.roomId,
        actorParticipantId: session.requester.participantId,
        metadata: {
          actionType: input.actionType,
          seq: input.seq,
          initiatorId: session.requester.participantId,
          executorId: session.controlled.participantId,
        },
      });
      pushHistory(session, {
        action: input.actionType,
        result: 'ok',
        seq: input.seq,
        metadata: { initiator: session.requester.name, executor: session.controlled.name },
      });
      return envelope;
    },

    stop(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
    }): void {
      const session = requireLive(input.sessionId);
      const isRequester =
        session.requester.participantId === input.actorParticipantId
        && session.requester.userId === input.actorUserId;
      const isControlled =
        session.controlled.participantId === input.actorParticipantId
        && session.controlled.userId === input.actorUserId;
      if (!isRequester && !isControlled) {
        throw new RemoteControlError('Not a party to this session.', 'FORBIDDEN', 403);
      }
      const revoked = isControlled;
      audit({
        action: revoked ? 'RC_REVOKED' : 'RC_STOPPED',
        sessionId: session.sessionId,
        roomId: session.roomId,
        actorParticipantId: input.actorParticipantId,
      });
      endSession(session, revoked ? 'revoked' : 'stopped', revoked ? 'REMOTE_CONTROL_REVOKED' : 'REMOTE_CONTROL_STOPPED');
    },

    forwardCursor(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      x: number;
      y: number;
      visible: boolean;
    }): void {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      const isRequester =
        session.requester.participantId === input.actorParticipantId
        && session.requester.userId === input.actorUserId;
      const isControlled =
        session.controlled.participantId === input.actorParticipantId
        && session.controlled.userId === input.actorUserId;
      if (!isRequester && !isControlled) {
        throw new RemoteControlError('Not a party to this session.', 'FORBIDDEN', 403);
      }
      if (overRate(`cursor:${session.sessionId}`, CURSOR_RATE_LIMIT, ACTION_RATE_WINDOW_MS)) {
        return;
      }
      const target = isRequester ? session.controlled.socketId : session.requester.socketId;
      const name = isRequester ? session.requester.name : session.controlled.name;
      deps.transport.emitToSocket(target, 'remote-control:cursor', {
        type: 'REMOTE_CONTROL_CURSOR',
        sessionId: session.sessionId,
        x: input.x,
        y: input.y,
        visible: input.visible,
        source: isRequester ? 'controller' : 'controlled',
        label: name,
      });
    },

    forwardUiState(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      state: ControlledUiState;
    }): void {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      if (
        session.controlled.participantId !== input.actorParticipantId
        || session.controlled.userId !== input.actorUserId
      ) {
        throw new RemoteControlError('Only the controlled participant can publish UI state.', 'FORBIDDEN', 403);
      }
      if (overRate(`ui:${session.sessionId}`, UI_STATE_RATE_LIMIT, ACTION_RATE_WINDOW_MS)) {
        return;
      }
      deps.transport.emitToSocket(session.requester.socketId, 'remote-control:ui-state', {
        type: 'REMOTE_CONTROL_UI_STATE',
        sessionId: session.sessionId,
        state: input.state,
      });
    },

    forwardDraft(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      chatDraft: string;
    }): void {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      if (
        session.requester.participantId !== input.actorParticipantId
        || session.requester.userId !== input.actorUserId
      ) {
        throw new RemoteControlError('Only the controller can push chat drafts.', 'FORBIDDEN', 403);
      }
      if (overRate(`draft:${session.sessionId}`, DRAFT_RATE_LIMIT, ACTION_RATE_WINDOW_MS)) {
        return;
      }
      deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:draft', {
        type: 'REMOTE_CONTROL_DRAFT',
        sessionId: session.sessionId,
        chatDraft: input.chatDraft,
      });
    },

    switchView(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
      view: 'self' | 'remote';
    }): void {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      if (
        session.requester.participantId !== input.actorParticipantId
        || session.requester.userId !== input.actorUserId
      ) {
        throw new RemoteControlError('Only the controller can switch views.', 'FORBIDDEN', 403);
      }
      audit({
        action: 'RC_VIEW_SWITCHED',
        sessionId: session.sessionId,
        roomId: session.roomId,
        actorParticipantId: input.actorParticipantId,
        metadata: { view: input.view },
      });
      pushHistory(session, { action: 'RC_VIEW_SWITCHED', result: 'ok', metadata: { view: input.view } });
    },

    listHistory(sessionId: string): RemoteControlHistoryEvent[] {
      return [...(history.get(sessionId) ?? [])];
    },

    requestSnapshot(input: {
      sessionId: string;
      actorParticipantId: string;
      actorUserId: string;
    }): void {
      const session = requireLive(input.sessionId);
      if (session.state !== 'active') {
        throw new RemoteControlError('Control is not active.', 'NOT_ACTIVE', 409);
      }
      if (
        session.requester.participantId !== input.actorParticipantId
        || session.requester.userId !== input.actorUserId
      ) {
        throw new RemoteControlError('Only the controller can request a UI snapshot.', 'FORBIDDEN', 403);
      }
      deps.transport.emitToSocket(session.controlled.socketId, 'remote-control:sync', {
        type: 'REMOTE_CONTROL_UI_STATE',
        sessionId: session.sessionId,
      });
    },

    onParticipantLeft(roomId: string, participantId: string): void {
      for (const session of sessions.values()) {
        if (session.roomId !== roomId) continue;
        if (session.state === 'ended' || session.state === 'revoked') continue;
        if (
          session.requester.participantId === participantId
          || session.controlled.participantId === participantId
        ) {
          audit({
            action: 'RC_DISCONNECT',
            sessionId: session.sessionId,
            roomId,
            actorParticipantId: participantId,
          });
          endSession(session, 'participant-left', 'REMOTE_CONTROL_STOPPED');
        }
      }
    },

    dispose(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}

export type RemoteControlService = ReturnType<typeof createRemoteControlService>;

export { RemoteControlError };
