import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import {
  DtlsParameters,
  RtpParameters,
  RtpCapabilities,
  MediaKind,
} from 'mediasoup/types';
import { meetingsService } from '../../modules/meetings/services/meetings.service';
import { Meeting } from '../../database/models/Meeting.model';
import {
  onParticipantJoin,
  onParticipantLeave,
  resolveWorkspaceId,
  endLiveMeeting,
} from '../../modules/meetings/meetings.metering';
import {
  endMeetingIfDurationExpired,
} from '../../modules/meetings/meeting-duration.job';
import { getMeetingJoinBlock } from '../../modules/meetings/meeting-joinability';
import { assertCanAccessMeeting } from '../../modules/meetings/services/meeting-join-authz.service';
import { isAppError } from '../../shared/errors/AppError';
import { workspaceRepository } from '../../modules/workspace/workspace.repository';
import type { WorkspaceRole } from '../../modules/workspace/workspace.types';
import { mediaEngine } from '../../media/media-engine';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import {
  validatePayload,
  JoinRoomSchema,
  LeaveRoomSchema,
  WaitingAdmitSchema,
  WaitingDenySchema,
  GetRoomStateSchema,
  CreateTransportSchema,
  ConnectTransportSchema,
  ProduceSchema,
  ConsumeSchema,
  ResumeConsumerSchema,
  PauseConsumerSchema,
  CloseConsumerSchema,
  CloseProducerSchema,
  PauseProducerSchema,
  ResumeProducerSchema,
  RestartIceSchema,
  SetPreferredLayersSchema,
  SetConsumerPrioritySchema,
  GetPeerDiagnosticsSchema,
  ReplaceTrackSchema,
  StartRecordingSchema,
  StopRecordingSchema,
  GetRecordingStatusSchema,
} from '../../shared/validation/socket.schemas';
import type { TransportDirection, ProducerAppData } from '../../media/media.types';
import { participantManager } from '../../media/managers/participant-manager';
import { remoteControlService } from '../../modules/remote-control';
import { whiteboardRoomService, onWhiteboardPeerLeft } from '../../modules/whiteboard';
import {
  addWaitingRequest,
  findHostSockets,
  listWaiting,
  removeWaitingBySocket,
  removeWaitingRequest,
} from '../waiting-room';
import {
  evaluateAdmission,
  markAdmitted,
  markDenied,
} from '../../modules/meetings/services/meeting-admission.service';
import { buildAdmissionIdentityKey } from '../../database/models/MeetingAdmission.model';
import {
  cancelSoftDisconnect,
  takeSoftDisconnect,
} from '../soft-disconnect';

type Callback = (res: unknown) => void;

function validationError(callback: Callback, message: string) {
  metrics.validationFailures.inc();
  callback({ error: message, code: 'VALIDATION_ERROR' });
}

function authzError(callback: Callback, message = 'Forbidden') {
  callback({ error: message, code: 'FORBIDDEN' });
}

// ── Handler registration ──────────────────────────────────────────────────────

export const registerMediaHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user as {
    userId: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
    isGuest?: boolean;
    guestRoomId?: string;
    guestEmail?: string;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // join-room (non-hosts wait for host admit)
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('join-room', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(JoinRoomSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, displayName } = v.data;

    try {
      // Same-socket media rebuild (ICE/network recovery): drop the old peer and continue.
      // Soft-disconnect resumes use a new socket and never hit this branch.
      if (socket.data.currentRoom) {
        const prev = socket.data.currentRoom as {
          roomId: string;
          participantId: string;
        };
        if (prev.roomId === roomId && prev.participantId) {
          try {
            mediaEngine.removePeer(roomId, prev.participantId);
            socket.to(roomId).emit('peer-left', {
              participantId: prev.participantId,
              reason: 'reconnect',
            });
            socket.leave(roomId);
          } catch (err) {
            logger.warn('Failed to clear same-socket peer before rejoin', {
              roomId,
              participantId: prev.participantId,
              err: err instanceof Error ? err.message : String(err),
            });
          }
          delete socket.data.currentRoom;
        } else {
          return callback({ error: 'Already in a room. Leave first.', code: 'ALREADY_JOINED' });
        }
      }
      if (socket.data.waitingRequest) {
        return callback({ error: 'Already waiting to join.', code: 'ALREADY_WAITING' });
      }

      const meeting = await meetingsService.findByRoomId(roomId);
      const workspaceMeeting = await Meeting.findOne({ roomId });
      if (workspaceMeeting) {
        const block = getMeetingJoinBlock(workspaceMeeting);
        if (block?.shouldMarkEnded && workspaceMeeting.status !== 'ended') {
          workspaceMeeting.status = 'ended';
          workspaceMeeting.endedAt = new Date();
          await workspaceMeeting.save();
          if (block.code === 'MEETING_ENDED') {
            await endMeetingIfDurationExpired(io, roomId).catch(() => false);
          }
        }
        if (block) {
          return callback({ error: block.message, code: block.code });
        }
      }

      const creatorId = meeting?.createdBy ? String(meeting.createdBy) : null;
      const isHost = Boolean(creatorId && creatorId === user.userId);
      const name = (displayName?.trim() || user.name || 'Guest').slice(0, 80);
      const isGuest = Boolean(user.isGuest) || user.userId.startsWith('guest_');

      if (isGuest && user.guestRoomId && user.guestRoomId !== roomId) {
        return callback({
          error: 'This guest session is not valid for this meeting.',
          code: 'GUEST_ROOM_MISMATCH',
        });
      }

      if (workspaceMeeting) {
        try {
          let workspaceRole: WorkspaceRole | null = null;
          if (
            !isGuest &&
            workspaceMeeting.workspaceId &&
            Types.ObjectId.isValid(String(workspaceMeeting.workspaceId))
          ) {
            const member = await workspaceRepository.findMember(
              String(workspaceMeeting.workspaceId),
              user.userId,
            );
            workspaceRole = member?.role ?? null;
          }
          await assertCanAccessMeeting({
            meeting: workspaceMeeting,
            joinerUserId: user.userId,
            isGuest,
            guestEmail: user.guestEmail || user.email || null,
            workspaceRole,
          });
        } catch (err) {
          const message = isAppError(err)
            ? err.message
            : 'You are not allowed to join this meeting.';
          const code = isAppError(err) ? err.code : 'JOIN_FORBIDDEN';
          return callback({ error: message, code });
        }
      }

      // Guests / waiting-room / join-before-host members need host admit — unless already admitted.
      const hostInRoom = Boolean(
        creatorId &&
          mediaEngine.getPeersInRoom(roomId).some((p) => p.userId === creatorId),
      );
      const joinBeforeHost = Boolean(workspaceMeeting?.settings?.joinBeforeHost);
      const waitingRoomEnabled =
        Boolean(workspaceMeeting?.settings?.waitingRoom) ||
        (!joinBeforeHost && !isHost && !hostInRoom);
      const meetingId = workspaceMeeting?._id ? String(workspaceMeeting._id) : '';
      const guestEmail = user.guestEmail || user.email || null;

      if (meetingId) {
        const decision = await evaluateAdmission({
          meetingId,
          roomId,
          userId: user.userId,
          isGuest,
          email: guestEmail,
          isHost,
          waitingRoomEnabled,
        });
        if (
          workspaceMeeting?.settings?.locked &&
          !isHost &&
          decision.reason !== 'previously_admitted' &&
          decision.reason !== 'host'
        ) {
          return callback({
            error: 'This meeting is locked by the host.',
            code: 'MEETING_LOCKED',
          });
        }
        if (!decision.allow && decision.code !== 'WAITING_REQUIRED') {
          return callback({ error: decision.reason, code: decision.code });
        }
        if (!decision.allow && decision.code === 'WAITING_REQUIRED') {
          const requestId = randomUUID();
          const waiting = {
            requestId,
            roomId,
            socketId: socket.id,
            userId: user.userId,
            name,
            avatarUrl: user.avatarUrl ?? null,
            avatarColor: user.avatarColor ?? null,
            isGuest,
            email: guestEmail,
            requestedAt: Date.now(),
          };
          addWaitingRequest(waiting);
          socket.data.waitingRequest = { roomId, requestId, name };

          for (const hostSock of findHostSockets(io, roomId, creatorId ?? '')) {
            hostSock.emit('waiting-join-request', waiting);
          }

          logger.info('Peer waiting for admit', {
            roomId,
            requestId,
            userId: user.userId,
            isGuest,
            waitingRoomEnabled,
          });
          return callback({
            status: 'waiting',
            requestId,
            message: decision.reason,
          });
        }
      } else if (!isHost && (isGuest || waitingRoomEnabled)) {
        // Instant / non-workspace room without Meeting doc — keep legacy wait for guests.
        const requestId = randomUUID();
        const waiting = {
          requestId,
          roomId,
          socketId: socket.id,
          userId: user.userId,
          name,
          avatarUrl: user.avatarUrl ?? null,
          avatarColor: user.avatarColor ?? null,
          isGuest,
          requestedAt: Date.now(),
        };
        addWaitingRequest(waiting);
        socket.data.waitingRequest = { roomId, requestId, name };
        for (const hostSock of findHostSockets(io, roomId, creatorId ?? '')) {
          hostSock.emit('waiting-join-request', waiting);
        }
        return callback({
          status: 'waiting',
          requestId,
          message: 'Waiting for the host to let you in',
        });
      }

      const joinResult = await _completeJoin(io, socket, {
        roomId,
        userId: user.userId,
        name,
        avatarUrl: user.avatarUrl ?? null,
        avatarColor: user.avatarColor ?? null,
        creatorId,
        muteOnEntry: Boolean(workspaceMeeting?.settings?.muteOnEntry),
        isGuest,
        email: guestEmail,
        meetingId: meetingId || null,
        reconnect: true,
      });
      callback(joinResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('join-room error', { err: msg, roomId, userId: user.userId });
      callback({ error: msg });
    }
  });

  socket.on('admit-waiting', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WaitingAdmitSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, requestId } = v.data;

    try {
      const current = socket.data.currentRoom as { roomId: string } | undefined;
      if (!current || current.roomId !== roomId) {
        return callback?.({ error: 'Not in this room', code: 'NOT_IN_ROOM' });
      }
      const meeting = await meetingsService.findByRoomId(roomId);
      const creatorId = meeting?.createdBy ? String(meeting.createdBy) : null;
      if (!creatorId || creatorId !== user.userId) {
        return callback?.({ error: 'Only the host can admit participants.', code: 'FORBIDDEN' });
      }

      const waiting = removeWaitingRequest(roomId, requestId);
      if (!waiting) return callback?.({ error: 'Request not found', code: 'NOT_FOUND' });

      const target = io.sockets.sockets.get(waiting.socketId);
      if (!target) return callback?.({ error: 'Participant left the lobby', code: 'GONE' });

      try {
        const workspaceMeeting = await Meeting.findOne({ roomId }).lean();
        const meetingId = workspaceMeeting?._id ? String(workspaceMeeting._id) : '';
        const waitingEmail =
          (waiting as { email?: string | null }).email ||
          (target.data.user as { guestEmail?: string; email?: string } | undefined)?.guestEmail ||
          (target.data.user as { email?: string } | undefined)?.email ||
          null;
        if (meetingId) {
          await markAdmitted({
            meetingId,
            roomId,
            userId: waiting.userId,
            isGuest: waiting.isGuest,
            email: waitingEmail,
            displayName: waiting.name,
            admittedBy: user.userId,
          });
        }
        const joinResult = await _completeJoin(io, target, {
          roomId,
          userId: waiting.userId,
          name: waiting.name,
          avatarUrl: waiting.avatarUrl ?? null,
          avatarColor: waiting.avatarColor ?? null,
          creatorId,
          muteOnEntry: Boolean(workspaceMeeting?.settings?.muteOnEntry),
          isGuest: waiting.isGuest,
          email: waitingEmail,
          meetingId: meetingId || null,
          admittedBy: user.userId,
          reconnect: false,
        });
        delete target.data.waitingRequest;
        target.emit('waiting-admitted', joinResult);
        io.to(roomId).emit('waiting-request-resolved', { requestId, admitted: true });
        callback?.({ success: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        target.emit('waiting-denied', { reason: msg });
        callback?.({ error: msg });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('admit-waiting error', { err: msg });
      callback?.({ error: msg });
    }
  });

  socket.on('deny-waiting', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(WaitingDenySchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, requestId } = v.data;

    try {
      const current = socket.data.currentRoom as { roomId: string } | undefined;
      if (!current || current.roomId !== roomId) {
        return callback?.({ error: 'Not in this room', code: 'NOT_IN_ROOM' });
      }
      const meeting = await meetingsService.findByRoomId(roomId);
      const creatorId = meeting?.createdBy ? String(meeting.createdBy) : null;
      if (!creatorId || creatorId !== user.userId) {
        return callback?.({ error: 'Only the host can deny participants.', code: 'FORBIDDEN' });
      }

      const waiting = removeWaitingRequest(roomId, requestId);
      if (!waiting) return callback?.({ error: 'Request not found', code: 'NOT_FOUND' });

      const meetingDoc = await Meeting.findOne({ roomId }).select('_id').lean();
      if (meetingDoc) {
        await markDenied({
          meetingId: String(meetingDoc._id),
          roomId,
          userId: waiting.userId,
          isGuest: waiting.isGuest,
          email: (waiting as { email?: string | null }).email || null,
          revokedBy: user.userId,
        });
      }

      const target = io.sockets.sockets.get(waiting.socketId);
      if (target) {
        delete target.data.waitingRequest;
        target.emit('waiting-denied', { reason: 'Host declined your request to join' });
      }
      io.to(roomId).emit('waiting-request-resolved', { requestId, admitted: false });
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      callback?.({ error: msg });
    }
  });

  socket.on('list-waiting', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(LeaveRoomSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId } = v.data;
    const current = socket.data.currentRoom as { roomId: string } | undefined;
    if (!current || current.roomId !== roomId) {
      return callback?.({ error: 'Not in this room', code: 'NOT_IN_ROOM' });
    }
    callback?.({ waiting: listWaiting(roomId) });
  });

  socket.on('lock-meeting', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(LeaveRoomSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId } = v.data;
    try {
      const current = socket.data.currentRoom as { roomId: string } | undefined;
      if (!current || current.roomId !== roomId) {
        return callback?.({ error: 'Not in this room', code: 'NOT_IN_ROOM' });
      }
      const meeting = await meetingsService.findByRoomId(roomId);
      const creatorId = meeting?.createdBy ? String(meeting.createdBy) : null;
      if (!creatorId || creatorId !== user.userId) {
        return callback?.({ error: 'Only the host can lock the meeting.', code: 'FORBIDDEN' });
      }
      await Meeting.updateOne({ roomId }, { $set: { 'settings.locked': true } });
      io.to(roomId).emit('meeting-lock-changed', { roomId, locked: true });
      callback?.({ success: true, locked: true });
    } catch (err: unknown) {
      callback?.({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  socket.on('unlock-meeting', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(LeaveRoomSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId } = v.data;
    try {
      const current = socket.data.currentRoom as { roomId: string } | undefined;
      if (!current || current.roomId !== roomId) {
        return callback?.({ error: 'Not in this room', code: 'NOT_IN_ROOM' });
      }
      const meeting = await meetingsService.findByRoomId(roomId);
      const creatorId = meeting?.createdBy ? String(meeting.createdBy) : null;
      if (!creatorId || creatorId !== user.userId) {
        return callback?.({ error: 'Only the host can unlock the meeting.', code: 'FORBIDDEN' });
      }
      await Meeting.updateOne({ roomId }, { $set: { 'settings.locked': false } });
      io.to(roomId).emit('meeting-lock-changed', { roomId, locked: false });
      callback?.({ success: true, locked: false });
    } catch (err: unknown) {
      callback?.({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // leave-room
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('leave-room', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(LeaveRoomSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const waiting = removeWaitingBySocket(socket.id);
      if (waiting) {
        delete socket.data.waitingRequest;
        io.to(roomId).emit('waiting-request-resolved', { requestId: waiting.requestId, admitted: false });
        return callback?.({ success: true });
      }

      const { participantId } = socket.data.currentRoom ?? {};
      if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });

      // Explicit leave — cancel any soft-disconnect and hard-clean immediately.
      const identityKey = buildAdmissionIdentityKey({
        userId: user.userId,
        isGuest: Boolean(user.isGuest) || user.userId.startsWith('guest_'),
        email: user.guestEmail || user.email || null,
      });
      cancelSoftDisconnect(roomId, identityKey);
      socket.data.softDisconnect = false;
      _cleanupPeer(io, socket, roomId, participantId);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('leave-room error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // Host ends the live meeting for everyone (leave alone does not end it).
  socket.on('end-meeting', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(LeaveRoomSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId } = v.data;
    try {
      // Only the meeting creator (host) may end the call
      const meeting = await Meeting.findOne({ roomId }).lean();
      if (!meeting || String(meeting.createdBy) !== user.userId) {
        return callback?.({ error: 'Only the host can end this meeting.', code: 'FORBIDDEN' });
      }
      const result = await endLiveMeeting({ roomId, userId: user.userId, hostOnly: true });
      if (!result.ended) {
        return callback?.({ error: 'Only the host can end this meeting.', code: 'FORBIDDEN' });
      }
      io.to(roomId).emit('meeting-ended', { roomId, endedBy: user.userId });
      const { participantId } = socket.data.currentRoom ?? {};
      if (participantId) _cleanupPeer(io, socket, roomId, participantId);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('end-meeting error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // get-room-state
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('get-room-state', (payload: unknown, callback: Callback) => {
    const v = validatePayload(GetRoomStateSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const myParticipantId = socket.data.currentRoom?.participantId;

      const peers = mediaEngine
        .getPeersInRoom(roomId)
        .filter(p => p.id !== myParticipantId)
        .map(p => ({
          id: p.id,
          name: p.name,
          userId: p.userId,
          identityKey: p.identityKey ?? null,
          email: p.email ?? null,
          avatarUrl: p.avatarUrl ?? null,
          avatarColor: p.avatarColor ?? null,
        }));

      const producers = mediaEngine
        .getAllProducersInRoom(roomId)
        .map(({ producerId, participantId, kind, source, paused }) => ({
          producerId,
          participantId,
          kind,
          appData: { source },
          paused: paused ?? false,
        }));

      callback({ peers, producers });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('get-room-state error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create-webrtc-transport
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('create-webrtc-transport', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(CreateTransportSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, direction } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      const result = await mediaEngine.createTransport(
        roomId,
        participantId,
        direction as TransportDirection,
      );

      callback({ params: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('create-webrtc-transport error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // connect-transport
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('connect-transport', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(ConnectTransportSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, transportId, dtlsParameters } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsTransport(roomId, participantId, transportId)) {
        return authzError(callback, 'Transport not owned by you');
      }

      await mediaEngine.connectTransport(
        roomId,
        participantId,
        transportId,
        dtlsParameters as DtlsParameters,
      );

      callback({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('connect-transport error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // restart-ice  (client-requested)
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('restart-ice', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(RestartIceSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, transportId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsTransport(roomId, participantId, transportId)) {
        return authzError(callback, 'Transport not owned by you');
      }

      const iceParameters = await mediaEngine.restartIce(roomId, participantId, transportId);
      callback({ iceParameters });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('restart-ice error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // produce
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('produce', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(ProduceSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, transportId, kind, rtpParameters, appData } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsTransport(roomId, participantId, transportId)) {
        return authzError(callback, 'Transport not owned by you');
      }

      const source = (appData as { source?: string } | undefined)?.source;
      if (source === 'screen') {
        for (const peer of mediaEngine.getPeersInRoom(roomId)) {
          for (const producer of peer.producers.values()) {
            const prodSource = (producer.appData as { source?: string } | undefined)?.source;
            if (prodSource === 'screen' && !producer.closed) {
              return callback({
                error: 'Someone else is already sharing their screen.',
                code: 'SCREEN_SHARE_ACTIVE',
              });
            }
          }
        }
      }

      const producerId = await mediaEngine.produce(
        roomId,
        participantId,
        transportId,
        kind as MediaKind,
        rtpParameters as RtpParameters,
        (appData ?? {}) as Partial<ProducerAppData>,
      );

      callback({ id: producerId });

      // Notify others in the room so they can create consumers
      socket.to(roomId).emit('new-producer', {
        producerId,
        participantId,
        kind,
        appData: appData ?? {},
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('produce error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // consume
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('consume', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(ConsumeSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, transportId, producerId, rtpCapabilities } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsTransport(roomId, participantId, transportId)) {
        return authzError(callback, 'Transport not owned by you');
      }

      const result = await mediaEngine.consume(
        roomId,
        participantId,
        transportId,
        producerId,
        rtpCapabilities as RtpCapabilities,
      );

      callback({ params: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('consume error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // resume-consumer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('resume-consumer', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(ResumeConsumerSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId, consumerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsConsumer(roomId, participantId, consumerId)) {
        return authzError(callback, 'Consumer not owned by you');
      }

      await mediaEngine.resumeConsumer(roomId, participantId, consumerId);
      callback({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('resume-consumer error', { err: msg });
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // pause-consumer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('pause-consumer', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(PauseConsumerSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, consumerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsConsumer(roomId, participantId, consumerId)) {
        return callback && authzError(callback, 'Consumer not owned by you');
      }

      await mediaEngine.pauseConsumer(roomId, participantId, consumerId);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('pause-consumer error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // close-consumer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('close-consumer', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(CloseConsumerSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, consumerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsConsumer(roomId, participantId, consumerId)) {
        return callback && authzError(callback, 'Consumer not owned by you');
      }

      mediaEngine.closeConsumer(roomId, participantId, consumerId);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('close-consumer error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // close-producer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('close-producer', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(CloseProducerSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, producerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsProducer(roomId, participantId, producerId)) {
        return callback && authzError(callback, 'Producer not owned by you');
      }

      const meta = _producerMeta(roomId, participantId, producerId);
      mediaEngine.closeProducer(roomId, participantId, producerId);
      socket.to(roomId).emit('producer-closed', {
        participantId,
        producerId,
        source: meta?.source,
        kind: meta?.kind,
      });
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('close-producer error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // pause-producer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('pause-producer', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(PauseProducerSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, producerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsProducer(roomId, participantId, producerId)) {
        return callback && authzError(callback, 'Producer not owned by you');
      }

      const meta = _producerMeta(roomId, participantId, producerId);
      await mediaEngine.pauseProducer(roomId, participantId, producerId);
      socket.to(roomId).emit('producer-paused', {
        participantId,
        producerId,
        source: meta?.source,
        kind: meta?.kind,
      });
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('pause-producer error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // resume-producer
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('resume-producer', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(ResumeProducerSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, producerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsProducer(roomId, participantId, producerId)) {
        return callback && authzError(callback, 'Producer not owned by you');
      }

      const meta = _producerMeta(roomId, participantId, producerId);
      await mediaEngine.resumeProducer(roomId, participantId, producerId);
      socket.to(roomId).emit('producer-resumed', {
        participantId,
        producerId,
        source: meta?.source,
        kind: meta?.kind,
      });
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('resume-producer error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // set-preferred-layers  — bandwidth / quality management
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('set-preferred-layers', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(SetPreferredLayersSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, consumerId, spatialLayer, temporalLayer } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsConsumer(roomId, participantId, consumerId)) {
        return callback && authzError(callback, 'Consumer not owned by you');
      }

      await mediaEngine.setPreferredLayers(
        roomId, participantId, consumerId, spatialLayer, temporalLayer,
      );
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('set-preferred-layers error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // set-consumer-priority  — bandwidth allocation
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('set-consumer-priority', async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(SetConsumerPrioritySchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, consumerId, priority } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsConsumer(roomId, participantId, consumerId)) {
        return callback && authzError(callback, 'Consumer not owned by you');
      }

      await mediaEngine.setConsumerPriority(roomId, participantId, consumerId, priority);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('set-consumer-priority error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // replace-track  — seamless camera/screen-share track replacement
  //
  // In mediasoup, replaceTrack() is a client-side operation on the
  // mediasoup-client Producer object. The server only needs to know that
  // a replacement occurred for logging and diagnostics.
  // The client calls producer.replaceTrack({ track }) on its side,
  // then fires this event so the server can record the change.
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('replace-track', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(ReplaceTrackSchema, payload);
    if (!v.success) return callback && validationError(callback, v.error);
    const { roomId, producerId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      if (!mediaEngine.ownsProducer(roomId, participantId, producerId)) {
        return callback && authzError(callback, 'Producer not owned by you');
      }

      // replaceTrack is a client-side mediasoup operation; server acknowledges
      logger.info('Producer track replaced (client-side)', {
        roomId, participantId, producerId,
      });
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('replace-track error', { err: msg });
      callback?.({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // start-recording / stop-recording / get-recording-status
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('start-recording', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(StartRecordingSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      const info = await mediaEngine.startRecording(roomId, participantId);
      callback({ recording: true, info });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('start-recording error', { err: msg });
      callback({ error: msg });
    }
  });

  socket.on('stop-recording', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(StopRecordingSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      const info = await mediaEngine.stopRecording(roomId);
      callback({ recording: false, info });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('stop-recording error', { err: msg });
      callback({ error: msg });
    }
  });

  socket.on('get-recording-status', (payload: unknown, callback: Callback) => {
    const v = validatePayload(GetRecordingStatusSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      const info = mediaEngine.getRecordingInfo(roomId);
      callback({ recording: mediaEngine.isRecording(roomId), info });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      callback({ error: msg });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // get-peer-diagnostics  — internal debugging
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('get-peer-diagnostics', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(GetPeerDiagnosticsSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      const participantId = _assertInRoom(socket, roomId, callback);
      if (!participantId) return;

      const diagnostics = await mediaEngine.getPeerDiagnostics(roomId, participantId);
      callback({ diagnostics });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('get-peer-diagnostics error', { err: msg });
      callback({ error: msg });
    }
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Assert the socket is currently in the claimed room.
 * Returns participantId if valid, null otherwise (and calls callback).
 */
function _assertInRoom(
  socket: Socket,
  roomId: string,
  callback?: Callback,
): string | null {
  const current = socket.data.currentRoom as
    | { roomId: string; participantId: string }
    | undefined;

  if (!current || current.roomId !== roomId) {
    callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    return null;
  }
  return current.participantId;
}

function _producerMeta(
  roomId: string,
  participantId: string,
  producerId: string,
): { source: string; kind: MediaKind } | null {
  const producer = participantManager.getPeer(roomId, participantId)?.producers.get(producerId);
  if (!producer) return null;
  return {
    source: (producer.appData as ProducerAppData).source ?? 'camera',
    kind: producer.kind,
  };
}

async function _completeJoin(
  io: Server,
  socket: Socket,
  opts: {
    roomId: string;
    userId: string;
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    creatorId: string | null;
    muteOnEntry?: boolean;
    isGuest?: boolean;
    email?: string | null;
    meetingId?: string | null;
    admittedBy?: string;
    reconnect?: boolean;
  },
) {
  const {
    roomId,
    userId,
    name,
    avatarUrl,
    avatarColor,
    creatorId,
    muteOnEntry = false,
    isGuest = false,
    email = null,
    meetingId = null,
    admittedBy,
    reconnect: _reconnect = false,
  } = opts;
  void _reconnect;

  const identityKey = buildAdmissionIdentityKey({ userId, isGuest, email });
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

  // Replace any prior live peer for this identity (soft-disconnect pending OR
  // a leftover mediasoup peer). Prevents duplicate tiles when guest_* churns.
  const pending = takeSoftDisconnect(roomId, identityKey);
  const previousParticipantIds: string[] = [];
  if (pending?.participantId) {
    previousParticipantIds.push(pending.participantId);
  }
  for (const peer of mediaEngine.getPeersInRoom(roomId)) {
    const sameIdentity =
      (peer.identityKey && peer.identityKey === identityKey) ||
      peer.userId === userId ||
      (normalizedEmail && peer.email && peer.email === normalizedEmail);
    if (sameIdentity && !previousParticipantIds.includes(peer.id)) {
      previousParticipantIds.push(peer.id);
    }
  }
  for (const oldId of previousParticipantIds) {
    try {
      mediaEngine.removePeer(roomId, oldId);
      io.to(roomId).emit('peer-left', { participantId: oldId, reason: 'reconnect' });
    } catch (err) {
      logger.warn('Failed to clean prior peer on resume', {
        roomId,
        participantId: oldId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const replacedPrior = previousParticipantIds.length > 0;

  const rtpCapabilities = await mediaEngine.getOrCreateRoom(roomId);
  const participantId = randomUUID();

  mediaEngine.addPeer(
    roomId,
    participantId,
    socket.id,
    userId,
    name,
    avatarUrl,
    avatarColor,
    identityKey,
    normalizedEmail,
  );

  socket.join(roomId);

  const workspaceId = userId.startsWith('guest_')
    ? null
    : await resolveWorkspaceId(userId);
  const { sessionId } = await onParticipantJoin({ roomId, userId, workspaceId });
  socket.data.currentRoom = {
    roomId,
    participantId,
    joinedAt: new Date(),
    workspaceId,
    sessionId,
    identityKey,
  };
  socket.data.softDisconnect = false;

  // Persist admission so reconnect/refresh skips waiting room.
  if (meetingId) {
    await markAdmitted({
      meetingId,
      roomId,
      userId,
      isGuest,
      email,
      displayName: name,
      admittedBy: admittedBy || (creatorId === userId ? userId : userId),
    });
  }

  const event = replacedPrior || pending ? 'peer-reconnected' : 'peer-joined';
  socket.to(roomId).emit(event, {
    participantId,
    previousParticipantId: previousParticipantIds[0] ?? null,
    name,
    userId,
    email: normalizedEmail,
    identityKey,
    avatarUrl,
    avatarColor,
    resumed: replacedPrior || Boolean(pending),
  });

  // Host just joined — push any pending waiting requests
  if (creatorId && creatorId === userId) {
    for (const waiting of listWaiting(roomId)) {
      socket.emit('waiting-join-request', waiting);
    }
  }

  logger.info('Peer joined room', {
    roomId,
    participantId,
    userId,
    identityKey,
    resumed: replacedPrior || Boolean(pending),
    replacedPrior,
    event,
  });

  return {
    status: 'joined' as const,
    participantId,
    rtpCapabilities,
    creatorId,
    avatarUrl,
    avatarColor,
    muteOnEntry,
    resumed: replacedPrior || Boolean(pending),
    simulcastEncodings: mediasoupConfig.simulcastEncodings,
    screenShareEncodings: mediasoupConfig.screenShareEncodings,
  };
}

/**
 * Fully clean up a peer: remove from MediaEngine, leave socket room,
 * broadcast peer-left, and schedule router cleanup if room is now empty.
 */
export function _cleanupPeer(
  io: Server,
  socket: Socket,
  roomId: string,
  participantId: string,
): void {
  remoteControlService.onParticipantLeft(roomId, participantId);
  whiteboardRoomService.detachSocket(roomId, socket.id);
  mediaEngine.removePeer(roomId, participantId);
  const user = socket.data.user as { name?: string } | undefined;
  onWhiteboardPeerLeft(
    io,
    roomId,
    participantId,
    mediaEngine.getRoomParticipantCount(roomId),
    user?.name,
  );
  socket.leave(roomId);
  const { joinedAt, workspaceId, sessionId } = (socket.data.currentRoom ?? {}) as {
    joinedAt?: Date;
    workspaceId?: string | null;
    sessionId?: string | null;
  };
  socket.data.currentRoom = undefined;

  io.to(roomId).emit('peer-left', { participantId });

  if (joinedAt) {
    const isLastPeer = mediaEngine.getRoomParticipantCount(roomId) === 0;
    void onParticipantLeave({
      roomId,
      userId: (socket.data.user as { userId: string }).userId,
      workspaceId: workspaceId ?? null,
      joinedAt,
      sessionId: sessionId ?? null,
      isLastPeer,
    });
  }

  logger.info('Peer left room', {
    roomId,
    participantId,
    remainingPeers: mediaEngine.getRoomParticipantCount(roomId),
  });
}


