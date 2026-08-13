import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import {
  DtlsParameters,
  RtpParameters,
  RtpCapabilities,
  MediaKind,
} from 'mediasoup/types';
import { Meeting } from '../../models/Meeting.model';
import { mediaEngine } from '../../media/mediasoup/media-engine';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import {
  validatePayload,
  JoinRoomSchema,
  LeaveRoomSchema,
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
import type { TransportDirection, ProducerAppData } from '../../media/mediasoup/media.types';
import { participantManager } from '../../media/mediasoup/participant-manager';

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
  const user = socket.data.user as { userId: string; name: string; email: string };

  // ────────────────────────────────────────────────────────────────────────────
  // join-room
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('join-room', async (payload: unknown, callback: Callback) => {
    const v = validatePayload(JoinRoomSchema, payload);
    if (!v.success) return validationError(callback, v.error);
    const { roomId } = v.data;

    try {
      if (socket.data.currentRoom) {
        return callback({ error: 'Already in a room. Leave first.', code: 'ALREADY_JOINED' });
      }

      // Fetch meeting creatorId (out of scope for media — used only for UI permission)
      const meeting = await Meeting.findOne({ roomId }).lean();

      // Ensure router exists and get RTP capabilities
      const rtpCapabilities = await mediaEngine.getOrCreateRoom(roomId);

      // Generate server-controlled participant ID
      const participantId = randomUUID();

      // Register peer in ParticipantManager
      mediaEngine.addPeer(roomId, participantId, socket.id, user.userId, user.name);

      // Join Socket.IO room for broadcasts
      socket.join(roomId);

      // Track current room on socket for ownership checks and cleanup
      socket.data.currentRoom = { roomId, participantId };

      // Notify existing peers
      socket.to(roomId).emit('peer-joined', {
        participantId,
        name:   user.name,
        userId: user.userId,
      });

      logger.info('Peer joined room', { roomId, participantId, userId: user.userId });

      callback({
        participantId,
        rtpCapabilities,
        creatorId: meeting?.createdBy?.toString() ?? null,
        // Return simulcast encoding config so client knows what to pass to produce()
        simulcastEncodings:   mediasoupConfig.simulcastEncodings,
        screenShareEncodings: mediasoupConfig.screenShareEncodings,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('join-room error', { err: msg, roomId, userId: user.userId });
      callback({ error: msg });
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
      const { participantId } = socket.data.currentRoom ?? {};
      if (!participantId) return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });

      _cleanupPeer(io, socket, roomId, participantId);
      callback?.({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('leave-room error', { err: msg });
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
        .map(p => ({ id: p.id, name: p.name, userId: p.userId }));

      const producers = mediaEngine
        .getAllProducersInRoom(roomId)
        .map(({ producerId, participantId, kind, source }) => ({
          producerId,
          participantId,
          kind,
          appData: { source },
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
  mediaEngine.removePeer(roomId, participantId);
  socket.leave(roomId);
  socket.data.currentRoom = undefined;

  io.to(roomId).emit('peer-left', { participantId });

  logger.info('Peer left room', {
    roomId,
    participantId,
    remainingPeers: mediaEngine.getRoomParticipantCount(roomId),
  });
}


