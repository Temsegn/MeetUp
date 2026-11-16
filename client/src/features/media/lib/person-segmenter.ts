import type { ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';

/**
 * Lazily loads a single shared MediaPipe ImageSegmenter (selfie model).
 *
 * Assets are self-hosted so the feature works offline / behind the PWA cache:
 *   /mediapipe/wasm/*            — copied from @mediapipe/tasks-vision by vite.config.ts
 *   /mediapipe/models/*.tflite   — committed under client/public
 *
 * The ~10 MB wasm runtime is only fetched the first time a user picks a
 * background effect (or opens the picker), never on initial page load.
 */

const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
const WASM_BASE = `${BASE}mediapipe/wasm`;
const MODEL_URL = `${BASE}mediapipe/models/selfie_segmenter.tflite`;

export type SegmentationMask = {
  width: number;
  height: number;
  /** Per-pixel person confidence in [0, 1], row-major. */
  data: Float32Array;
};

let segmenterPromise: Promise<ImageSegmenter> | null = null;
let lastTimestamp = 0;

/**
 * WebGL backed by a software rasterizer (SwiftShader, llvmpipe, …) is 20–50×
 * slower than MediaPipe's wasm-SIMD CPU path, so only use the GPU delegate
 * when there's a real GPU behind WebGL2.
 */
function hasHardwareWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

async function createSegmenter(): Promise<ImageSegmenter> {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const common = {
    runningMode: 'VIDEO' as const,
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  };
  try {
    if (!hasHardwareWebGL2()) throw new Error('software WebGL');
    return await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      ...common,
    });
  } catch {
    // No WebGL2 / GPU blocklisted — CPU (wasm SIMD) is still real-time for this model.
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      ...common,
    });
  }
}

/** Resolve the shared segmenter, loading it on first call. Retries after a failure. */
export function loadPersonSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = createSegmenter().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

/** Warm the model in the background (e.g. when the picker opens). */
export function preloadPersonSegmenter(): void {
  void loadPersonSegmenter().catch(() => {});
}

/**
 * Run segmentation on the current video frame. The mask is copied out of the
 * MediaPipe-owned buffer into `target` (reused between frames to avoid GC).
 */
export function segmentFrame(
  segmenter: ImageSegmenter,
  frame: HTMLVideoElement,
  target: SegmentationMask | null,
): SegmentationMask | null {
  // VIDEO mode requires strictly increasing timestamps (shared across processors).
  const now = performance.now();
  lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;

  let out: SegmentationMask | null = null;
  segmenter.segmentForVideo(frame, lastTimestamp, (result: ImageSegmenterResult) => {
    const mask = result.confidenceMasks?.[0];
    if (!mask) return;
    const src = mask.getAsFloat32Array();
    const size = mask.width * mask.height;
    const data =
      target && target.data.length === size ? target.data : new Float32Array(size);
    data.set(src);
    out = { width: mask.width, height: mask.height, data };
  });
  return out;
}
