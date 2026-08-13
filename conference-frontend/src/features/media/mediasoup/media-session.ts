import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';

export type MediaSource = 'camera' | 'microphone' | 'screen';

/**
 * A session-scoped mediasoup client.
 *
 * Lifecycle:
 *   1. new MediaSession(socket, roomId, participantId)
 *   2. await session.initialize(routerRtpCapabilities)
 *   3. await session.createTransports()
 *   4. Use produce() / consume() during the meeting
 *   5. await session.cleanup() on leave — closes everything
 *
 * This class is NOT a singleton. A new instance is created for each meeting.
 */
export class MediaSession {
  private device: Device;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();

  constructor(
    private readonly socket: Socket,
    private readonly roomId: string,
    _participantId: string,
  ) {
    this.device = new Device();
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  public async initialize(routerRtpCapabilities: unknown): Promise<void> {
    if (!this.device.loaded) {
      await this.device.load({ routerRtpCapabilities: routerRtpCapabilities as any });
    }
  }

  public async createSendTransport(): Promise<void> {
    this.sendTransport = await this._createTransport('send');
  }

  public async createRecvTransport(): Promise<void> {
    this.recvTransport = await this._createTransport('recv');
  }

  private _createTransport(direction: 'send' | 'recv'): Promise<Transport> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'create-webrtc-transport',
        { roomId: this.roomId, direction },
        (res: any) => {
          if (res?.error) return reject(new Error(res.error));

          const transport =
            direction === 'send'
              ? this.device.createSendTransport(res.params)
              : this.device.createRecvTransport(res.params);

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            this.socket.emit(
              'connect-transport',
              {
                roomId: this.roomId,
                transportId: transport.id,
                dtlsParameters,
              },
              (connectRes: any) => {
                if (connectRes?.error) return errback(new Error(connectRes.error));
                callback();
              },
            );
          });

          if (direction === 'send') {
            transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
              this.socket.emit(
                'produce',
                {
                  roomId: this.roomId,
                  transportId: transport.id,
                  kind,
                  rtpParameters,
                  appData,
                },
                (produceRes: any) => {
                  if (produceRes?.error) return errback(new Error(produceRes.error));
                  callback({ id: produceRes.id });
                },
              );
            });
          }

          resolve(transport);
        },
      );
    });
  }

  // ── Producing ──────────────────────────────────────────────────────────────

  /**
   * Produce a track. For camera video, simulcast encodings are applied automatically.
   */
  public async produce(
    track: MediaStreamTrack,
    source: MediaSource,
    simulcast = false,
  ): Promise<Producer> {
    if (!this.sendTransport) throw new Error('Send transport not initialized');

    const encodings =
      simulcast && track.kind === 'video'
        ? [
            { rid: 'r0', maxBitrate: 100_000, scaleResolutionDownBy: 4 },
            { rid: 'r1', maxBitrate: 300_000, scaleResolutionDownBy: 2 },
            { rid: 'r2', maxBitrate: 900_000, scaleResolutionDownBy: 1 },
          ]
        : undefined;

    const producer = await this.sendTransport.produce({
      track,
      encodings,
      codecOptions: track.kind === 'audio' ? { opusStereo: true, opusDtx: true } : undefined,
      appData: { source },
    });

    this.producers.set(producer.id, producer);

    producer.on('transportclose', () => this.producers.delete(producer.id));
    producer.on('trackended', () => this.producers.delete(producer.id));

    return producer;
  }

  // ── Consuming ──────────────────────────────────────────────────────────────

  public async consume(producerId: string): Promise<Consumer> {
    if (!this.recvTransport) throw new Error('Recv transport not initialized');

    return new Promise((resolve, reject) => {
      this.socket.emit(
        'consume',
        {
          roomId:          this.roomId,
          transportId:     this.recvTransport!.id,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        },
        async (res: any) => {
          if (res?.error) return reject(new Error(res.error));

          const consumer = await this.recvTransport!.consume(res.params);
          this.consumers.set(consumer.id, consumer);

          consumer.on('transportclose', () => {
            this.consumers.delete(consumer.id);
          });

          // Resume after track is ready
          this.socket.emit(
            'resume-consumer',
            { roomId: this.roomId, consumerId: consumer.id },
            (resumeRes: any) => {
              if (resumeRes?.error) return reject(new Error(resumeRes.error));
              resolve(consumer);
            },
          );
        },
      );
    });
  }

  // ── Producer controls ──────────────────────────────────────────────────────

  public async pauseProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (!producer || producer.paused) return;
    producer.pause();
    await this._emitAck('pause-producer', { roomId: this.roomId, producerId });
  }

  public async resumeProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (!producer || !producer.paused) return;
    producer.resume();
    await this._emitAck('resume-producer', { roomId: this.roomId, producerId });
  }

  public async closeProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (!producer) return;
    if (!producer.closed) producer.close();
    this.producers.delete(producerId);
    await this._emitAck('close-producer', { roomId: this.roomId, producerId });
  }

  public getProducers(): Producer[] {
    return Array.from(this.producers.values());
  }

  public getProducersBySource(source: MediaSource): Producer[] {
    return this.getProducers().filter(p => (p.appData as any)?.source === source);
  }

  // ── Consumer controls ──────────────────────────────────────────────────────

  public closeConsumerById(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return;
    if (!consumer.closed) consumer.close();
    this.consumers.delete(consumerId);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  /**
   * Full session cleanup — called on meeting leave.
   * Closes producers → consumers → transports → disconnects socket.
   */
  public async cleanup(): Promise<void> {
    // Close all producers
    for (const [id, producer] of this.producers.entries()) {
      try {
        if (!producer.closed) producer.close();
        this.socket.emit('close-producer', { roomId: this.roomId, producerId: id });
      } catch { /* best-effort */ }
    }
    this.producers.clear();

    // Stop all consumer tracks and close
    for (const consumer of this.consumers.values()) {
      try {
        consumer.track?.stop();
        if (!consumer.closed) consumer.close();
      } catch { /* best-effort */ }
    }
    this.consumers.clear();

    // Close transports
    if (this.sendTransport && !this.sendTransport.closed) this.sendTransport.close();
    if (this.recvTransport && !this.recvTransport.closed) this.recvTransport.close();
    this.sendTransport = null;
    this.recvTransport = null;

    // Notify server
    this.socket.emit('leave-room', { roomId: this.roomId });

    // Disconnect socket
    this.socket.disconnect();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _emitAck(event: string, payload: object): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(event, payload, () => resolve());
    });
  }
}
