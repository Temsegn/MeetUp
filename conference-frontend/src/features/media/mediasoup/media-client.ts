import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer } from 'mediasoup-client/types';
import { socketClient } from '../../../services/socket/socket-client';

export class MediaClient {
  private device: Device;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();

  constructor() {
    this.device = new Device();
  }

  public async initializeDevice(routerRtpCapabilities: any): Promise<void> {
    if (!this.device.loaded) {
      await this.device.load({ routerRtpCapabilities });
      console.log('Mediasoup device loaded');
    }
  }

  public async createSendTransport(roomId: string, peerId: string): Promise<Transport> {
    const socket = socketClient.getSocket();
    if (!socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      socket.emit('create-webrtc-transport', { roomId, peerId }, (res: any) => {
        if (res.error) return reject(new Error(res.error));

        this.sendTransport = this.device.createSendTransport(res.params);

        this.sendTransport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (err: Error) => void) => {
          socket.emit('connect-transport', { roomId, peerId, transportId: this.sendTransport!.id, dtlsParameters }, (connectRes: any) => {
            if (connectRes.error) return errback(new Error(connectRes.error));
            callback();
          });
        });

        this.sendTransport.on('produce', ({ kind, rtpParameters, appData }: any, callback: (res: { id: string }) => void, errback: (err: Error) => void) => {
          socket.emit('produce', { roomId, peerId, transportId: this.sendTransport!.id, kind, rtpParameters, appData }, (produceRes: any) => {
            if (produceRes.error) return errback(new Error(produceRes.error));
            callback({ id: produceRes.id });
          });
        });

        resolve(this.sendTransport);
      });
    });
  }

  public async createRecvTransport(roomId: string, peerId: string): Promise<Transport> {
    const socket = socketClient.getSocket();
    if (!socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      socket.emit('create-webrtc-transport', { roomId, peerId }, (res: any) => {
        if (res.error) return reject(new Error(res.error));

        this.recvTransport = this.device.createRecvTransport(res.params);

        this.recvTransport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (err: Error) => void) => {
          socket.emit('connect-transport', { roomId, peerId, transportId: this.recvTransport!.id, dtlsParameters }, (connectRes: any) => {
            if (connectRes.error) return errback(new Error(connectRes.error));
            callback();
          });
        });

        resolve(this.recvTransport);
      });
    });
  }

  public async produce(track: MediaStreamTrack, appData?: any): Promise<Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not initialized');
    }

    const producer = await this.sendTransport.produce({ track, appData });
    this.producers.set(producer.id, producer);
    return producer;
  }

  public async consume(roomId: string, peerId: string, producerId: string): Promise<Consumer> {
    if (!this.recvTransport) {
      throw new Error('Receive transport not initialized');
    }
    const socket = socketClient.getSocket();
    if (!socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      socket.emit('consume', {
        roomId,
        peerId,
        transportId: this.recvTransport!.id,
        producerId,
        rtpCapabilities: this.device.rtpCapabilities
      }, async (res: any) => {
        if (res.error) return reject(new Error(res.error));

        const consumer = await this.recvTransport!.consume(res.params);
        this.consumers.set(consumer.id, consumer);

        socket.emit('resume-consumer', { roomId, peerId, consumerId: consumer.id }, (resumeRes: any) => {
          if (resumeRes.error) return reject(new Error(resumeRes.error));
          resolve(consumer);
        });
      });
    });
  }

  public getDevice() {
    return this.device;
  }

  public getLocalProducers(): Producer[] {
    return Array.from(this.producers.values());
  }

  public async pauseProducer(roomId: string, peerId: string, producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.pause();
      const socket = socketClient.getSocket();
      if (!socket) return;
      return new Promise((resolve, reject) => {
        socket.emit('pause-producer', { roomId, peerId, producerId }, (res: any) => {
          if (res?.error) return reject(new Error(res.error));
          resolve();
        });
      });
    }
  }

  public async resumeProducer(roomId: string, peerId: string, producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.resume();
      const socket = socketClient.getSocket();
      if (!socket) return;
      return new Promise((resolve, reject) => {
        socket.emit('resume-producer', { roomId, peerId, producerId }, (res: any) => {
          if (res?.error) return reject(new Error(res.error));
          resolve();
        });
      });
    }
  }

  public async closeProducer(roomId: string, peerId: string, producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      const socket = socketClient.getSocket();
      if (!socket) return;
      return new Promise((resolve, reject) => {
        socket.emit('close-producer', { roomId, peerId, producerId }, (res: any) => {
          if (res?.error) return reject(new Error(res.error));
          resolve();
        });
      });
    }
  }
}

export const mediaClient = new MediaClient();
