import { WebRtcTransport, Producer, Consumer, RtpCapabilities } from 'mediasoup/types';
import { logger } from '../../infrastructure/logging/logger';
import type { Peer, TransportDirection } from './media.types';

/**
 * ParticipantManager is the single source of truth for peer media state.
 *
 * Each peer owns:
 *  - A set of WebRtcTransports (typically one send + one recv)
 *  - A set of Producers (microphone, camera, screen)
 *  - A set of Consumers (one per remote producer the peer subscribes to)
 *  - transportDirections: maps transportId → 'send' | 'recv'
 *
 * The socketIndex provides O(1) peer lookup on socket disconnect.
 */
export class ParticipantManager {
  /** roomId → participantId → Peer */
  private roomPeers: Map<string, Map<string, Peer>> = new Map();

  /** socketId → { roomId, participantId } — O(1) disconnect lookup */
  private socketIndex: Map<string, { roomId: string; participantId: string }> = new Map();

  // ── Peer lifecycle ─────────────────────────────────────────────────────────

  public addPeer(
    roomId: string,
    participantId: string,
    socketId: string,
    userId: string,
    name: string,
  ): Peer {
    if (!this.roomPeers.has(roomId)) {
      this.roomPeers.set(roomId, new Map());
    }

    const room = this.roomPeers.get(roomId)!;

    if (room.has(participantId)) {
      logger.warn('Peer already exists — returning existing peer', { roomId, participantId });
      return room.get(participantId)!;
    }

    const peer: Peer = {
      id:                  participantId,
      userId,
      name,
      roomId,
      socketId,
      transports:          new Map<string, WebRtcTransport>(),
      transportDirections: new Map<string, TransportDirection>(),
      producers:           new Map<string, Producer>(),
      consumers:           new Map<string, Consumer>(),
      rtpCapabilities:     undefined,
      joinedAt:            new Date(),
    };

    room.set(participantId, peer);
    this.socketIndex.set(socketId, { roomId, participantId });

    logger.info('Peer added to room', { roomId, participantId, userId, name });
    return peer;
  }

  /**
   * Remove a peer and close all its mediasoup resources.
   * Closing a transport cascades to close all associated Producers and Consumers.
   */
  public removePeer(roomId: string, participantId: string): void {
    const room = this.roomPeers.get(roomId);
    if (!room) return;

    const peer = room.get(participantId);
    if (!peer) return;

    // transport.close() cascades to close all producers and consumers on it
    for (const transport of peer.transports.values()) {
      if (!transport.closed) {
        transport.close();
      }
    }

    room.delete(participantId);
    this.socketIndex.delete(peer.socketId);

    logger.info('Peer removed from room', { roomId, participantId });

    // Remove empty room entry — prevents unbounded memory growth
    if (room.size === 0) {
      this.roomPeers.delete(roomId);
    }
  }

  /**
   * O(1) remove via socket reverse index.
   * Returns { roomId, participantId } for the caller, or null if not found.
   */
  public removePeerBySocketId(
    socketId: string,
  ): { roomId: string; participantId: string } | null {
    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    this.removePeer(ref.roomId, ref.participantId);
    return ref;
  }

  // ── Lookups ────────────────────────────────────────────────────────────────

  public getPeer(roomId: string, participantId: string): Peer | undefined {
    return this.roomPeers.get(roomId)?.get(participantId);
  }

  /** O(1) via socket reverse index */
  public getPeerBySocketId(socketId: string): Peer | null {
    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    return this.getPeer(ref.roomId, ref.participantId) ?? null;
  }

  public getPeersInRoom(roomId: string): Peer[] {
    return Array.from(this.roomPeers.get(roomId)?.values() ?? []);
  }

  public getRoomParticipantCount(roomId: string): number {
    return this.roomPeers.get(roomId)?.size ?? 0;
  }

  public isInRoom(roomId: string, participantId: string): boolean {
    return this.roomPeers.get(roomId)?.has(participantId) ?? false;
  }

  public getActiveRoomIds(): string[] {
    return Array.from(this.roomPeers.keys());
  }

  // ── RTP Capabilities ──────────────────────────────────────────────────────

  /** Store the peer's RTP capabilities for use during consumer creation. */
  public setRtpCapabilities(
    roomId: string,
    participantId: string,
    rtpCapabilities: RtpCapabilities,
  ): void {
    const peer = this.getPeer(roomId, participantId);
    if (peer) {
      peer.rtpCapabilities = rtpCapabilities;
    }
  }

  // ── Room-level aggregates ──────────────────────────────────────────────────

  /** Count all producers across all peers in a room. */
  public getProducerCountInRoom(roomId: string): number {
    let count = 0;
    for (const peer of this.getPeersInRoom(roomId)) {
      count += peer.producers.size;
    }
    return count;
  }

  /** Count all consumers across all peers in a room. */
  public getConsumerCountInRoom(roomId: string): number {
    let count = 0;
    for (const peer of this.getPeersInRoom(roomId)) {
      count += peer.consumers.size;
    }
    return count;
  }

  /** Count all transports across all peers in a room. */
  public getTransportCountInRoom(roomId: string): number {
    let count = 0;
    for (const peer of this.getPeersInRoom(roomId)) {
      count += peer.transports.size;
    }
    return count;
  }
}

export const participantManager = new ParticipantManager();
