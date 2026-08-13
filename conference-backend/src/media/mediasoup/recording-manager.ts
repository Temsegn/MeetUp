import { spawn, ChildProcess, execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import dgram from 'dgram';
import { promisify } from 'util';
import { Server as SocketIOServer } from 'socket.io';
import {
  Consumer,
  PlainTransport,
  Producer,
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
  sdpPath: string;
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
 * Order (critical):
 *  1. Create PlainTransport
 *  2. Create paused Consumer
 *  3. Reserve UDP port + write SDP
 *  4. Start FFmpeg (listens on that port)
 *  5. transport.connect → consumer.resume → requestKeyFrame
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

    const producers = producerManager.getAllProducersInRoom(roomId);
    if (producers.length === 0) {
      throw new Error(
        'No media to record. Join with camera/mic on, wait until you see yourself, then start recording.',
      );
    }

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

    // Attach all producers in parallel — sequential waits made Record feel very slow
    await Promise.all(
      producers.map(async (p) => {
        try {
          await this._attachProducer(session, p.producerId, p.participantId, p.kind, p.source);
        } catch (err) {
          logger.error('Failed to attach producer to recording', {
            roomId,
            producerId: p.producerId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );

    if (session.tracks.size === 0) {
      this.recordings.delete(roomId);
      throw new Error(
        'Could not attach any media tracks for recording. Check server logs for FFmpeg/RTP errors.',
      );
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

    const tracks = Array.from(session.tracks.values());
    session.tracks.clear();
    this.recordings.delete(roomId);

    // Stop all tracks (close RTP + quit ffmpeg) in parallel
    await Promise.all(tracks.map((t) => this._detachTrack(t)));

    // Remux each file so browsers/players can open it (live WebM often lacks index)
    const playable: string[] = [];
    for (const track of tracks) {
      try {
        const finalized = await this._finalizeWebm(track.outputFile);
        if (finalized) playable.push(finalized);
      } catch (err) {
        logger.warn('Failed to finalize recording file', {
          file: track.outputFile,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const info: RecordingInfo = {
      roomId: session.roomId,
      recordingId: session.recordingId,
      startedBy: session.startedBy,
      startedAt: session.startedAt.toISOString(),
      outputDir: session.outputDir,
      trackCount: tracks.length,
      files: playable,
    };

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
      paths: info.files,
    });

    return info;
  }

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
      listenInfo: {
        protocol: 'udp',
        ip: '127.0.0.1',
      },
      rtcpMux: true,
      comedia: false,
    });

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: router.rtpCapabilities,
      paused: true,
    });

    // Prefer highest simulcast layer for recording quality
    if (consumer.type === 'simulcast' || consumer.type === 'svc') {
      try {
        await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
      } catch { /* non-critical */ }
    }

    const safeSource = String(source).replace(/[^a-z0-9_-]/gi, '');
    const outputFile = path.resolve(
      session.outputDir,
      `${participantId.slice(0, 8)}_${safeSource}_${kind}_${producerId.slice(0, 8)}.webm`,
    );
    const sdpPath = `${outputFile}.sdp`;

    const codec = consumer.rtpParameters.codecs[0];
    const sdp = this._createSdp({
      kind: consumer.kind,
      payloadType: codec.payloadType,
      mimeType: codec.mimeType,
      clockRate: codec.clockRate,
      channels: codec.channels,
      parameters: codec.parameters as Record<string, unknown> | undefined,
      rtpPort,
    });
    await fs.writeFile(sdpPath, sdp);

    // Start FFmpeg and wait until it is actually listening for RTP.
    const ffmpeg = this._spawnFfmpeg(sdpPath, outputFile, kind);
    await this._waitForFfmpegReady(ffmpeg, 3_000);

    await transport.connect({ ip: '127.0.0.1', port: rtpPort });

    if (!consumer.closed) {
      await consumer.resume();
      if (kind === 'video') {
        const keyframeInterval = setInterval(() => {
          if (consumer.closed) {
            clearInterval(keyframeInterval);
            return;
          }
          consumer.requestKeyFrame().catch(() => {});
        }, 2000);
        // Clear when producer closes / detach closes consumer
        consumer.on('transportclose', () => clearInterval(keyframeInterval));
        consumer.on('producerclose', () => clearInterval(keyframeInterval));
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
      sdpPath,
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
      codec: codec.mimeType,
      rtpPort,
      outputFile,
    });
  }

  private async _detachTrack(track: RecordedProducer): Promise<void> {
    // Stop RTP first so FFmpeg can finalize the container
    try {
      if (!track.consumer.closed) track.consumer.close();
    } catch { /* ignore */ }
    try {
      if (!track.transport.closed) track.transport.close();
    } catch { /* ignore */ }

    if (track.ffmpeg && track.ffmpeg.exitCode === null && !track.ffmpeg.killed) {
      await new Promise<void>((resolve) => {
        const proc = track.ffmpeg!;
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        proc.once('exit', done);

        // Graceful quit via stdin (Windows-safe). Guard against closed stdin.
        try {
          if (proc.stdin && !proc.stdin.destroyed && proc.stdin.writable) {
            proc.stdin.write('q');
            proc.stdin.end();
          } else {
            proc.kill();
          }
        } catch {
          try { proc.kill(); } catch { /* ignore */ }
        }

        setTimeout(() => {
          if (proc.exitCode === null) {
            try { proc.kill(); } catch { /* ignore */ }
          }
          done();
        }, 4000);
      });
    }

    try {
      await fs.unlink(track.sdpPath);
    } catch { /* ignore */ }
  }

  private _spawnFfmpeg(sdpPath: string, outputFile: string, _kind: 'audio' | 'video'): ChildProcess {
    const absSdp = path.resolve(sdpPath);
    const absOut = path.resolve(outputFile);

    // Copy RTP codecs (Opus/VP8) into WebM — much faster than re-encode and opens more reliably after remux.
    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      '-protocol_whitelist', 'file,udp,rtp',
      '-fflags', '+genpts+igndts',
      '-f', 'sdp',
      '-i', absSdp,
      '-map', '0:0',
      '-c', 'copy',
      '-flush_packets', '1',
      '-cluster_size_limit', '2M',
      '-cluster_time_limit', '5000',
      '-f', 'webm',
      '-y',
      absOut,
    ];

    logger.info('Spawning ffmpeg for recording', { args: args.join(' '), outputFile: absOut });

    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['pipe', 'ignore', 'pipe'],
      windowsHide: true,
    });

    proc.stderr?.on('data', (buf: Buffer) => {
      const line = buf.toString().trim();
      if (line) {
        logger.info('ffmpeg', { line, outputFile: absOut });
      }
    });

    proc.on('error', (err) => {
      logger.error('ffmpeg spawn error', { err: err.message, outputFile: absOut });
    });

    proc.on('exit', (code, signal) => {
      logger.info('ffmpeg exited', { outputFile: absOut, code, signal });
    });

    return proc;
  }

  /**
   * Wait until FFmpeg has parsed the SDP and is listening for RTP.
   * Connecting/resuming before this causes all UDP packets to be lost.
   */
  private _waitForFfmpegReady(proc: ChildProcess, ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (proc.exitCode !== null) {
        reject(new Error(`FFmpeg exited immediately with code ${proc.exitCode}`));
        return;
      }

      let ready = false;
      const onExit = (code: number | null) => {
        clearTimeout(timer);
        if (!ready) reject(new Error(`FFmpeg exited early with code ${code}`));
      };
      proc.once('exit', onExit);

      const onData = (buf: Buffer) => {
        const text = buf.toString();
        if (
          text.includes('Press [q]') ||
          text.includes('Stream mapping') ||
          text.includes('Output #0')
        ) {
          ready = true;
          clearTimeout(timer);
          proc.stderr?.off('data', onData);
          proc.off('exit', onExit);
          // Small delay so UDP bind is fully active
          setTimeout(resolve, 100);
        }
      };
      proc.stderr?.on('data', onData);

      const timer = setTimeout(() => {
        proc.stderr?.off('data', onData);
        proc.off('exit', onExit);
        // Proceed anyway — better than hanging forever
        logger.warn('FFmpeg ready timeout — proceeding with connect/resume');
        resolve();
      }, ms);
    });
  }

  private _createSdp(opts: {
    kind: 'audio' | 'video';
    payloadType: number;
    mimeType: string;
    clockRate: number;
    channels?: number;
    parameters?: Record<string, unknown>;
    rtpPort: number;
  }): string {
    const mime = opts.mimeType.split('/')[1] || (opts.kind === 'audio' ? 'opus' : 'VP8');
    const isAudio = opts.kind === 'audio';
    const channels = opts.channels ?? 2;

    const lines = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=MeetUp Recording',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      `m=${isAudio ? 'audio' : 'video'} ${opts.rtpPort} RTP/AVP ${opts.payloadType}`,
      `a=rtpmap:${opts.payloadType} ${mime}/${opts.clockRate}${isAudio ? `/${channels}` : ''}`,
      'a=recvonly',
      'a=rtcp-mux',
    ];

    if (opts.parameters && Object.keys(opts.parameters).length > 0) {
      const fmtp = Object.entries(opts.parameters)
        .map(([k, v]) => `${k}=${v}`)
        .join(';');
      if (fmtp) lines.push(`a=fmtp:${opts.payloadType} ${fmtp}`);
    }

    return `${lines.join('\r\n')}\r\n`;
  }

  /**
   * Remux live WebM into a playable file with a proper index/cues.
   * Live RTP→WebM often won't open in VLC/Chrome until remuxed.
   */
  private async _finalizeWebm(inputPath: string): Promise<string | null> {
    try {
      const st = await fs.stat(inputPath);
      if (st.size < 100) return null;
    } catch {
      return null;
    }

    const tmpPath = `${inputPath}.tmp.webm`;

    const remuxArgsSets: string[][] = [
      // Fast remux with cues/index
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath, '-c', 'copy', '-f', 'webm', tmpPath],
      // Re-encode fallback when live WebM is truncated / missing index
      [
        '-hide_banner', '-loglevel', 'error', '-y', '-err_detect', 'ignore_err',
        '-i', inputPath,
        '-c:v', 'libvpx', '-b:v', '1M',
        '-c:a', 'libopus', '-b:a', '128k',
        '-f', 'webm', tmpPath,
      ],
    ];

    for (const args of remuxArgsSets) {
      try {
        await execFileAsync(this.ffmpegPath, args);
        await fs.unlink(inputPath).catch(() => {});
        await fs.rename(tmpPath, inputPath);
        const finalStat = await fs.stat(inputPath);
        if (finalStat.size < 100) continue;
        logger.info('Recording file finalized', { file: inputPath, bytes: finalStat.size });
        return inputPath;
      } catch (err) {
        try { await fs.unlink(tmpPath); } catch { /* ignore */ }
        logger.warn('WebM finalize attempt failed', {
          inputPath,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    try {
      const st = await fs.stat(inputPath);
      return st.size > 100 ? inputPath : null;
    } catch {
      return null;
    }
  }

  /** Bind a real UDP socket so the port is reserved for FFmpeg. */
  private _getFreeUdpPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      socket.once('error', (err) => {
        try { socket.close(); } catch { /* ignore */ }
        reject(err);
      });
      socket.bind(0, '127.0.0.1', () => {
        const addr = socket.address();
        if (typeof addr === 'string') {
          socket.close();
          reject(new Error('Failed to allocate UDP port'));
          return;
        }
        const { port } = addr;
        // Close so FFmpeg can bind the same port immediately after.
        socket.close(() => resolve(port));
      });
    });
  }
}

export const recordingManager = new RecordingManager();
