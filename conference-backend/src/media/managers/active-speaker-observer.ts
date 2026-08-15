import { Router, ActiveSpeakerObserver } from 'mediasoup/types';
import { Server as SocketIOServer } from 'socket.io';
import { participantManager } from './participant-manager';
import { consumerManager } from './consumer-manager';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';

/**
 * ActiveSpeakerManager
 * ────────────────────
 * Creates one mediasoup ActiveSpeakerObserver per Router (room).
 * When the dominant speaker changes, it:
 *
 *  1. Promotes the speaker's video consumers to the highest simulcast
 *     spatial layer (layer 2) and priority 255 on every receiving peer.
 *  2. Demotes all other video consumers to a lower spatial layer (layer 1)
 *     and a lower priority to free downstream bandwidth.
 *  3. Emits an 'active-speaker' Socket.IO event to the room so the client
 *     can visually highlight the speaking participant.
 *
 * The observer is attached after the router is created and detached when
 * the router closes.
 *
 * Bandwidth adaptation loop
 * ─────────────────────────
 * On every 'dominantspeaker' event we also inspect each recv transport's
 * availableOutgoingBitrate (from getStats). If the available bitrate drops
 * below a threshold we reduce the preferred spatial layer on ALL video
 * consumers for that transport, regardless of active speaker.
 * When bitrate recovers we restore the layer.
 *
 * Thresholds (conservative defaults, operator-tunable via env):
 *   LOW_BITRATE_THRESHOLD_BPS  = 300_000  → cap at spatial layer 0 (180p)
 *   MED_BITRATE_THRESHOLD_BPS  = 700_000  → cap at spatial layer 1 (360p)
 *   High (above 700k)          → full spatial layer 2 (720p)
 */

const LOW_BW_BPS = 300_000;   // below this → layer 0
const MED_BW_BPS = 700_000;   // below this → layer 1, above → layer 2

export class ActiveSpeakerManager {
  private io?: SocketIOServer;
  /** roomId → observer */
  private observers: Map<string, ActiveSpeakerObserver> = new Map();
  /** roomId → current dominant speaker participantId */
  private dominantSpeakers: Map<string, string> = new Map();

  public setIO(io: SocketIOServer): void {
    this.io = io;
  }

  // ── Create observer for a new room ────────────────────────────────────────

  public async createObserver(roomId: string, router: Router): Promise<void> {
    if (this.observers.has(roomId)) return;

    try {
      const observer = await router.createActiveSpeakerObserver({
        interval: 800,  // ms — how often the observer analyses audio levels
      });

      this.observers.set(roomId, observer);

      observer.on('dominantspeaker', (dominantSpeaker) => {
        const producerId = dominantSpeaker.producer.id;
        this._handleDominantSpeaker(roomId, producerId);
      });

      // Clean up if the router closes (worker death)
      observer.on('routerclose', () => {
        this.observers.delete(roomId);
        this.dominantSpeakers.delete(roomId);
        logger.debug('ActiveSpeakerObserver removed (router closed)', { roomId });
      });

      logger.info('ActiveSpeakerObserver created', { roomId });
    } catch (err: unknown) {
      // ActiveSpeakerObserver is a non-critical enhancement — log but don't throw
      logger.error('Failed to create ActiveSpeakerObserver', {
        roomId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Add/remove audio producers from the observer ─────────────────────────

  /**
   * Register an audio producer with this room's observer.
   * Must be called after createProducer() for audio producers.
   */
  public async addProducer(roomId: string, producerId: string): Promise<void> {
    const observer = this.observers.get(roomId);
    if (!observer || observer.closed) return;
    try {
      await observer.addProducer({ producerId });
    } catch (err: unknown) {
      logger.warn('ActiveSpeakerObserver.addProducer failed', {
        roomId, producerId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Remove an audio producer from the observer (producer closing).
   */
  public async removeProducer(roomId: string, producerId: string): Promise<void> {
    const observer = this.observers.get(roomId);
    if (!observer || observer.closed) return;
    try {
      await observer.removeProducer({ producerId });
    } catch {
      // Non-critical — producer may already be gone
    }
  }

  // ── Dominant speaker changed ──────────────────────────────────────────────

  private _handleDominantSpeaker(roomId: string, audioProducerId: string): void {
    // Resolve the audio producer → owning participantId
    let speakerParticipantId: string | undefined;
    for (const peer of participantManager.getPeersInRoom(roomId)) {
      if (peer.producers.has(audioProducerId)) {
        speakerParticipantId = peer.id;
        break;
      }
    }

    if (!speakerParticipantId) return;

    const previous = this.dominantSpeakers.get(roomId);
    if (previous === speakerParticipantId) return;  // no change

    this.dominantSpeakers.set(roomId, speakerParticipantId);

    logger.debug('Dominant speaker changed', { roomId, speakerParticipantId });

    // Notify all clients so they can highlight the speaker tile
    this.io?.to(roomId).emit('active-speaker', {
      roomId,
      participantId: speakerParticipantId,
    });

    // Adjust simulcast layers and priorities for all receiving peers
    this._adjustLayersForRoom(roomId, speakerParticipantId);
  }

  /**
   * For every peer that has a recv transport, walk their video consumers
   * and set:
   *   - active speaker's video → highest layer, highest priority
   *   - all others → medium layer, lower priority
   *
   * This runs asynchronously; individual failures are caught and logged
   * so one broken consumer does not abort the whole loop.
   */
  private _adjustLayersForRoom(roomId: string, speakerParticipantId: string): void {
    const peers = participantManager.getPeersInRoom(roomId);

    for (const peer of peers) {
      for (const consumer of peer.consumers.values()) {
        if (consumer.kind !== 'video') continue;
        if (consumer.closed) continue;
        if (consumer.type !== 'simulcast' && consumer.type !== 'svc') continue;

        // Determine which participant this consumer is receiving video from
        const appData = consumer.appData as { producerParticipantId?: string };
        const isSpeaker = appData.producerParticipantId === speakerParticipantId;

        const spatialLayer = isSpeaker
          ? mediasoupConfig.consumerPriority.activeSpeaker > 200 ? 2 : 1  // highest
          : 1;  // medium for non-speakers

        const priority = isSpeaker
          ? mediasoupConfig.consumerPriority.activeSpeaker   // 255
          : mediasoupConfig.consumerPriority.mediumTile;     // 100

        Promise.all([
          consumerManager.setPreferredLayers(peer.roomId, peer.id, consumer.id, spatialLayer),
          consumerManager.setPriority(peer.roomId, peer.id, consumer.id, priority),
        ]).catch((err: unknown) => {
          logger.warn('Failed to adjust layers for consumer', {
            consumerId: consumer.id,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }
  }

  // ── Bandwidth-driven layer adaptation ─────────────────────────────────────

  /**
   * Called by the periodic stats loop with the available outgoing bitrate
   * for a specific recv transport belonging to a peer.
   *
   * Adjusts all video consumer layers on that transport based on available
   * bandwidth thresholds.
   */
  public async adaptLayersForTransport(
    roomId: string,
    participantId: string,
    availableOutgoingBps: number,
  ): Promise<void> {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return;

    // Determine max spatial layer based on available bandwidth
    let maxSpatialLayer: number;
    if (availableOutgoingBps < LOW_BW_BPS) {
      maxSpatialLayer = 0;
    } else if (availableOutgoingBps < MED_BW_BPS) {
      maxSpatialLayer = 1;
    } else {
      maxSpatialLayer = 2;
    }

    const currentSpeaker = this.dominantSpeakers.get(roomId);

    for (const consumer of peer.consumers.values()) {
      if (consumer.kind !== 'video') continue;
      if (consumer.closed) continue;
      if (consumer.type !== 'simulcast' && consumer.type !== 'svc') continue;

      // Don't downgrade the active speaker below layer 1 unless bandwidth
      // is critically low (below LOW_BW threshold).
      const appData = consumer.appData as { producerParticipantId?: string };
      const isSpeaker = appData.producerParticipantId === currentSpeaker;
      const targetLayer = isSpeaker
        ? Math.max(maxSpatialLayer, availableOutgoingBps < LOW_BW_BPS ? 0 : 1)
        : maxSpatialLayer;

      const currentPreferred = consumer.preferredLayers?.spatialLayer ?? 2;
      if (currentPreferred === targetLayer) continue;  // no change needed

      consumerManager.setPreferredLayers(
        peer.roomId, peer.id, consumer.id, targetLayer,
      ).catch((err: unknown) => {
        logger.warn('BWE layer adaptation failed', {
          consumerId: consumer.id,
          targetLayer,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public closeObserver(roomId: string): void {
    const observer = this.observers.get(roomId);
    if (observer && !observer.closed) {
      observer.close();
    }
    this.observers.delete(roomId);
    this.dominantSpeakers.delete(roomId);
  }

  public getDominantSpeaker(roomId: string): string | undefined {
    return this.dominantSpeakers.get(roomId);
  }
}

export const activeSpeakerManager = new ActiveSpeakerManager();
