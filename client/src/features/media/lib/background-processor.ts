import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import {
  loadPersonSegmenter,
  segmentFrame,
  type SegmentationMask,
} from './person-segmenter';

export type BackgroundEffect =
  | { kind: 'none' }
  | { kind: 'blur-light' }
  | { kind: 'blur-strong' }
  | { kind: 'color'; color: string }
  | { kind: 'image'; url: string };

export type BackgroundProcessorStatus = 'idle' | 'loading' | 'ready' | 'error';

type Options = {
  /** Output frame rate of the processed track. */
  fps?: number;
  onStatus?: (status: BackgroundProcessorStatus, error?: Error) => void;
};

/** Gaussian radius (px at 720p) used for the two blur strengths. */
const BLUR_RADIUS = { 'blur-light': 10, 'blur-strong': 22 } as const;
/** Confidence → alpha remap window. Narrow = crisper edge, wide = softer. */
const EDGE_LOW = 0.35;
const EDGE_HIGH = 0.85;
/** Mask feather (px at 720p) applied while upscaling the low-res mask. */
const FEATHER_PX = 3;
/** Background images are decoded at most this wide. */
const MAX_BG_WIDTH = 1920;

const supportsCanvasFilter = (() => {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    return !!ctx && 'filter' in ctx && typeof ctx.filter === 'string';
  } catch {
    return false;
  }
})();

/**
 * Self-pacing, worker-driven frame ticker.
 *
 * - Worker timers keep running in background tabs (requestAnimationFrame
 *   stops), so the outgoing video doesn't freeze for everyone else.
 * - The next tick is only scheduled after the current frame finishes, with
 *   the remaining frame budget as delay. On a slow device frames are dropped
 *   instead of queueing up and starving the main thread (UI stays responsive).
 */
function createTicker(fps: number, onTick: () => void): () => void {
  const interval = 1000 / fps;
  let stopped = false;
  let schedule: (delay: number) => void;
  let dispose: () => void;

  const run = () => {
    if (stopped) return;
    const start = performance.now();
    onTick();
    const spent = performance.now() - start;
    // Always yield at least a few ms so input/rendering get a turn.
    schedule(Math.max(4, interval - spent));
  };

  try {
    const src = `onmessage=e=>setTimeout(()=>postMessage(0),e.data)`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = run;
    schedule = (delay) => worker.postMessage(delay);
    dispose = () => worker.terminate();
  } catch {
    let id = 0;
    schedule = (delay) => {
      id = window.setTimeout(run, delay);
    };
    dispose = () => window.clearTimeout(id);
  }

  schedule(0);
  return () => {
    stopped = true;
    dispose();
  };
}

function make2d(canvas: HTMLCanvasElement, alpha = true): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha, desynchronized: true });
  if (!ctx) throw new Error('BackgroundProcessor: 2D canvas context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/**
 * BackgroundProcessor — AI virtual background for a camera track.
 *
 * Pipeline per frame:
 *   1. MediaPipe selfie segmentation → low-res person confidence mask
 *   2. Motion-adaptive temporal smoothing of the mask (kills flicker without
 *      lagging behind fast movement) + smoothstep edge remap
 *   3. Bilinear upscale + feather of the mask → alpha matte at output size
 *   4. Person layer = camera frame clipped to the matte ('source-in')
 *   5. Output = background (blurred camera / image / colour) + person layer
 *
 * The output track (`track`) is stable for the lifetime of the processor:
 * camera switches (`setInput`) and effect changes (`setEffect`) never replace
 * it, so a mediasoup producer sending it keeps working without renegotiation.
 * When the effect is 'none' the loop stops completely (zero CPU/GPU).
 */
export class BackgroundProcessor {
  /** Processed camera track — send this instead of the raw camera track. */
  readonly track: MediaStreamTrack;

  private readonly fps: number;
  private readonly onStatus?: Options['onStatus'];

  private readonly video: HTMLVideoElement;
  private readonly out: HTMLCanvasElement;
  private readonly outCtx: CanvasRenderingContext2D;
  private readonly person: HTMLCanvasElement;
  private readonly personCtx: CanvasRenderingContext2D;
  private readonly matte: HTMLCanvasElement;
  private readonly matteCtx: CanvasRenderingContext2D;
  private readonly small: HTMLCanvasElement;
  private readonly smallCtx: CanvasRenderingContext2D;

  private matteImage: ImageData | null = null;
  private rawMask: SegmentationMask | null = null;
  private smoothMask: Float32Array | null = null;

  private effect: BackgroundEffect = { kind: 'none' };
  private bgImage: ImageBitmap | HTMLImageElement | null = null;
  private bgImageUrl = '';
  private inputTrack: MediaStreamTrack | null = null;

  private segmenter: ImageSegmenter | null = null;
  private status: BackgroundProcessorStatus = 'idle';
  private stopTicker: (() => void) | null = null;
  private paused = false;
  private destroyed = false;
  private rendering = false;

  // Adaptive load shedding: segment every Nth frame when the device is slow.
  private segEvery = 1;
  private frameNo = 0;
  private segMsAvg = 0;

  constructor({ fps = 30, onStatus }: Options = {}) {
    this.fps = fps;
    this.onStatus = onStatus;

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    // Safari only decodes frames for videos attached to the document.
    Object.assign(this.video.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '2px',
      height: '2px',
      opacity: '0',
      pointerEvents: 'none',
    });
    this.video.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.video);

    this.out = document.createElement('canvas');
    this.out.width = 1280;
    this.out.height = 720;
    this.outCtx = make2d(this.out, false);
    this.person = document.createElement('canvas');
    this.personCtx = make2d(this.person);
    this.matte = document.createElement('canvas');
    this.matteCtx = make2d(this.matte);
    this.small = document.createElement('canvas');
    this.smallCtx = make2d(this.small, false);

    // Paint one frame so the track is never "black until first draw".
    this.outCtx.fillStyle = '#0f172a';
    this.outCtx.fillRect(0, 0, this.out.width, this.out.height);

    const stream = this.out.captureStream(fps);
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error('BackgroundProcessor: canvas.captureStream unsupported');
    try {
      track.contentHint = 'motion';
    } catch {
      /* optional */
    }
    this.track = track;
  }

  getStatus(): BackgroundProcessorStatus {
    return this.status;
  }

  /** True when frames are being processed (effect active and not paused). */
  get isActive(): boolean {
    return this.effect.kind !== 'none';
  }

  /** Swap the camera feeding the processor; the output track is unchanged. */
  setInput(track: MediaStreamTrack | null): void {
    if (this.destroyed || track === this.inputTrack) return;
    this.inputTrack = track;
    this.video.srcObject = track ? new MediaStream([track]) : null;
    if (track) {
      void this.video.play().catch(() => {});
      this.syncSize();
    }
    // Different camera → the old mask no longer lines up.
    this.smoothMask = null;
  }

  setEffect(effect: BackgroundEffect): void {
    if (this.destroyed) return;
    this.effect = effect;

    if (effect.kind === 'image' && effect.url !== this.bgImageUrl) {
      this.bgImageUrl = effect.url;
      this.bgImage = null;
      void this.loadBackgroundImage(effect.url);
    }
    if (effect.kind !== 'none' && !this.segmenter) {
      void this.ensureSegmenter();
    }
    this.updateLoop();
  }

  /** Stop the frame loop (e.g. while the camera is turned off). */
  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.updateLoop();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopTicker?.();
    this.stopTicker = null;
    this.track.stop();
    this.video.srcObject = null;
    this.video.remove();
    if (this.bgImage && 'close' in this.bgImage) this.bgImage.close();
    this.bgImage = null;
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private setStatus(status: BackgroundProcessorStatus, error?: Error): void {
    if (this.status === status) return;
    this.status = status;
    this.onStatus?.(status, error);
  }

  private async ensureSegmenter(): Promise<void> {
    if (this.segmenter || this.status === 'loading') return;
    this.setStatus('loading');
    try {
      const segmenter = await loadPersonSegmenter();
      if (this.destroyed) return;
      this.segmenter = segmenter;
      this.setStatus('ready');
    } catch (err) {
      if (this.destroyed) return;
      this.setStatus(
        'error',
        err instanceof Error ? err : new Error('Could not load background segmentation model'),
      );
    }
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      // Decode once off the main thread; cap huge photos so each frame's
      // drawImage stays cheap (aspect ratio preserved — height is derived).
      let bitmap = await createImageBitmap(blob);
      if (bitmap.width > MAX_BG_WIDTH) {
        const scaled = await createImageBitmap(bitmap, {
          resizeWidth: MAX_BG_WIDTH,
          resizeQuality: 'high',
        }).catch(() => null);
        if (scaled) {
          bitmap.close();
          bitmap = scaled;
        }
      }
      if (this.destroyed || this.bgImageUrl !== url) {
        bitmap.close();
        return;
      }
      if (this.bgImage && 'close' in this.bgImage) this.bgImage.close();
      this.bgImage = bitmap;
    } catch {
      // Fallback for browsers without createImageBitmap(blob) options.
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        if (!this.destroyed && this.bgImageUrl === url) this.bgImage = img;
      };
      img.src = url;
    }
  }

  private updateLoop(): void {
    const shouldRun = !this.destroyed && !this.paused && this.effect.kind !== 'none';
    if (shouldRun && !this.stopTicker) {
      this.stopTicker = createTicker(this.fps, () => this.renderFrame());
    } else if (!shouldRun && this.stopTicker) {
      this.stopTicker();
      this.stopTicker = null;
    }
  }

  private syncSize(): void {
    const s = this.inputTrack?.getSettings();
    const vw = this.video.videoWidth || s?.width || 1280;
    const vh = this.video.videoHeight || s?.height || 720;
    if (
      this.out.width === vw &&
      this.out.height === vh &&
      this.person.width === vw &&
      this.person.height === vh
    ) {
      return;
    }
    this.out.width = vw;
    this.out.height = vh;
    this.person.width = vw;
    this.person.height = vh;
    // Canvas resize resets context state.
    for (const ctx of [this.outCtx, this.personCtx]) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
  }

  private renderFrame(): void {
    if (this.rendering || this.destroyed) return;
    const { video } = this;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
    this.rendering = true;
    try {
      this.syncSize();
      const w = this.out.width;
      const h = this.out.height;
      const ctx = this.outCtx;

      // Model still loading or failed → show the real camera, never a blank frame.
      if (!this.segmenter) {
        ctx.drawImage(video, 0, 0, w, h);
        return;
      }

      this.frameNo += 1;
      if (!this.smoothMask || this.frameNo % this.segEvery === 0) {
        const t0 = performance.now();
        const mask = segmentFrame(this.segmenter, video, this.rawMask);
        this.trackSegmentationCost(performance.now() - t0);
        if (mask) {
          this.rawMask = mask;
          this.updateMatte(mask);
        }
      }
      if (!this.matteImage) {
        ctx.drawImage(video, 0, 0, w, h);
        return;
      }

      this.composePerson(w, h);
      this.drawBackground(w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.person, 0, 0);
    } catch {
      // A single bad frame (e.g. camera switching) must not kill the loop.
    } finally {
      this.rendering = false;
    }
  }

  /** Keep total per-frame cost inside the frame budget on slow devices. */
  private trackSegmentationCost(ms: number): void {
    this.segMsAvg = this.segMsAvg ? this.segMsAvg * 0.9 + ms * 0.1 : ms;
    const budget = 1000 / this.fps;
    if (this.segMsAvg > budget * 0.9) this.segEvery = 3;
    else if (this.segMsAvg > budget * 0.55) this.segEvery = 2;
    else this.segEvery = 1;
  }

  /**
   * Temporal smoothing + edge remap → RGBA alpha matte at mask resolution.
   * Pixels whose confidence changes a lot (real motion) follow the new mask
   * almost immediately; stable pixels are averaged, removing edge shimmer.
   */
  private updateMatte(mask: SegmentationMask): void {
    const { width, height, data } = mask;
    const size = width * height;

    if (this.matte.width !== width || this.matte.height !== height) {
      this.matte.width = width;
      this.matte.height = height;
      this.matteImage = null;
    }
    if (!this.matteImage) {
      this.matteImage = this.matteCtx.createImageData(width, height);
      const px = this.matteImage.data;
      for (let i = 0; i < px.length; i += 4) {
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
      }
    }
    if (!this.smoothMask || this.smoothMask.length !== size) {
      this.smoothMask = Float32Array.from(data);
    }

    const smooth = this.smoothMask;
    const px = this.matteImage.data;
    const inv = 1 / (EDGE_HIGH - EDGE_LOW);
    for (let i = 0; i < size; i++) {
      const prev = smooth[i];
      const cur = data[i];
      const diff = cur > prev ? cur - prev : prev - cur;
      const a = diff > 0.5 ? 1 : 0.35 + diff * 1.3;
      const v = prev + (cur - prev) * a;
      smooth[i] = v;
      let t = (v - EDGE_LOW) * inv;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      px[i * 4 + 3] = (t * t * (3 - 2 * t) * 255) | 0;
    }
    this.matteCtx.putImageData(this.matteImage, 0, 0);
  }

  private composePerson(w: number, h: number): void {
    const ctx = this.personCtx;
    ctx.globalCompositeOperation = 'copy';
    if (supportsCanvasFilter) ctx.filter = `blur(${Math.max(1, (FEATHER_PX * h) / 720)}px)`;
    ctx.drawImage(this.matte, 0, 0, w, h);
    if (supportsCanvasFilter) ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(this.video, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.outCtx;
    ctx.globalCompositeOperation = 'copy';
    const effect = this.effect;

    switch (effect.kind) {
      case 'blur-light':
      case 'blur-strong':
        this.drawBlurredCamera(w, h, (BLUR_RADIUS[effect.kind] * h) / 720);
        break;
      case 'color':
        ctx.fillStyle = effect.color;
        ctx.fillRect(0, 0, w, h);
        break;
      case 'image':
        if (this.bgImage) this.drawCover(this.bgImage, w, h);
        else this.drawBlurredCamera(w, h, (BLUR_RADIUS['blur-strong'] * h) / 720);
        break;
      default:
        ctx.drawImage(this.video, 0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Blur at quarter resolution then upscale: ~16× fewer pixels through the
   * blur kernel than blurring at full size, visually indistinguishable.
   * Without ctx.filter (older Safari) the down/upscale alone provides the blur.
   */
  private drawBlurredCamera(w: number, h: number, radius: number): void {
    const scale = supportsCanvasFilter ? 0.25 : radius > 15 ? 0.05 : 0.09;
    const sw = Math.max(16, Math.round(w * scale));
    const sh = Math.max(9, Math.round(h * scale));
    if (this.small.width !== sw || this.small.height !== sh) {
      this.small.width = sw;
      this.small.height = sh;
      this.smallCtx.imageSmoothingEnabled = true;
      this.smallCtx.imageSmoothingQuality = 'high';
    }
    const sctx = this.smallCtx;
    if (supportsCanvasFilter) {
      const r = radius * scale;
      const pad = Math.ceil(r * 2);
      sctx.filter = `blur(${r}px)`;
      // Overdraw past the edges so the blur doesn't fade to transparent/black.
      sctx.drawImage(this.video, -pad, -pad, sw + pad * 2, sh + pad * 2);
      sctx.filter = 'none';
    } else {
      sctx.drawImage(this.video, 0, 0, sw, sh);
    }
    this.outCtx.drawImage(this.small, 0, 0, w, h);
  }

  private drawCover(img: ImageBitmap | HTMLImageElement, cw: number, ch: number): void {
    const iw = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const ih = 'naturalHeight' in img ? img.naturalHeight : img.height;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    this.outCtx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }
}
