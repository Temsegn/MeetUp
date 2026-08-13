import { spawn, ChildProcess, execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { createServer } from 'net';
import { promisify } from 'util';
import { Server as SocketIOServer } from 'socket.io';
import {
  Consumer,
  PlainTransport,
  Producer,
  RtpCodecCapability,
} from 'mediasoup/types';
import { routerManager } from './router-manager';
import { producerManager } from './producer-manager';
import { participantManager } from './participant-manager';
import { logger } from '../../infrastructure/logging/logger';
import { env } from '../../config/env';
import type { MediaSource } from './media.types';

const execFileAsync = promisify(execFile);

interface RecordedProducer {
  producerId: string;
  participantId: string;
  source: MediaSource | string;
  kind: 'audio' | 'video';
  transport: PlainTransport;
  consumer: Consumer;
  ffmpeg?: ChildProcess;
  rtpPort: number;
  outputFile: string;
}

interface RoomRecording {
  roomId: string;
  recordingId: string;
  startedBy: string;
  startedAt: Date;
  outputDir: string;
  tracks: Map<string, RecordedProducer>;
}

export interface RecordingInfo {
  roomId: string;
  recordingId: string;
  startedBy: string;
  startedAt: string;
  outputDir: string;
  trackCount: number;
  files: string[];
}

/**
 * Server-side mediasoup recording via PlainTransport → FFmpeg.
 *
 * Architecture:
 *  - One RoomRecording per actively recording room
 *  - Each mediasoup Producer is forked to a PlainTransport Consumer
 *  - FFmpeg receives RTP on localhost and writes per-track WebM files
 *  - Files land in RECORDINGS_DIR/{roomId}/{recordingId}/
 *
 * Requires `ffmpeg` on PATH (or RECORDING_FFMPEG_PATH).
 */
export class RecordingManager {
  private io?: SocketIOServer;
  private recordings = new Map<string, RoomRecording>();
  private ffmpegAvailable: boolean | null = null;
  private ffmpegPath = env.RECORDING_FFMPEG_PATH || 'ffmpeg';
  private recordingsRoot =
    env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');

  public setIO(io: SocketIOServer): void {
    this.io = io;
  }

  public async ensureFfmpeg(): Promise<void> {
    if (this.ffmpegAvailable === true) return;
    try {
      await execFileAsync(this.ffmpegPath, ['-version']);
      this.ffmpegAvailable = true;
      logger.info('FFmpeg available for recording', { path: this.ffmpegPath });
    } catch {
      this.ffmpegAvailable = false;
      throw new Error(
        'FFmpeg is not available. Install ffmpeg and ensure it is on PATH, ' +
          'or set RECORDING_FFMPEG_PATH.',
      );
    }
  }

  public isRecording(roomId: string): boolean {
    return this.recordings.has(roomId);
  }

  public getRecordingInfo(roomId: string): RecordingInfo | null {
    const rec = this.recordings.get(roomId);
    if (!rec) return null;
    return {
      roomId: rec.roomId,
      recordingId: rec.recordingId,
      startedBy: rec.startedBy,
      startedAt: rec.startedAt.toISOString(),
      outputDir: rec.outputDir,
      trackCount: rec.tracks.size,
      files: Array.from(rec.tracks.values()).map((t) => t.outputFile),
    };
  }

  public async startRecording(
    roomId: string,
    startedByParticipantId: string,
  ): Promise<RecordingInfo> {
    if (this.recordings.has(roomId)) {
      throw new Error('Room is already being recorded');
    }

    await this.ensureFfmpeg();

    const router = routerManager.getRouter(roomId);
    if (!router) throw new Error(`No router for room ${roomId}`);

    const recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outputDir = path.join(this.recordingsRoot, roomId, recordingId);
    await fs.mkdir(outputDir, { recursive: true });

    const session: RoomRecording = {
      roomId,
      recordingId,
      startedBy: startedByParticipantId,
      startedAt: new Date(),
      outputDir,
      tracks: new Map(),
    };
    this.recordings.set(roomId, session);

    const producers = producerManager.getAllProducersInRoom(roomId);
    for (const p of producers) {
      try {
        await this._attachProducer(session, p.producerId, p.participantId, p.kind, p.source);
      } catch (err) {
        logger.error('Failed to attach producer to recording', {
          roomId,
          producerId: p.producerId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const info = this.getRecordingInfo(roomId)!;
    this.io?.to(roomId).emit('recording-started', {
      roomId,
      recordingId,
      startedBy: startedByParticipantId,
      startedAt: info.startedAt,
    });

    logger.info('Recording started', {
      roomId,
      recordingId,
      tracks: session.tracks.size,
      outputDir,
    });

    return info;
  }

  public async stopRecording(roomId: string): Promise<RecordingInfo | null> {
    const session = this.recordings.get(roomId);
    if (!session) return null;

    const info: RecordingInfo = {
      roomId: session.roomId,
      recordingId: session.recordingId,
      startedBy: session.startedBy,
      startedAt: session.startedAt.toISOString(),
      outputDir: session.outputDir,
      trackCount: session.tracks.size,
      files: Array.from(session.tracks.values()).map((t) => t.outputFile),
    };

    for (const track of session.tracks.values()) {
      await this._detachTrack(track);
    }
    session.tracks.clear();
    this.recordings.delete(roomId);

    this.io?.to(roomId).emit('recording-stopped', {
      roomId,
      recordingId: info.recordingId,
      outputDir: info.outputDir,
      files: info.files,
    });

    logger.info('Recording stopped', {
      roomId,
      recordingId: info.recordingId,
      files: info.files.length,
    });

    return info;
  }

  /** Attach a newly created producer if the room is recording. */
  public async onProducerCreated(
    roomId: string,
    producerId: string,
    participantId: string,
    kind: 'audio' | 'video',
    source: MediaSource | string,
  ): Promise<void> {
    const session = this.recordings.get(roomId);
    if (!session || session.tracks.has(producerId)) return;

    try {
      await this._attachProducer(session, producerId, participantId, kind, source);
      this.io?.to(roomId).emit('recording-track-added', {
        roomId,
        producerId,
        participantId,
        kind,
        source,
      });
    } catch (err) {
      logger.error('Recording attach on produce failed', {
        roomId,
        producerId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  public async onProducerClosed(roomId: string, producerId: string): Promise<void> {
    const session = this.recordings.get(roomId);
    if (!session) return;
    const track = session.tracks.get(producerId);
    if (!track) return;
    await this._detachTrack(track);
    session.tracks.delete(producerId);
  }

  /** Stop recording when room/router is torn down. */
  public async onRoomClosed(roomId: string): Promise<void> {
    if (this.recordings.has(roomId)) {
      await this.stopRecording(roomId);
    }
  }

  public async shutdown(): Promise<void> {
    const roomIds = Array.from(this.recordings.keys());
    for (const roomId of roomIds) {
      await this.stopRecording(roomId);
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async _attachProducer(
    session: RoomRecording,
    producerId: string,
    participantId: string,
    kind: 'audio' | 'video',
    source: MediaSource | string,
  ): Promise<void> {
    const router = routerManager.getRouter(session.roomId);
    if (!router) throw new Error('Router gone');

    const peer = participantManager.getPeer(session.roomId, participantId);
    const producer = peer?.producers.get(producerId) as Producer | undefined;
    if (!producer || producer.closed) {
      throw new Error(`Producer ${producerId} not found`);
    }

    const rtpPort = await this._getFreeUdpPort();

    const transport = await router.createPlainTransport({
      listenIp: { ip: '127.0.0.1', announcedIp: undefined },
      rtcpMux: true,
      comedia: false,
    });

    await transport.connect({ ip: '127.0.0.1', port: rtpPort });

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: router.rtpCapabilities,
      paused: true,
    });

    const safeSource = String(source).replace(/[^a-z0-9_-]/gi, '');
    const outputFile = path.join(
      session.outputDir,
      `${participantId.slice(0, 8)}_${safeSource}_${kind}_${producerId.slice(0, 8)}.webm`,
    );

    const sdp = this._createSdp(consumer, transport.tuple.localPort, rtpPort);
    const sdpPath = `${outputFile}.sdp`;
    await fs.writeFile(sdpPath, sdp);

    const ffmpeg = this._spawnFfmpeg(sdpPath, outputFile, kind);

    // Give FFmpeg a moment to open the UDP socket, then resume RTP.
    await new Promise((r) => setTimeout(r, 400));
    if (!consumer.closed) {
      await consumer.resume();
      if (kind === 'video') {
        try {
          await consumer.requestKeyFrame();
        } catch { /* non-critical */ }
      }
    }

    const track: RecordedProducer = {
      producerId,
      participantId,
      source,
      kind,
      transport,
      consumer,
      ffmpeg,
      rtpPort,
      outputFile,
    };
    session.tracks.set(producerId, track);

    consumer.on('producerclose', () => {
      void this.onProducerClosed(session.roomId, producerId);
    });

    logger.info('Recording track attached', {
      roomId: session.roomId,
      producerId,
      kind,
      source,
      outputFile,
    });
  }

  private async _detachTrack(track: RecordedProducer): Promise<void> {
    try {
      if (!track.consumer.closed) track.consumer.close();
    } catch { /* ignore */ }
    try {
      if (!track.transport.closed) track.transport.close();
    } catch { /* ignore */ }

    if (track.ffmpeg && !track.ffmpeg.killed) {
      await new Promise<void>((resolve) => {
        const proc = track.ffmpeg!;
        const done = () => resolve();
        proc.once('exit', done);
        proc.kill('SIGINT');
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
          done();
        }, 3000);
      });
    }

    // Clean SDP sidecar
    try {
      await fs.unlink(`${track.outputFile}.sdp`);
    } catch { /* ignore */ }
  }

  private _spawnFfmpeg(sdpPath: string, outputFile: string, kind: 'audio' | 'video'): ChildProcess {
    // Copy codecs when possible; fall back to libopus/libvpx if needed.
    const args = [
      '-loglevel', 'warning',
      '-protocol_whitelist', 'file,udp,rtp',
      '-fflags', '+genpts',
      '-i', sdpPath,
      '-map', '0:0',
      ...(kind === 'audio'
        ? ['-c:a', 'libopus', '-b:a', '128k']
        : ['-c:v', 'libvpx', '-b:v', '1000k', '-deadline', 'realtime', '-cpu-used', '4']),
      '-f', 'webm',
      '-y',
      outputFile,
    ];

    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    proc.stderr?.on('data', (buf: Buffer) => {
      const line = buf.toString().trim();
      if (line) logger.debug('ffmpeg', { line, outputFile });
    });

    proc.on('exit', (code, signal) => {
      logger.info('ffmpeg exited', { outputFile, code, signal });
    });

    return proc;
  }

  /**
   * Minimal SDP that points FFmpeg at the mediasoup PlainTransport tuple
   * and describes the consumer's negotiated codec.
   */
  private _createSdp(
    consumer: Consumer,
    localPort: number,
    remotePort: number,
  ): string {
    const codec = consumer.rtpParameters.codecs[0] as RtpCodecCapability & {
      payloadType: number;
      clockRate: number;
      channels?: number;
      mimeType: string;
      parameters?: Record<string, unknown>;
    };
    const payloadType = codec.payloadType;
    const mime = codec.mimeType.split('/')[1] || 'opus';
    const isAudio = consumer.kind === 'audio';
    const clockRate = codec.clockRate;
    const channels = codec.channels ?? 2;

    // mediasoup sends TO remotePort; FFmpeg listens on remotePort.
    // c= line uses 127.0.0.1; mediasoup plain transport localPort is source.
    void localPort;

    const lines = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=MeetUp Recording',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      `m=${isAudio ? 'audio' : 'video'} ${remotePort} RTP/AVP ${payloadType}`,
      `a=rtpmap:${payloadType} ${mime}/${clockRate}${isAudio ? `/${channels}` : ''}`,
      'a=recvonly',
    ];

    if (codec.parameters && Object.keys(codec.parameters).length > 0) {
      const fmtp = Object.entries(codec.parameters)
        .map(([k, v]) => `${k}=${v}`)
        .join(';');
      lines.push(`a=fmtp:${payloadType} ${fmtp}`);
    }

    return lines.join('\n') + '\n';
  }

  private _getFreeUdpPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      // TCP listen-and-close is a practical way to reserve an ephemeral port
      // number that we then use for UDP RTP toward FFmpeg.
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          server.close();
          reject(new Error('Failed to allocate port'));
          return;
        }
        const { port } = addr;
        server.close((err) => (err ? reject(err) : resolve(port)));
      });
      server.on('error', reject);
    });
  }
}

export const recordingManager = new RecordingManager();
