import { Producer, RtpParameters, MediaKind } from 'mediasoup/types';
import { Server as SocketIOServer } from 'socket.io';
import { participantManager } from './participant-manager';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import type { MediaSource, ProducerAppData, ProducerInfo } from './media.types';

/**
 * ProducerManager owns the lifecycle of mediasoup Producers.
 *
 * Each peer may have up to three simultaneous producers:
 *  - microphone (audio, simple)
 *  - camera    (video, simulcast)
 *  - screen    (video, single encoding)
 *
 * Close paths and the double-cleanup problem
 * ──────────────────────────────────────────
 * producer.close() fires 'transportclose' synchronously on the same call
 * stack. To prevent the event handler running cleanup AFTER the explicit
 * close has already done it, we ALWAYS remove the producer from the peer
 * map and decrement metrics BEFORE calling producer.close(). The
 * 'transportclose' handler then finds no entry and exits silently.
 *
 * This applies to:
 *   1. closeProducer()  — explicit close by the peer
 *   2. 'transportclose' event — transport closed (disconnect / worker death)
 *
 * replaceTrack
 * ────────────
 * Allows a running producer to switch its media track without closing it,
 * preserving all existing consumers. Used for camera switching and new
 * screen-share sources.
 */
export class ProducerManager {
  private io?: SocketIOServer;

  public setIO(io: SocketIOServer): void {
    this.io = io;
  }

  // ── Producer creation ──────────────────────────────────────────────────────

  public async createProducer(
    roomId: string,
    participantId: string,
    transportId: string,
    kind: MediaKind,
    rtpParameters: RtpParameters,
    appData: Partial<ProducerAppData> = {},
  ): Promise<Producer> {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) {
      throw new Error(`Peer ${participantId} not found in room ${roomId}`);
    }

    const direction = peer.transportDirections.get(transportId);
    if (direction !== 'send') {
      throw new Error(
        `Transport ${transportId} is not a send transport (direction: ${direction ?? 'unknown'})`,
      );
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found for peer ${participantId}`);
    }
    if (transport.closed) {
      throw new Error(`Transport ${transportId} is closed`);
    }

    const typedAppData: ProducerAppData = {
      source:        appData.source ?? 'camera',
      participantId,
      ...appData,
    };

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: typedAppData,
    });

    peer.producers.set(producer.id, producer);
    metrics.activeProducers.inc();
    metrics.producersCreated.inc();

    logger.info('Producer created', {
      roomId,
      participantId,
      producerId: producer.id,
      kind,
      source:     typedAppData.source,
      type:       producer.type,
    });

    // Warn when a video producer is NOT simulcast — operators need to know
    // if a client is sending a single encoding instead of 3 layers.
    if (kind === 'video' && typedAppData.source === 'camera' && producer.type !== 'simulcast') {
      logger.warn('Camera video producer is not simulcast — client may not be sending multiple encodings', {
        roomId,
        participantId,
        producerId: producer.id,
        type:       producer.type,
      });
    }

    this._attachProducerHandlers(producer, roomId, participantId);

    return producer;
  }

  // ── replaceTrack ──────────────────────────────────────────────────────────
  //
  // Replaces the underlying media track of a running producer without
  // closing it. All existing consumers continue uninterrupted.
  //
  // Use cases:
  //  - Camera switch (front → back, device A → device B)
  //  - New screen-share capture replacing the previous one
  //  - Passing null pauses the producer at the RTP level

  public async replaceTrack(
    roomId: string,
    participantId: string,
    producerId: string,
    // mediasoup's replaceTrack accepts null to pause at RTP level
    track: MediaStreamTrack | null,
  ): Promise<void> {
    const producer = this._getProducer(roomId, participantId, producerId);
    if (producer.closed) {
      throw new Error(`Producer ${producerId} is already closed`);
    }
    await (producer as any).replaceTrack?.({ track });
    logger.info('Producer track replaced', {
      roomId,
      participantId,
      producerId,
      hasTrack: track !== null,
      source:   (producer.appData as ProducerAppData).source,
    });
  }

  // ── Producer event handlers ────────────────────────────────────────────────

  private _attachProducerHandlers(
    producer: Producer,
    roomId: string,
    participantId: string,
  ): void {
    // 'transportclose' fires when the transport closes (peer disconnect,
    // transport failure, worker death). At this point the producer is
    // already invalid — just remove our reference and update metrics.
    producer.on('transportclose', () => {
      logger.debug('Producer closed by transport close', {
        producerId: producer.id,
        roomId,
        participantId,
      });
      // Guard: explicit closeProducer() removes from map first.
      // If this event fires for a producer not in the map it was already
      // cleaned up — exit silently to prevent double-decrement.
      const peer = participantManager.getPeer(roomId, participantId);
      if (!peer?.producers.has(producer.id)) return;

      peer.producers.delete(producer.id);
      metrics.activeProducers.dec();
      metrics.producersClosed.inc();
    });

    // Score reflects per-encoding quality (simulcast layer RTP health).
    producer.observer.on('score', (scores: unknown) => {
      logger.debug('Producer score update', {
        producerId: producer.id,
        kind:       producer.kind,
        source:     (producer.appData as ProducerAppData).source,
        scores,
      });
    });
  }

  // ── Public producer controls ───────────────────────────────────────────────

  /**
   * Explicitly close a producer (peer turned off camera, stopped screen share, etc.).
   *
   * CRITICAL ORDER: remove from map and decrement metrics BEFORE calling
   * producer.close(). producer.close() fires 'transportclose' synchronously,
   * which would otherwise double-decrement if we cleaned up after.
   */
  public closeProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): void {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (!producer) return;

    const source = (producer.appData as ProducerAppData).source;

    // 1. Remove from map BEFORE close — prevents double-cleanup via transportclose
    peer.producers.delete(producerId);
    metrics.activeProducers.dec();
    metrics.producersClosed.inc();

    // 2. Close the underlying mediasoup producer
    if (!producer.closed) {
      producer.close();
    }

    logger.info('Producer explicitly closed', {
      roomId,
      participantId,
      producerId,
      source,
    });
  }

  public async pauseProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Promise<void> {
    const producer = this._getProducer(roomId, participantId, producerId);
    if (!producer.paused) {
      await producer.pause();
    }
    logger.debug('Producer paused', { roomId, participantId, producerId });
  }

  public async resumeProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Promise<void> {
    const producer = this._getProducer(roomId, participantId, producerId);
    if (producer.paused) {
      await producer.resume();
    }
    logger.debug('Producer resumed', { roomId, participantId, producerId });
  }

  // ── Ownership / lookup ─────────────────────────────────────────────────────

  public ownsProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): boolean {
    return participantManager.getPeer(roomId, participantId)?.producers.has(producerId) ?? false;
  }

  private _getProducer(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Producer {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) throw new Error(`Peer ${participantId} not found in room ${roomId}`);
    const producer = peer.producers.get(producerId);
    if (!producer) throw new Error(`Producer ${producerId} not found for peer ${participantId}`);
    return producer;
  }

  // ── Stats / diagnostics ───────────────────────────────────────────────────

  public async getProducerStats(
    roomId: string,
    participantId: string,
    producerId: string,
  ): Promise<object[]> {
    try {
      return await this._getProducer(roomId, participantId, producerId).getStats();
    } catch {
      return [];
    }
  }

  public getProducerInfos(roomId: string, participantId: string): ProducerInfo[] {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return [];

    return Array.from(peer.producers.values()).map((p) => {
      const appData = p.appData as ProducerAppData;
      // producer.score is a synchronous array of per-encoding scores
      const scores = p.score;
      const topScore = Array.isArray(scores) && scores.length > 0
        ? Math.max(...scores.map((s: { score: number }) => s.score))
        : undefined;

      return {
        id:     p.id,
        kind:   p.kind,
        source: appData.source ?? 'camera',
        type:   p.type,
        paused: p.paused,
        score:  topScore,
      };
    });
  }

  public getAllProducersInRoom(
    roomId: string,
  ): Array<{ producerId: string; participantId: string; kind: MediaKind; source: MediaSource | string }> {
    const result: Array<{
      producerId: string;
      participantId: string;
      kind: MediaKind;
      source: MediaSource | string;
    }> = [];

    for (const peer of participantManager.getPeersInRoom(roomId)) {
      for (const producer of peer.producers.values()) {
        result.push({
          producerId:    producer.id,
          participantId: peer.id,
          kind:          producer.kind,
          source:        (producer.appData as ProducerAppData).source ?? 'camera',
        });
      }
    }

    return result;
  }
}

export const producerManager = new ProducerManager();
