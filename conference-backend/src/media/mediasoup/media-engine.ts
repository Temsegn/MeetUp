import {
  DtlsParameters,
  IceParameters,
  RtpCapabilities,
  RtpParameters,
  MediaKind,
} from 'mediasoup/types';
import { Server as SocketIOServer } from 'socket.io';
import { workerManager } from './worker-manager';
import { routerManager } from './router-manager';
import { transportManager } from './transport-manager';
import { producerManager } from './producer-manager';
import { consumerManager } from './consumer-manager';
import { participantManager } from './participant-manager';
import { activeSpeakerManager } from './active-speaker-observer';
import { recordingManager } from './recording-manager';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import { mediasoupConfig } from '../../config/mediasoup';
import type {
  MediaSource,
  ProducerAppData,
  TransportDirection,
  CreateTransportResult,
  CreateConsumerResult,
  PeerMediaState,
  RoomStats,
  WorkerStats,
} from './media.types';
import type { RecordingInfo } from './recording-manager';

/**
 * MediaEngine — the single public API for the entire SFU media layer.
 *
 * All signaling handlers interact with this class only.
 * Raw mediasoup objects are never exposed outside this module.
 *
 * Responsibilities:
 *  - Worker/Router/Transport/Producer/Consumer lifecycle
 *  - ICE restart (server-initiated and client-requested)
 *  - Simulcast layer / priority management
 *  - Periodic stats collection
 *  - Room and peer diagnostics
 *  - Graceful shutdown
 */
export class MediaEngine {
  private statsTimer?: ReturnType<typeof setInterval>;

  // ── Initialization ─────────────────────────────────────────────────────────

  public async initialize(io: SocketIOServer): Promise<void> {
    // Inject io into managers that need to push events to clients
    transportManager.setIO(io);
    producerManager.setIO(io);
    consumerManager.setIO(io);
    activeSpeakerManager.setIO(io);
    recordingManager.setIO(io);

    // Initialize worker pool
    await workerManager.initialize();

    routerManager.onRouterClosed((roomId) => {
      void recordingManager.onRoomClosed(roomId);
    });

    // Wire worker death → router cleanup → client notification
    workerManager.onWorkerDied((workerPid, _affectedRoomIds) => {
      const deadRoomIds = routerManager.handleWorkerDeath(workerPid);

      for (const roomId of deadRoomIds) {
        // Use this.removePeer() — not participantManager.removePeer() directly —
        // so participant metrics (activeParticipants, participantsLeft) are
        // correctly decremented and scheduleRoomCleanup is called per peer.
        const peers = participantManager.getPeersInRoom(roomId);
        for (const peer of peers) {
          // participantManager.removePeer closes transports and clears maps.
          // We call it directly here because the router is already gone
          // (handleWorkerDeath removed it above) — scheduleRoomCleanup would
          // attempt to find a router that no longer exists, so skip it.
          participantManager.removePeer(roomId, peer.id);
          metrics.activeParticipants.dec();
          metrics.participantsLeft.inc();
        }

        void recordingManager.onRoomClosed(roomId);

        io.to(roomId).emit('worker-died', {
          message: 'Conference server error — please rejoin the meeting.',
        });

        logger.warn('Notified clients of worker death and cleaned up peers', {
          roomId,
          workerPid,
          peerCount: peers.length,
        });
      }
    });

    // Start periodic stats collection
    this._startStatsCollection();

    logger.info('MediaEngine initialized');
  }

  // ── Room management ────────────────────────────────────────────────────────

  /**
   * Ensure a router exists for the room and return its RTP capabilities.
   * Safe to call concurrently — deduplication handled by RouterManager.
   */
  public async getOrCreateRoom(roomId: string): Promise<RtpCapabilities> {
    if (!routerManager.hasRouter(roomId)) {
      await routerManager.createRouter(roomId);
    }
    const router = routerManager.getRouter(roomId);
    if (!router) {
      throw new Error(`Failed to initialize router for room ${roomId}`);
    }
    // Create ActiveSpeakerObserver for this room (no-op if already exists)
    await activeSpeakerManager.createObserver(roomId, router);
    return router.rtpCapabilities;
  }

  public getRoomRtpCapabilities(roomId: string): RtpCapabilities {
    const router = routerManager.getRouter(roomId);
    if (!router) {
      throw new Error(`Room ${roomId} has no active router`);
    }
    return router.rtpCapabilities;
  }

  /** Force-close a room immediately. Normally handled by scheduleRoomCleanup. */
  public closeRoom(roomId: string): void {
    void recordingManager.onRoomClosed(roomId);
    for (const peer of participantManager.getPeersInRoom(roomId)) {
      participantManager.removePeer(roomId, peer.id);
    }
    activeSpeakerManager.closeObserver(roomId);
    routerManager.closeRouter(roomId);
  }

  // ── Peer management ────────────────────────────────────────────────────────

  public addPeer(
    roomId: string,
    participantId: string,
    socketId: string,
    userId: string,
    name: string,
  ): void {
    participantManager.addPeer(roomId, participantId, socketId, userId, name);
    metrics.activeParticipants.inc();
    metrics.participantsJoined.inc();
  }

  public removePeer(
    roomId: string,
    participantId: string,
  ): void {
    participantManager.removePeer(roomId, participantId);
    const remaining = participantManager.getRoomParticipantCount(roomId);
    routerManager.scheduleRoomCleanup(roomId, remaining);
    metrics.activeParticipants.dec();
    metrics.participantsLeft.inc();
  }

  public getPeersInRoom(roomId: string) {
    return participantManager.getPeersInRoom(roomId);
  }

  public getRoomParticipantCount(roomId: string): number {
    return participantManager.getRoomParticipantCount(roomId);
  }

  public getPeer(roomId: string, participantId: string) {
    return participantManager.getPeer(roomId, participantId);
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  public async createTransport(
    roomId: string,
    participantId: string,
    direction: TransportDirection,
  ): Promise<CreateTransportResult> {
    return transportManager.createWebRtcTransport(roomId, participantId, direction);
  }

  public async connectTransport(
    roomId: string,
    participantId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    return transportManager.connectTransport(roomId, participantId, transportId, dtlsParameters);
  }

  public async restartIce(
    roomId: string,
    participantId: string,
    transportId: string,
  ): Promise<IceParameters> {
    return transportManager.restartIce(roomId, participantId, transportId);
  }

  public ownsTransport(
    roomId: string,
    participantId: string,
    transportId: string,
  ): boolean {
    return participantManager.getPeer(roomId, participantId)?.transports.has(transportId) ?? false;
  }

  // ── Producer ───────────────────────────────────────────────────────────────

  public async produce(
    roomId: string,
    participantId: string,
    transportId: string,
    kind: MediaKind,
    rtpParameters: RtpParameters,
    appData: Partial<ProducerAppData> = {},
  ): Promise<string> {
    const producer = await producerManager.createProducer(
      roomId, participantId, transportId, kind, rtpParameters, appData,
    );
    // Register audio producers with the ActiveSpeakerObserver
    if (producer.kind === 'audio') {
      await activeSpeakerManager.addProducer(roomId, producer.id);
    }
    const source = (producer.appData as ProducerAppData).source ?? 'camera';
    void recordingManager.onProducerCreated(
      roomId, producer.id, participantId, producer.kind, source,
    );
    return producer.id;
  }

  public async pauseProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Promise<void> {
    return producerManager.pauseProducer(roomId, participantId, producerId);
  }

  public async resumeProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Promise<void> {
    return producerManager.resumeProducer(roomId, participantId, producerId);
  }

  public closeProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): void {
    // Remove audio producer from ActiveSpeakerObserver before closing
    const peer = participantManager.getPeer(roomId, participantId);
    const producer = peer?.producers.get(producerId);
    if (producer?.kind === 'audio') {
      activeSpeakerManager.removeProducer(roomId, producerId).catch(() => {});
    }
    void recordingManager.onProducerClosed(roomId, producerId);
    producerManager.closeProducer(roomId, participantId, producerId);
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  public async startRecording(
    roomId: string,
    startedByParticipantId: string,
  ): Promise<RecordingInfo> {
    return recordingManager.startRecording(roomId, startedByParticipantId);
  }

  public async stopRecording(roomId: string): Promise<RecordingInfo | null> {
    return recordingManager.stopRecording(roomId);
  }

  public getRecordingInfo(roomId: string): RecordingInfo | null {
    return recordingManager.getRecordingInfo(roomId);
  }

  public isRecording(roomId: string): boolean {
    return recordingManager.isRecording(roomId);
  }

  /**
   * Replace the underlying media track of a running producer in-place.
   * All existing consumers continue without interruption.
   */
  public async replaceTrack(
    roomId: string,
    participantId: string,
    producerId: string,
    track: MediaStreamTrack | null,
  ): Promise<void> {
    return producerManager.replaceTrack(roomId, participantId, producerId, track);
  }

  public ownsProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): boolean {
    return producerManager.ownsProducer(roomId, participantId, producerId);
  }

  public getAllProducersInRoom(roomId: string) {
    return producerManager.getAllProducersInRoom(roomId);
  }

  // ── Consumer ───────────────────────────────────────────────────────────────

  public async consume(
    roomId: string,
    participantId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<CreateConsumerResult> {
    const consumer = await consumerManager.createConsumer(
      roomId, participantId, transportId, producerId, rtpCapabilities,
    );

    return {
      id:             consumer.id,
      producerId,
      kind:           consumer.kind,
      rtpParameters:  consumer.rtpParameters,
      type:           consumer.type,
      producerPaused: consumer.producerPaused,
    };
  }

  public async resumeConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): Promise<void> {
    return consumerManager.resumeConsumer(roomId, participantId, consumerId);
  }

  public async pauseConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): Promise<void> {
    return consumerManager.pauseConsumer(roomId, participantId, consumerId);
  }

  public closeConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): void {
    return consumerManager.closeConsumer(roomId, participantId, consumerId);
  }

  public ownsConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): boolean {
    return consumerManager.ownsConsumer(roomId, participantId, consumerId);
  }

  /**
   * Set preferred simulcast/SVC spatial and temporal layers.
   * Call this whenever tile size or active-speaker changes.
   */
  public async setPreferredLayers(
    roomId: string,
    participantId: string,
    consumerId: string,
    spatialLayer: number,
    temporalLayer?: number,
  ): Promise<void> {
    return consumerManager.setPreferredLayers(
      roomId, participantId, consumerId, spatialLayer, temporalLayer,
    );
  }

  /**
   * Set consumer download priority for bandwidth allocation.
   * See ConsumerManager.setPriority() for range guidance.
   */
  public async setConsumerPriority(
    roomId: string,
    participantId: string,
    consumerId: string,
    priority: number,
  ): Promise<void> {
    return consumerManager.setPriority(roomId, participantId, consumerId, priority);
  }

  // ── Diagnostics ────────────────────────────────────────────────────────────

  /**
   * Return full media state for a single peer.
   * Useful for debugging a broken session.
   */
  public async getPeerDiagnostics(
    roomId: string,
    participantId: string,
  ): Promise<PeerMediaState | null> {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return null;

    const transportInfos = await Promise.all(
      Array.from(peer.transports.entries()).map(async ([id, transport]) => {
        let bytesSent = 0;
        let bytesReceived = 0;
        let bitrateSend: number | undefined;
        let bitrateRecv: number | undefined;
        let availableOutgoingBitrate: number | undefined;
        let rtt: number | undefined;

        try {
          const statsArr = await transport.getStats();
          for (const s of statsArr) {
            const stat = s as Record<string, unknown>;
            if (typeof stat['bytesSent'] === 'number') bytesSent = stat['bytesSent'];
            if (typeof stat['bytesReceived'] === 'number') bytesReceived = stat['bytesReceived'];
            if (typeof stat['bitrateSend'] === 'number') bitrateSend = stat['bitrateSend'];
            if (typeof stat['bitrateRecv'] === 'number') bitrateRecv = stat['bitrateRecv'];
            if (typeof stat['availableOutgoingBitrate'] === 'number') {
              availableOutgoingBitrate = stat['availableOutgoingBitrate'];
            }
            if (typeof stat['roundTripTime'] === 'number') rtt = stat['roundTripTime'];
          }
        } catch { /* non-critical */ }

        return {
          id,
          direction:      peer.transportDirections.get(id) ?? 'send',
          lifecycleState: transportManager.getTransportLifecycleState(id),
          iceState:       transport.iceState,
          dtlsState:      transport.dtlsState,
          bytesSent,
          bytesReceived,
          bitrateSend,
          bitrateRecv,
          availableOutgoingBitrate,
          rtt,
        };
      }),
    );

    const producerInfos = producerManager.getProducerInfos(roomId, participantId);
    const consumerInfos = consumerManager.getConsumerInfos(roomId, participantId);

    return {
      participantId,
      transports: transportInfos,
      producers:  producerInfos,
      consumers:  consumerInfos,
    };
  }

  /**
   * Return stats for all rooms.
   */
  public getRoomStats(): RoomStats[] {
    const routerStats = routerManager.getRouterStats();
    return routerStats.map((rs) => ({
      roomId:           rs.roomId,
      workerPid:        rs.workerPid,
      participantCount: participantManager.getRoomParticipantCount(rs.roomId),
      transportCount:   participantManager.getTransportCountInRoom(rs.roomId),
      producerCount:    participantManager.getProducerCountInRoom(rs.roomId),
      consumerCount:    participantManager.getConsumerCountInRoom(rs.roomId),
      createdAt:        rs.createdAt,
    }));
  }

  /**
   * Return worker-level health and resource stats.
   */
  public async getWorkerStats(): Promise<WorkerStats[]> {
    return workerManager.getWorkerStats();
  }

  // ── Periodic stats collection ──────────────────────────────────────────────

  private _startStatsCollection(): void {
    if (this.statsTimer) return;

    this.statsTimer = setInterval(async () => {
      try {
        await this._collectStats();
      } catch (err) {
        logger.error('Stats collection error', { err });
      }
    }, mediasoupConfig.statsIntervalMs);

    // Prevent this timer from keeping the process alive on shutdown
    if (this.statsTimer.unref) {
      this.statsTimer.unref();
    }

    logger.debug('Media stats collection started', {
      intervalMs: mediasoupConfig.statsIntervalMs,
    });
  }

  private async _collectStats(): Promise<void> {
    // ── Worker resource usage ──────────────────────────────────────────────
    const workerStats = await workerManager.getWorkerStats();
    for (const ws of workerStats) {
      if (ws.cpuUsage !== undefined) {
        logger.debug('Worker resource usage', {
          pid:         ws.pid,
          cpuUs:       ws.cpuUsage,
          memBytes:    ws.memoryUsage,
          routerCount: ws.routerCount,
        });
      }
    }

    // ── Per-room / per-peer media stats ────────────────────────────────────
    for (const roomId of routerManager.getActiveRoomIds()) {
      for (const peer of participantManager.getPeersInRoom(roomId)) {

        // ── Transport stats + BWE adaptation ────────────────────────────────
        for (const [transportId, transport] of peer.transports.entries()) {
          const direction = peer.transportDirections.get(transportId);
          if (transport.closed) continue;

          try {
            const statsArr = await transport.getStats();
            for (const s of statsArr) {
              const stat = s as Record<string, unknown>;
              const availableBps  = typeof stat['availableOutgoingBitrate'] === 'number'
                ? stat['availableOutgoingBitrate'] : undefined;
              const rtt           = typeof stat['roundTripTime'] === 'number'
                ? stat['roundTripTime'] : undefined;
              const bytesSent     = typeof stat['bytesSent'] === 'number'
                ? stat['bytesSent'] : 0;
              const bytesReceived = typeof stat['bytesReceived'] === 'number'
                ? stat['bytesReceived'] : 0;

              logger.debug('Transport stats', {
                roomId,
                participantId:     peer.id,
                transportId,
                direction,
                availableOutgoingBitrate: availableBps,
                rtt,
                bytesSent,
                bytesReceived,
              });

              // Bandwidth-driven layer adaptation on recv transports
              if (direction === 'recv' && availableBps !== undefined) {
                await activeSpeakerManager.adaptLayersForTransport(
                  roomId, peer.id, availableBps,
                );
              }
            }
          } catch { /* non-critical */ }
        }

        // ── Producer stats ───────────────────────────────────────────────────
        for (const [producerId, producer] of peer.producers.entries()) {
          if (producer.closed) continue;
          try {
            const statsArr = await producer.getStats();
            for (const s of statsArr) {
              const stat = s as Record<string, unknown>;
              logger.debug('Producer stats', {
                roomId,
                participantId: peer.id,
                producerId,
                kind:          producer.kind,
                source:        (producer.appData as ProducerAppData).source,
                bitrate:       stat['bitrate'],
                bytesSent:     stat['bytesSent'],
                packetLoss:    stat['fractionLost'],
              });
            }
          } catch { /* non-critical */ }
        }

        // ── Consumer stats ───────────────────────────────────────────────────
        for (const [consumerId, consumer] of peer.consumers.entries()) {
          if (consumer.closed) continue;
          try {
            const statsArr = await consumer.getStats();
            for (const s of statsArr) {
              const stat = s as Record<string, unknown>;
              logger.debug('Consumer stats', {
                roomId,
                participantId:        peer.id,
                consumerId,
                kind:                 consumer.kind,
                bitrate:              stat['bitrate'],
                bytesReceived:        stat['bytesReceived'],
                packetLoss:           stat['fractionLost'],
                currentSpatialLayer:  consumer.currentLayers?.spatialLayer,
                currentTemporalLayer: consumer.currentLayers?.temporalLayer,
              });
            }
          } catch { /* non-critical */ }
        }
      }
    }
  }

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  public async shutdown(): Promise<void> {
    logger.info('MediaEngine shutting down...');

    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = undefined;
    }

    await recordingManager.shutdown();
    await routerManager.shutdown();
    await workerManager.shutdown();

    logger.info('MediaEngine shutdown complete.');
  }
}

export const mediaEngine = new MediaEngine();
