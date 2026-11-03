export type BackgroundEffect =
  | { kind: 'none' }
  | { kind: 'blur-light' }
  | { kind: 'blur-strong' }
  | { kind: 'color'; color: string }
  | { kind: 'image'; url: string };

/**
 * BackgroundProcessor
 *
 * Applies a background effect to a camera video feed using a canvas loop.
 *
 * How each effect works:
 *   none        — pass-through (loop stopped, canvas not used)
 *   blur-light  — draws the camera frame with CSS filter blur applied to ctx
 *   blur-strong — same with stronger blur
 *   color       — fills the canvas with a solid colour (camera hidden)
 *   image       — draws the background image cover-fitted (camera hidden)
 *
 * Note: Without ML person segmentation (MediaPipe), the camera feed is
 * replaced entirely rather than composited — this is intentional and matches
 * what most simple background implementations do.
 * The blur modes still show the camera, just blurred.
 */
export class BackgroundProcessor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stream: MediaStream;
  private effect: BackgroundEffect = { kind: 'none' };
  private bgImage: HTMLImageElement | null = null;
  private bgImageUrl = '';
  private animFrameId: number | null = null;
  private destroyed = false;

  constructor(
    private readonly video: HTMLVideoElement,
    width = 1280,
    height = 720,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('BackgroundProcessor: 2D canvas context unavailable');
    this.ctx = ctx;
    this.stream = this.canvas.captureStream(30);
  }

  getOutputStream(): MediaStream {
    return this.stream;
  }

  setEffect(effect: BackgroundEffect): void {
    this.effect = effect;
    if (effect.kind === 'image' && effect.url !== this.bgImageUrl) {
      this.bgImageUrl = effect.url;
      this.bgImage = null; // clear while loading
      const img = new Image();
      // crossOrigin needed for Unsplash URLs to avoid canvas taint
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.bgImage = img;
      };
      img.onerror = () => {
        // If CORS fails, try without crossOrigin (will taint canvas but still draw)
        const fallback = new Image();
        fallback.onload = () => { this.bgImage = fallback; };
        fallback.src = effect.url;
      };
      img.src = effect.url;
    }
    if (effect.kind === 'none') {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopLoop();
    this.stream.getTracks().forEach((t) => t.stop());
  }

  private startLoop(): void {
    if (this.animFrameId !== null) return;
    const tick = () => {
      if (this.destroyed) return;
      this.renderFrame();
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderFrame(): void {
    const { ctx, canvas, video, effect } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Need at least metadata to know dimensions are valid
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;

    // Reset any previous filter
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    switch (effect.kind) {
      case 'blur-light':
        // Draw blurred camera feed
        ctx.filter = 'blur(8px)';
        ctx.drawImage(video, -16, -16, w + 32, h + 32);
        ctx.filter = 'none';
        break;

      case 'blur-strong':
        // Draw blurred camera feed
        ctx.filter = 'blur(20px)';
        ctx.drawImage(video, -40, -40, w + 80, h + 80);
        ctx.filter = 'none';
        break;

      case 'color':
        // Fill with solid colour — camera is NOT shown on top
        // (no ML segmentation = full replacement)
        ctx.fillStyle = effect.color;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'image':
        if (this.bgImage) {
          // Draw background image cover-fitted
          this.drawCover(this.bgImage, w, h);
        } else {
          // Image still loading — show dark placeholder
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, w, h);
          // Draw a loading indicator
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.font = `${Math.round(h * 0.04)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('Loading background…', w / 2, h / 2);
        }
        break;

      default:
        // Fallback: draw raw camera
        ctx.drawImage(video, 0, 0, w, h);
        break;
    }
  }

  private drawCover(img: HTMLImageElement, cw: number, ch: number): void {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const dx = (cw - iw * scale) / 2;
    const dy = (ch - ih * scale) / 2;
    this.ctx.drawImage(img, dx, dy, iw * scale, ih * scale);
  }
}
