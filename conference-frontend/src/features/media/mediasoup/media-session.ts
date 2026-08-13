import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer, IceParameters } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';

export type MediaSource = 'camera' | 'microphone' | 'screen';

/**
 * A session-scoped mediasoup client.
 *
 * Lifecycle:
 *   1. new MediaSession(socket, roomId, participantId)
 *   2. await session.initialize(routerRtpCapabilities)
 *   3. await session.createSendTransport() / createRecvTransport()
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
  private consumedProducerIds = new Set<string>();
  private simulcastEncodings?: object[];
  private screenShareEncodings?: object[];
  private iceHandlerAttached = false;

  constructor(
    private readonly socket: Socket,
    private readonly roomId: string,
    _participantId: string,
  ) {
    this.device = new Device();
  }

  public setEncodingConfig(opts: {
    simulcastEncodings?: object[];
    screenShareEncodings?: object[];
  }): void {
    this.simulcastEncodings = opts.simulcastEncodings;
    this.screenShareEncodings = opts.screenShareEncodings;
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  public async initialize(routerRtpCapabilities: unknown): Promise<void> {
    if (!this.device.loaded) {
      await this.device.load({ routerRtpCapabilities: routerRtpCapabilities as any });
    }
    this._attachIceRestartListener();
  }

  public async createSendTransport(): Promise<void> {
    this.sendTransport = await this._createTransport('send');
  }

  public async createRecvTransport(): Promise<void> {
    this.recvTransport = await this._createTransport('recv');
  }

  private _attachIceRestartListener(): void {
    if (this.iceHandlerAttached) return;
    this.iceHandlerAttached = true;

    this.socket.on('ice-restart', async ({ transportId, iceParameters }: {
      transportId: string;
      iceParameters: IceParameters;
    }) => {
      try {
        const transport =
          this.sendTransport?.id === transportId
            ? this.sendTransport
            : this.recvTransport?.id === transportId
              ? this.recvTransport
              : null;
        if (!transport || transport.closed) return;
        await transport.restartIce({ iceParameters });
      } catch (err) {
        console.error('[MediaSession] ICE restart apply failed', err);
      }
    });
  }

  private _createTransport(direction: 'send' | 'recv'): Promise<Transport> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'create-webrtc-transport',
        { roomId: this.roomId, direction },
        (res: any) => {
          if (res?.error) return reject(new Error(res.error));

          const params = res.params;
          const transport =
            direction === 'send'
              ? this.device.createSendTransport({
                  ...params,
                  iceServers: params.iceServers,
                })
              : this.device.createRecvTransport({
                  ...params,
                  iceServers: params.iceServers,
                });

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

          transport.on('connectionstatechange', (state) => {
            if (state === 'failed') {
              console.warn(`[MediaSession] ${direction} transport connection failed`, transport.id);
            }
          });

          resolve(transport);
        },
      );
    });
  }

  // ── Producing ──────────────────────────────────────────────────────────────

  public async produce(
    track: MediaStreamTrack,
    source: MediaSource,
    simulcast = false,
  ): Promise<Producer> {
    if (!this.sendTransport) throw new Error('Send transport not initialized');

    let encodings: object[] | undefined;
    if (source === 'screen' && this.screenShareEncodings?.length) {
      encodings = this.screenShareEncodings;
    } else if (simulcast && track.kind === 'video') {
      encodings = this.simulcastEncodings ?? [
        { rid: 'r0', maxBitrate: 100_000, scaleResolutionDownBy: 4 },
        { rid: 'r1', maxBitrate: 300_000, scaleResolutionDownBy: 2 },
        { rid: 'r2', maxBitrate: 900_000, scaleResolutionDownBy: 1 },
      ];
    }

    const producer = await this.sendTransport.produce({
      track,
      encodings: encodings as any,
      codecOptions: track.kind === 'audio' ? { opusStereo: true, opusDtx: true } : undefined,
      appData: { source },
    });

    this.producers.set(producer.id, producer);

    producer.on('transportclose', () => this.producers.delete(producer.id));
    producer.on('trackended', () => {
      void this.closeProducer(producer.id);
    });

    return producer;
  }

  // ── Consuming ──────────────────────────────────────────────────────────────

  public async consume(producerId: string): Promise<Consumer> {
    if (!this.recvTransport) throw new Error('Recv transport not initialized');
    if (this.consumedProducerIds.has(producerId)) {
      const existing = Array.from(this.consumers.values()).find((c) => c.producerId === producerId);
      if (existing && !existing.closed) return existing;
    }

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
          this.consumedProducerIds.add(producerId);

          consumer.on('transportclose', () => {
            this.consumers.delete(consumer.id);
            this.consumedProducerIds.delete(producerId);
          });

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

  public getConsumerByProducerId(producerId: string): Consumer | undefined {
    return Array.from(this.consumers.values()).find((c) => c.producerId === producerId);
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
    return this.getProducers().filter((p) => (p.appData as any)?.source === source);
  }

  // ── Consumer controls ──────────────────────────────────────────────────────

  public closeConsumerById(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return;
    this.consumedProducerIds.delete(consumer.producerId);
    if (!consumer.closed) consumer.close();
    this.consumers.delete(consumerId);
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  public startRecording(): Promise<{ recording: boolean; info?: unknown; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('start-recording', { roomId: this.roomId }, (res: any) => resolve(res ?? {}));
    });
  }

  public stopRecording(): Promise<{ recording: boolean; info?: unknown; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('stop-recording', { roomId: this.roomId }, (res: any) => resolve(res ?? {}));
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public async cleanup(): Promise<void> {
    this.socket.off('ice-restart');
    this.iceHandlerAttached = false;

    for (const [id, producer] of this.producers.entries()) {
      try {
        if (!producer.closed) producer.close();
        this.socket.emit('close-producer', { roomId: this.roomId, producerId: id });
      } catch { /* best-effort */ }
    }
    this.producers.clear();

    for (const consumer of this.consumers.values()) {
      try {
        consumer.track?.stop();
        if (!consumer.closed) consumer.close();
      } catch { /* best-effort */ }
    }
    this.consumers.clear();
    this.consumedProducerIds.clear();

    if (this.sendTransport && !this.sendTransport.closed) this.sendTransport.close();
    if (this.recvTransport && !this.recvTransport.closed) this.recvTransport.close();
    this.sendTransport = null;
    this.recvTransport = null;

    this.socket.emit('leave-room', { roomId: this.roomId });
    this.socket.disconnect();
  }

  private _emitAck(event: string, payload: object): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(event, payload, () => resolve());
    });
  }
}
