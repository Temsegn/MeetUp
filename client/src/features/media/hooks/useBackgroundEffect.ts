import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackgroundProcessor,
  type BackgroundEffect,
} from '../lib/background-processor';

export type { BackgroundEffect };

/**
 * useBackgroundEffect
 *
 * Wraps BackgroundProcessor in a React hook.
 *
 * When effect.kind === 'none' the raw stream is returned unchanged (zero CPU).
 * For any other effect a canvas-based processor is created, receives frames
 * from a hidden <video> element fed by rawStream, and outputs a processed
 * MediaStream via canvas.captureStream(30).
 *
 * The processed stream should replace localStream in:
 *   - VideoTile (local preview)
 *   - sess.produce(track, 'camera') in LiveMeetingPage
 */
export function useBackgroundEffect(rawStream: MediaStream | null) {
  const [effect, setEffectState] = useState<BackgroundEffect>({ kind: 'none' });
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(rawStream);

  const processorRef = useRef<BackgroundProcessor | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // When effect changes to 'none', tear down the processor and pass through raw.
  // When effect is active, create (or update) the processor.
  useEffect(() => {
    if (!rawStream || effect.kind === 'none') {
      // Tear down any running processor.
      if (processorRef.current) {
        processorRef.current.destroy();
        processorRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      setProcessedStream(rawStream);
      return;
    }

    // Reuse an existing processor if one is already running (effect type change).
    if (processorRef.current) {
      processorRef.current.setEffect(effect);
      return;
    }

    // Derive canvas dimensions from the video track settings.
    const videoTrack = rawStream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings() ?? {};
    const width = (settings.width as number | undefined) ?? 1280;
    const height = (settings.height as number | undefined) ?? 720;

    // Create a hidden video element to feed frames into the processor.
    // Setting width/height avoids a 0×0 intrinsic size that can block decoding.
    const video = document.createElement('video');
    video.srcObject = rawStream;
    video.muted = true;
    video.playsInline = true;
    video.width = width;
    video.height = height;
    // autoplay attribute helps browsers start decoding without a user gesture
    // because the element is muted (policy allows muted autoplay).
    video.autoplay = true;
    videoRef.current = video;

    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    video.addEventListener('loadeddata', tryPlay, { once: true });

    const processor = new BackgroundProcessor(video, width, height);
    processorRef.current = processor;
    processor.setEffect(effect);
    setProcessedStream(processor.getOutputStream());

    return () => {
      processor.destroy();
      processorRef.current = null;
      video.removeEventListener('loadeddata', tryPlay);
      video.srcObject = null;
      videoRef.current = null;
    };
    // Only re-run when rawStream identity or effect.kind changes.
    // Effect parameter changes (color value, image url) are handled via setEffect() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawStream, effect.kind]);

  // When effect *parameters* change (same kind, different value) update the processor.
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.setEffect(effect);
    }
  }, [effect]);

  const setEffect = useCallback((next: BackgroundEffect) => {
    setEffectState(next);
  }, []);

  return {
    /** Pass this stream to VideoTile and sess.produce() instead of localStream. */
    processedStream: effect.kind === 'none' ? rawStream : processedStream,
    effect,
    setEffect,
    /** True while a processor is active (for UI indicators). */
    isActive: effect.kind !== 'none',
  };
}
