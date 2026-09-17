/**
 * Silent in-page meeting recorder (no share picker, no pause dialog, no tab cover).
 *
 * Starts the moment the host clicks Record. Captures the live meeting UI like a
 * screen recording by:
 *  1. Snapshotting the full meeting DOM (controls, chat, text, panels, whiteboard chrome)
 *  2. Overlaying live <video> frames and whiteboard canvases every animation frame
 *
 * Browser uploads WebM; server converts to MP4.
 */

import { domToCanvas } from 'modern-screenshot';

export type MeetingRecorderStatus = 'idle' | 'recording' | 'stopping';

export interface StartMeetingRecordingOptions {
  /** Full meeting page root (header + stage + chat + controls). */
  stageEl: HTMLElement;
  getAudioStreams: () => MediaStream[];
  filePrefix?: string;
  onCaptureReady?: () => void;
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'video/webm';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export class MeetingScreenRecorder {
  private status: MeetingRecorderStatus = 'idle';
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private rafId = 0;
  private audioCtx: AudioContext | null = null;
  private canvasStream: MediaStream | null = null;
  private filePrefix = 'meeting';
  private startedAt = 0;

  private uiLayer: HTMLCanvasElement | null = null;
  private uiCaptureBusy = false;
  private lastUiCaptureAt = 0;
  private uiCaptureIntervalMs = 120;
  private stageEl: HTMLElement | null = null;

  public get isRecording(): boolean {
    return this.status === 'recording';
  }

  public get captureMode(): 'display' | 'canvas' {
    return 'canvas';
  }

  public async start(opts: StartMeetingRecordingOptions): Promise<void> {
    if (this.status !== 'idle') throw new Error('Already recording');
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    this.filePrefix = opts.filePrefix || 'meeting';
    this.chunks = [];
    this.startedAt = Date.now();
    this.stageEl = opts.stageEl;
    this.uiLayer = null;
    this.lastUiCaptureAt = 0;

    opts.onCaptureReady?.();
    // One frame for React layout (panels already open) — no picker, no pause.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const rect = opts.stageEl.getBoundingClientRect();
    const w = Math.max(2, Math.floor(rect.width));
    const h = Math.max(2, Math.floor(rect.height));
    const scale = Math.min(1, 1920 / w, 1080 / h);
    let cw = Math.max(2, Math.floor(w * scale));
    let ch = Math.max(2, Math.floor(h * scale));
    if (cw % 2) cw += 1;
    if (ch % 2) ch += 1;

    this.canvas = document.createElement('canvas');
    this.canvas.width = cw;
    this.canvas.height = ch;
    // Keep off-DOM so it is never visible as a cover on the meeting.
    this.canvas.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create canvas context');

    // First UI snapshot before MediaRecorder starts so the first second isn't blank.
    await this._captureUiLayer(opts.stageEl);
    this._paintFrame(ctx, this.canvas, opts.stageEl);

    const draw = () => {
      if (!this.canvas || this.status !== 'recording') return;
      const c = this.canvas.getContext('2d', { alpha: false });
      if (c) this._paintFrame(c, this.canvas, opts.stageEl);
      this.rafId = requestAnimationFrame(draw);
    };

    this.canvasStream = this.canvas.captureStream(30);

    const { mixed, audioCtx } = this._mixAudio(opts.getAudioStreams);
    this.audioCtx = audioCtx;
    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});

    const combined = new MediaStream([
      ...this.canvasStream.getVideoTracks(),
      ...mixed.getAudioTracks(),
    ]);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
      audioBitsPerSecond: 128_000,
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data?.size) this.chunks.push(ev.data);
    };

    this.mediaRecorder = recorder;
    this.status = 'recording';
    recorder.start(1000);
    draw();
  }

  public async stop(options?: { downloadLocal?: boolean }): Promise<{ blob: Blob; filename: string } | null> {
    if (this.status !== 'recording' || !this.mediaRecorder) return null;
    this.status = 'stopping';

    const blob = await new Promise<Blob>((resolve, reject) => {
      const rec = this.mediaRecorder!;
      rec.onerror = () => reject(new Error('MediaRecorder failed'));
      rec.onstop = () => resolve(new Blob(this.chunks, { type: rec.mimeType || 'video/webm' }));
      try {
        if (rec.state !== 'inactive') rec.stop();
        else resolve(new Blob(this.chunks, { type: 'video/webm' }));
      } catch (err) {
        reject(err);
      }
    }).finally(() => this._cleanupCapture());

    this.status = 'idle';
    this.chunks = [];
    if (blob.size < 256) return null;

    const secs = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    const filename = `${this.filePrefix}-${new Date(this.startedAt).toISOString().replace(/[:.]/g, '-')}-${secs}s.webm`;
    if (options?.downloadLocal) downloadBlob(blob, filename);
    return { blob, filename };
  }

  public async cancel(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this._cleanupCapture();
    this.chunks = [];
    this.status = 'idle';
  }

  private _paintFrame(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    stageEl: HTMLElement,
  ): void {
    const rect = stageEl.getBoundingClientRect();
    const w = Math.max(2, Math.floor(rect.width));
    const h = Math.max(2, Math.floor(rect.height));
    const scale = Math.min(1, 1920 / w, 1080 / h);
    let cw = Math.max(2, Math.floor(w * scale));
    let ch = Math.max(2, Math.floor(h * scale));
    if (cw % 2) cw += 1;
    if (ch % 2) ch += 1;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const now = Date.now();
    if (now - this.lastUiCaptureAt >= this.uiCaptureIntervalMs && !this.uiCaptureBusy) {
      this.lastUiCaptureAt = now;
      void this._captureUiLayer(stageEl);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.uiLayer && this.uiLayer.width > 0) {
      ctx.drawImage(this.uiLayer, 0, 0, canvas.width, canvas.height);
    }

    const sx = canvas.width / w;
    const sy = canvas.height / h;

    // Live video tiles (DOM snapshot often misses <video> frames).
    stageEl.querySelectorAll<HTMLElement>('[data-meeting-tile]').forEach((tile) => {
      const video = tile.querySelector('video');
      if (!video || video.readyState < 2 || !video.videoWidth || !video.srcObject) return;
      if (video.paused) void video.play().catch(() => {});

      const tr = tile.getBoundingClientRect();
      const x = (tr.left - rect.left) * sx;
      const y = (tr.top - rect.top) * sy;
      const tw = tr.width * sx;
      const th = tr.height * sy;
      if (tw < 2 || th < 2) return;

      const radius = Math.min(14 * sx, tw / 6, th / 6);
      ctx.save();
      this._roundRect(ctx, x, y, tw, th, radius);
      ctx.clip();
      this._drawVideoCover(ctx, video, x, y, tw, th, tile.dataset.meetingScreen === '1');
      ctx.restore();
    });

    // Live whiteboard ink (Excalidraw canvases) — every frame so drawings stay current.
    const board = stageEl.querySelector<HTMLElement>('[data-meeting-whiteboard]');
    if (board) {
      board.querySelectorAll('canvas').forEach((c) => {
        if (c.width < 2 || c.height < 2) return;
        const cr = c.getBoundingClientRect();
        if (cr.width < 2 || cr.height < 2) return;
        const x = (cr.left - rect.left) * sx;
        const y = (cr.top - rect.top) * sy;
        const tw = cr.width * sx;
        const th = cr.height * sy;
        try {
          ctx.drawImage(c, x, y, tw, th);
        } catch {
          /* tainted */
        }
      });
    }
  }

  private async _captureUiLayer(stageEl: HTMLElement): Promise<void> {
    if (this.uiCaptureBusy) return;
    this.uiCaptureBusy = true;
    try {
      const rect = stageEl.getBoundingClientRect();
      const w = Math.max(2, Math.floor(rect.width));
      const scale = Math.min(1, 1920 / w, 1);

      const snap = await domToCanvas(stageEl, {
        scale,
        backgroundColor: '#ffffff',
        // Skip live media — we overlay those every frame.
        filter: (el) => {
          if (el instanceof HTMLVideoElement) return false;
          if (el instanceof HTMLAudioElement) return false;
          if (el instanceof HTMLCanvasElement && el === this.canvas) return false;
          return true;
        },
      });
      this.uiLayer = snap;
    } catch (err) {
      console.warn('[recorder] UI snapshot failed', err);
    } finally {
      this.uiCaptureBusy = false;
    }
  }

  private _drawVideoCover(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    tw: number,
    th: number,
    contain: boolean,
  ): void {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    if (contain) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, tw, th);
      const scale = Math.min(tw / vw, th / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, x + (tw - dw) / 2, y + (th - dh) / 2, dw, dh);
      return;
    }

    const scale = Math.max(tw / vw, th / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(video, x + (tw - dw) / 2, y + (th - dh) / 2, dw, dh);
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private _mixAudio(getAudioStreams: () => MediaStream[]): {
    mixed: MediaStream;
    audioCtx: AudioContext;
  } {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const connectedTrackIds = new Set<string>();

    const connectStream = (stream: MediaStream) => {
      const audioTracks = stream
        .getAudioTracks()
        .filter((t) => t.readyState === 'live' && !connectedTrackIds.has(t.id));
      if (!audioTracks.length) return;
      for (const t of audioTracks) connectedTrackIds.add(t.id);
      try {
        audioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(dest);
      } catch {
        for (const t of audioTracks) connectedTrackIds.delete(t.id);
      }
    };

    for (const s of getAudioStreams()) connectStream(s);
    const interval = window.setInterval(() => {
      if (this.status !== 'recording') {
        window.clearInterval(interval);
        return;
      }
      for (const s of getAudioStreams()) connectStream(s);
    }, 2000);
    (audioCtx as AudioContext & { __mixInterval?: number }).__mixInterval = interval;
    return { mixed: dest.stream, audioCtx };
  }

  private _cleanupCapture(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.canvasStream?.getTracks().forEach((t) => t.stop());
    this.canvasStream = null;
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.canvas = null;
    this.uiLayer = null;
    this.stageEl = null;
    this.mediaRecorder = null;
    if (this.audioCtx) {
      const interval = (this.audioCtx as AudioContext & { __mixInterval?: number }).__mixInterval;
      if (interval) window.clearInterval(interval);
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
