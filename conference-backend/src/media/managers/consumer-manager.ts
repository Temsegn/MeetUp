import { Consumer, RtpCapabilities } from 'mediasoup/types';
import { Server as SocketIOServer } from 'socket.io';
import { participantManager } from './participant-manager';
import { routerManager } from './router-manager';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import type { ConsumerAppData, ConsumerInfo, ProducerAppData } from '../media.types';

/**
 * ConsumerManager owns the lifecycle of mediasoup Consumers.
 *
 * Close paths and the double-cleanup problem
 * ──────────────────────────────────────────
 * consumer.close() fires 'transportclose' synchronously. To prevent double-
 * decrement, we remove the consumer from the peer map and update metrics
 * BEFORE calling consumer.close() in all explicit-close paths. The
 * 'transportclose' handler checks for map presence before acting.
 *
 * Three close paths:
 *  1. closeConsumer()   — explicit close (client API)
 *  2. 'transportclose'  — transport closed (peer disconnect / worker death)
 *  3. 'producerclose'   — remote producer closed; client must be notified
 *
 * Paused-first pattern
 * ────────────────────
 * All consumers are created with paused:true. The client calls
 * resume-consumer after attaching the track to a media element.
 * This prevents media flowing before the client is ready.
 */
export class ConsumerManager {
  private io?: SocketIOServer;

  public setIO(io: SocketIOServer): void {
    this.io = io;
  }

  // ── Consumer creation ──────────────────────────────────────────────────────

  public async createConsumer(
    roomId: string,
    participantId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<Consumer> {
    const router = routerManager.getRouter(roomId);
    if (!router) throw new Error(`Router not found for room ${roomId}`);

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer ${producerId} — incompatible RTP capabilities`);
    }

    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) throw new Error(`Peer ${participantId} not found in room ${roomId}`);

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found for peer ${participantId}`);
    if (transport.closed) throw new Error(`Transport ${transportId} is closed`);

    const direction = peer.transportDirections.get(transportId);
    if (direction !== 'recv') {
      throw new Error(
        `Transport ${transportId} is not a recv transport (direction: ${direction ?? 'unknown'})`,
      );
    }

    // Locate producer ownership for appData
    let producerParticipantId = '';
    let producerSource = 'camera';
    for (const p of participantManager.getPeersInRoom(roomId)) {
      const prod = p.producers.get(producerId);
      if (prod) {
        producerParticipantId = p.id;
        producerSource = (prod.appData as ProducerAppData).source ?? 'camera';
        break;
      }
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
      appData: { producerParticipantId, source: producerSource } as Record<string, unknown>,
    });

    peer.consumers.set(consumer.id, consumer);
    metrics.activeConsumers.inc();
    metrics.consumersCreated.inc();

    logger.info('Consumer created', {
      roomId,
      participantId,
      consumerId:            consumer.id,
      producerId,
      kind:                  consumer.kind,
      type:                  consumer.type,
      producerParticipantId,
      source:                producerSource,
    });

    // Warn when a supposedly simulcast video consumer is actually 'simple' —
    // this means the remote producer is not sending multiple RTP encodings.
    if (consumer.kind === 'video' && producerSource === 'camera' && consumer.type !== 'simulcast') {
      logger.warn('Video consumer is not simulcast — remote camera producer may not be sending multiple layers', {
        roomId,
        participantId,
        consumerId: consumer.id,
        type:       consumer.type,
      });
    }

    this._attachConsumerHandlers(consumer, peer.socketId, roomId, participantId, producerId);

    return consumer;
  }

  // ── Consumer event handlers ────────────────────────────────────────────────

  private _attachConsumerHandlers(
    consumer: Consumer,
    socketId: string,
    roomId: string,
    participantId: string,
    producerId: string,
  ): void {
    const appData = consumer.appData as unknown as ConsumerAppData;

    // ── Transport closed ─────────────────────────────────────────────────────
    // Guard: if explicit closeConsumer() already removed this consumer from
    // the map, exit without double-decrementing.
    consumer.on('transportclose', () => {
      logger.debug('Consumer transport closed', { consumerId: consumer.id, roomId, participantId });
      const p = participantManager.getPeer(roomId, participantId);
      if (!p?.consumers.has(consumer.id)) return;  // already cleaned up

      p.consumers.delete(consumer.id);
      metrics.activeConsumers.dec();
      metrics.consumersClosed.inc();
    });

    // ── Producer closed ──────────────────────────────────────────────────────
    // mediasoup closes the consumer automatically when its producer closes.
    // We clean up our state and notify the client so it removes the remote track.
    consumer.on('producerclose', () => {
      logger.info('Consumer closed — producer closed, notifying client', {
        roomId,
        participantId,
        consumerId: consumer.id,
        producerId,
      });

      // Remove from map before any close call
      const p = participantManager.getPeer(roomId, participantId);
      if (p?.consumers.has(consumer.id)) {
        p.consumers.delete(consumer.id);
        metrics.activeConsumers.dec();
        metrics.consumersClosed.inc();
      }

      // Notify the consuming peer — client must remove the remote track/tile
      this.io?.to(socketId).emit('consumer-closed', {
        consumerId:    consumer.id,
        producerId,
        participantId: appData.producerParticipantId,
      });
    });

    // ── Producer paused/resumed — mirror to consumer ─────────────────────────
    consumer.on('producerpause', () => {
      if (!consumer.closed) {
        consumer.pause().catch((err: Error) =>
          logger.error('Consumer.pause() failed on producerpause', {
            consumerId: consumer.id, err: err.message,
          }),
        );
      }
    });

    consumer.on('producerresume', () => {
      if (!consumer.closed && consumer.paused) {
        consumer.resume().catch((err: Error) =>
          logger.error('Consumer.resume() failed on producerresume', {
            consumerId: consumer.id, err: err.message,
          }),
        );
      }
    });

    // ── Score — simulcast quality indicator ──────────────────────────────────
    consumer.observer.on('score', (score: unknown) => {
      logger.debug('Consumer score update', { consumerId: consumer.id, score });
    });

    // ── Layer change — track which spatial/temporal layer is active ──────────
    consumer.on('layerschange', (layers) => {
      logger.debug('Consumer layers changed', {
        consumerId:           consumer.id,
        currentSpatialLayer:  layers?.spatialLayer,
        currentTemporalLayer: layers?.temporalLayer,
      });
    });
  }

  // ── Public consumer controls ───────────────────────────────────────────────

  /**
   * Explicitly close a consumer.
   *
   * CRITICAL ORDER: remove from map and decrement metrics BEFORE calling
   * consumer.close() to prevent double-cleanup via 'transportclose'.
   */
  public closeConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): void {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return;

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) return;

    // 1. Remove BEFORE close
    peer.consumers.delete(consumerId);
    metrics.activeConsumers.dec();
    metrics.consumersClosed.inc();

    // 2. Close the underlying mediasoup consumer
    if (!consumer.closed) {
      consumer.close();
    }

    logger.debug('Consumer explicitly closed', { consumerId, participantId, roomId });
  }

  public async resumeConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): Promise<void> {
    const consumer = this._getConsumer(roomId, participantId, consumerId);
    if (consumer.paused) await consumer.resume();
    logger.debug('Consumer resumed', { consumerId, participantId, roomId });
  }

  public async pauseConsumer(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): Promise<void> {
    const consumer = this._getConsumer(roomId, participantId, consumerId);
    if (!consumer.paused) await consumer.pause();
    logger.debug('Consumer paused', { consumerId, participantId, roomId });
  }

  /**
   * Set preferred simulcast/SVC spatial and temporal layers.
   * spatialLayer 0 = lowest resolution; 2 = highest.
   * No-op for non-simulcast consumers (audio, screen share).
   */
  public async setPreferredLayers(
    roomId: string,
    participantId: string,
    consumerId: string,
    spatialLayer: number,
    temporalLayer?: number,
  ): Promise<void> {
    const consumer = this._getConsumer(roomId, participantId, consumerId);
    if (consumer.type === 'simulcast' || consumer.type === 'svc') {
      await consumer.setPreferredLayers({
        spatialLayer,
        temporalLayer: temporalLayer ?? 2,
      });
      logger.debug('Consumer preferred layers set', {
        consumerId, spatialLayer, temporalLayer: temporalLayer ?? 2,
      });
    }
  }

  /**
   * Set consumer download priority (1–255).
   * Higher = more bandwidth when link is constrained.
   *   active speaker  → 255
   *   large tile      → 200
   *   medium tile     → 100
   *   small tile      → 50
   *   off-screen      → 1
   */
  public async setPriority(
    roomId: string,
    participantId: string,
    consumerId: string,
    priority: number,
  ): Promise<void> {
    const consumer = this._getConsumer(roomId, participantId, consumerId);
    const clamped = Math.max(1, Math.min(255, priority));
    await consumer.setPriority(clamped);
    logger.debug('Consumer priority set', { consumerId, priority: clamped });
  }

  // ── Ownership ─────────────────────────────────────────────────────────────

  public ownsConsumer(roomId: string, participantId: string, consumerId: string): boolean {
    return participantManager.getPeer(roomId, participantId)?.consumers.has(consumerId) ?? false;
  }

  // ── Stats / diagnostics ───────────────────────────────────────────────────

  public async getConsumerStats(
    roomId: string,
    participantId: string,
    consumerId: string,
  ): Promise<object[]> {
    try {
      return await this._getConsumer(roomId, participantId, consumerId).getStats();
    } catch {
      return [];
    }
  }

  public getConsumerInfos(roomId: string, participantId: string): ConsumerInfo[] {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return [];

    return Array.from(peer.consumers.values()).map((c) => {
      // consumer.score is a synchronous object with producerScore and score
      const scoreObj = c.score as { score?: number; producerScore?: number } | undefined;

      return {
        id:                    c.id,
        producerId:            c.producerId,
        kind:                  c.kind,
        type:                  c.type,
        paused:                c.paused,
        preferredSpatialLayer:  c.preferredLayers?.spatialLayer,
        preferredTemporalLayer: c.preferredLayers?.temporalLayer,
        currentSpatialLayer:   c.currentLayers?.spatialLayer,
        currentTemporalLayer:  c.currentLayers?.temporalLayer,
        score:                 scoreObj?.score,
        producerScore:         scoreObj?.producerScore,
      };
    });
  }

  // ── Private lookup ────────────────────────────────────────────────────────

  private _getConsumer(roomId: string, participantId: string, consumerId: string): Consumer {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) throw new Error(`Peer ${participantId} not found in room ${roomId}`);
    const consumer = peer.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found for peer ${participantId}`);
    return consumer;
  }
}

export const consumerManager = new ConsumerManager();
