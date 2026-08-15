/**
 * In-page meeting recorder (no getDisplayMedia → no Chrome “Sharing this tab” bar).
 *
 * Composites onto a canvas:
 *  - participant / screen-share <video> tiles
 *  - chat messages from the sidebar DOM
 *  - mixed WebRTC audio
 *
 * Browser uploads WebM; server converts to MP4.
 */

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
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

  public get isRecording(): boolean {
    return this.status === 'recording';
  }

  public async start(opts: StartMeetingRecordingOptions): Promise<void> {
    if (this.status !== 'idle') throw new Error('Already recording');
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    this.filePrefix = opts.filePrefix || 'meeting';
    this.chunks = [];
    this.startedAt = Date.now();

    opts.onCaptureReady?.();
    // Let React open chat before first paint
    await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 80)));

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create canvas context');

    const draw = () => {
      if (!this.canvas) return;
      this._paintMeeting(ctx, this.canvas, opts.stageEl);
      this.rafId = requestAnimationFrame(draw);
    };
    draw();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

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
      videoBitsPerSecond: 3_500_000,
      audioBitsPerSecond: 128_000,
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data?.size) this.chunks.push(ev.data);
    };

    this.mediaRecorder = recorder;
    this.status = 'recording';
    recorder.start(1000);
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
      try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
    this._cleanupCapture();
    this.chunks = [];
    this.status = 'idle';
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private _paintMeeting(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    stageEl: HTMLElement,
  ): void {
    const root = stageEl;
    const rect = root.getBoundingClientRect();
    const w = Math.max(2, Math.floor(rect.width));
    const h = Math.max(2, Math.floor(rect.height));
    const scale = Math.min(1, 1920 / w, 1080 / h);
    // libx264 requires even width/height — odd sizes make MP4 conversion fail
    let cw = Math.max(2, Math.floor(w * scale));
    let ch = Math.max(2, Math.floor(h * scale));
    if (cw % 2) cw += 1;
    if (ch % 2) ch += 1;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const sx = canvas.width / w;
    const sy = canvas.height / h;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, Math.max(36, 52 * sy));
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${Math.max(12, 14 * sy)}px system-ui,sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const roomLabel = root.getAttribute('data-room-id') || 'Meeting';
    ctx.fillText(roomLabel, 16 * sx, 26 * sy);

    // Video tiles
    root.querySelectorAll<HTMLElement>('[data-meeting-tile]').forEach((tile) => {
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

      const video = tile.querySelector('video');
      const hasVideo =
        video && video.readyState >= 2 && video.videoWidth > 0 && video.srcObject;

      if (hasVideo && video) {
        this._drawVideoCover(ctx, video, x, y, tw, th, tile.dataset.meetingScreen === '1');
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, tw, th);
        const name = tile.dataset.participantName || '?';
        const size = Math.min(tw, th) * 0.32;
        ctx.beginPath();
        ctx.arc(x + tw / 2, y + th / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `600 ${Math.max(12, size * 0.45)}px system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.charAt(0).toUpperCase(), x + tw / 2, y + th / 2);
      }

      const name = tile.dataset.participantName;
      if (name) {
        const barH = Math.max(20, th * 0.11);
        const grad = ctx.createLinearGradient(x, y + th - barH, x, y + th);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y + th - barH, tw, barH);
        ctx.fillStyle = '#fff';
        ctx.font = `500 ${Math.max(10, barH * 0.45)}px system-ui,sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const label = tile.dataset.meetingLocal === '1' ? `${name} (You)` : name;
        ctx.fillText(label, x + 8, y + th - barH / 2, tw - 16);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(51,65,85,0.95)';
      ctx.lineWidth = Math.max(1, 2 * sx);
      this._roundRect(ctx, x, y, tw, th, radius);
      ctx.stroke();
    });

    // Chat panel (drawn from DOM messages — no browser share UI)
    this._paintChat(ctx, root, rect, sx, sy);

    // Horizontal elapsed timeline (minutes:seconds) — burned into the video
    this._paintTimeline(ctx, canvas);
  }

  private _paintTimeline(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const elapsedMs = Math.max(0, Date.now() - this.startedAt);
    const totalSec = Math.floor(elapsedMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const label = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    const barH = Math.max(28, Math.round(canvas.height * 0.045));
    const y = canvas.height - barH;
    const pad = Math.max(12, canvas.width * 0.02);

    // Bottom bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, y, canvas.width, barH);

    // Red REC pill + time
    const pillW = Math.max(90, canvas.width * 0.11);
    ctx.fillStyle = '#dc2626';
    this._roundRect(ctx, pad, y + barH * 0.22, pillW, barH * 0.56, barH * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(11, barH * 0.38)}px ui-monospace,Consolas,monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`● ${label}`, pad + pillW / 2, y + barH / 2);

    // Horizontal timeline track (fills over each rolling 10-minute window)
    const trackX = pad + pillW + pad;
    const trackW = canvas.width - trackX - pad;
    const trackY = y + barH * 0.42;
    const trackH = Math.max(4, barH * 0.18);
    ctx.fillStyle = '#334155';
    this._roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
    ctx.fill();

    const windowSec = 10 * 60; // 10 minutes per full bar cycle
    const progress = Math.min(1, (totalSec % windowSec) / windowSec);
    if (progress > 0) {
      ctx.fillStyle = '#38bdf8';
      this._roundRect(ctx, trackX, trackY, Math.max(trackH, trackW * progress), trackH, trackH / 2);
      ctx.fill();
    }

    // Minute tick marks
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.max(9, barH * 0.28)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let m = 0; m <= 10; m += 2) {
      const tx = trackX + (trackW * m) / 10;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(tx, trackY - 3, 1, trackH + 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${m}m`, tx, trackY + trackH + 2);
    }
  }

  private _paintChat(
    ctx: CanvasRenderingContext2D,
    root: HTMLElement,
    rootRect: DOMRect,
    sx: number,
    sy: number,
  ): void {
    const chatEl = root.querySelector<HTMLElement>('[data-meeting-chat]');
    if (!chatEl) return;

    const cr = chatEl.getBoundingClientRect();
    const x = (cr.left - rootRect.left) * sx;
    const y = (cr.top - rootRect.top) * sy;
    const tw = cr.width * sx;
    const th = cr.height * sy;
    if (tw < 40 || th < 40) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, tw, th);

    ctx.fillStyle = '#60a5fa';
    ctx.font = `600 ${Math.max(11, 13 * sy)}px system-ui,sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Chat', x + 12 * sx, y + 10 * sy);

    const messages = Array.from(
      chatEl.querySelectorAll<HTMLElement>('[data-meeting-chat-message]'),
    );
    const pad = 12 * sx;
    const maxBubble = tw - pad * 2;
    let cursorY = y + 32 * sy;

    for (const msg of messages.slice(-40)) {
      const sender = msg.dataset.sender || 'User';
      const own = msg.dataset.own === '1';
      const text = (msg.dataset.content || msg.textContent || '').trim();
      if (!text) continue;

      ctx.font = `500 ${Math.max(9, 10 * sy)}px system-ui,sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = own ? 'right' : 'left';
      const senderX = own ? x + tw - pad : x + pad;
      ctx.fillText(sender, senderX, cursorY, maxBubble);
      cursorY += 14 * sy;

      ctx.font = `400 ${Math.max(10, 12 * sy)}px system-ui,sans-serif`;
      const lines = wrapText(ctx, text, maxBubble - 16 * sx);
      const lineH = Math.max(14, 16 * sy);
      const bubbleH = lines.length * lineH + 12 * sy;
      const bubbleW = Math.min(
        maxBubble,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20 * sx,
      );
      const bx = own ? x + tw - pad - bubbleW : x + pad;

      ctx.fillStyle = own ? '#2563eb' : '#334155';
      this._roundRect(ctx, bx, cursorY, bubbleW, bubbleH, 8 * sx);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        ctx.fillText(line, bx + 10 * sx, cursorY + 6 * sy + i * lineH);
      });

      cursorY += bubbleH + 10 * sy;
      if (cursorY > y + th - 24 * sy) break;
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
    this.canvas = null;
    this.mediaRecorder = null;
    if (this.audioCtx) {
      const interval = (this.audioCtx as AudioContext & { __mixInterval?: number }).__mixInterval;
      if (interval) window.clearInterval(interval);
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
