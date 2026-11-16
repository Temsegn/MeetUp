import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackgroundProcessor,
  type BackgroundEffect,
  type BackgroundProcessorStatus,
} from '../lib/background-processor';
import { preloadPersonSegmenter } from '../lib/person-segmenter';

export type { BackgroundEffect, BackgroundProcessorStatus };

const STORAGE_KEY = 'samtal:background-effect';

function loadSavedEffect(): BackgroundEffect {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kind: 'none' };
    const parsed = JSON.parse(raw) as BackgroundEffect;
    switch (parsed?.kind) {
      case 'blur-light':
      case 'blur-strong':
        return { kind: parsed.kind };
      case 'color':
        return typeof parsed.color === 'string' ? parsed : { kind: 'none' };
      case 'image':
        return typeof parsed.url === 'string' && !parsed.url.startsWith('blob:')
          ? parsed
          : { kind: 'none' };
      default:
        return { kind: 'none' };
    }
  } catch {
    return { kind: 'none' };
  }
}

function saveEffect(effect: BackgroundEffect): void {
  try {
    if (effect.kind === 'image' && effect.url.startsWith('blob:')) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(effect));
  } catch {
    /* storage full / blocked — selection just won't be remembered */
  }
}

type Options = {
  /** Stop processing while the camera is off (no frames are being sent). */
  paused?: boolean;
};

/**
 * useBackgroundEffect — AI virtual background / blur for the local camera.
 *
 * Returns `outputStream`: the raw stream when no effect is active, otherwise
 * a stream whose video track is the processor's segmented/composited output
 * (audio tracks are passed through untouched).
 *
 * One processor lives for the lifetime of the hook once an effect is first
 * used. Its output track never changes, so camera switches and effect changes
 * don't create new tracks. Switching between "no effect" and "an effect"
 * swaps between the raw track and that stable processed track — callers
 * publish whichever `getOutgoingVideoTrack()` returns and use
 * `producer.replaceTrack` when `outgoingVideoTrack` changes.
 */
export function useBackgroundEffect(rawStream: MediaStream | null, { paused = false }: Options = {}) {
  const [effect, setEffectState] = useState<BackgroundEffect>(loadSavedEffect);
  const [status, setStatus] = useState<BackgroundProcessorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [processor, setProcessor] = useState<BackgroundProcessor | null>(null);
  const processorRef = useRef<BackgroundProcessor | null>(null);

  const rawVideoTrack = rawStream?.getVideoTracks()[0] ?? null;
  const wantsProcessing = effect.kind !== 'none' && rawVideoTrack !== null;

  // Create the processor lazily the first time an effect is needed.
  useEffect(() => {
    if (!wantsProcessing || processorRef.current) return;
    try {
      const p = new BackgroundProcessor({
        onStatus: (next, err) => {
          setStatus(next);
          if (next === 'error') {
            setError(err?.message ?? 'Background effects are unavailable on this device');
            // Fall back to the plain camera rather than a broken effect.
            setEffectState({ kind: 'none' });
          } else {
            setError(null);
          }
        },
      });
      processorRef.current = p;
      setProcessor(p);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Background effects are not supported in this browser');
      setEffectState({ kind: 'none' });
    }
  }, [wantsProcessing]);

  // Destroy only on unmount (leaving the meeting).
  useEffect(
    () => () => {
      processorRef.current?.destroy();
      processorRef.current = null;
    },
    [],
  );

  // Keep the processor in sync with the camera, effect and camera-off state.
  // Declared before consumers' effects so getOutgoingVideoTrack() is current
  // when they run in the same commit.
  useEffect(() => {
    if (!processor) return;
    processor.setInput(rawVideoTrack);
    processor.setEffect(wantsProcessing ? effect : { kind: 'none' });
    processor.setPaused(paused);
  }, [processor, rawVideoTrack, effect, wantsProcessing, paused]);

  const active = wantsProcessing && processor !== null && status !== 'error';

  const outputStream = useMemo(() => {
    if (!rawStream) return null;
    if (!active || !processor) return rawStream;
    return new MediaStream([processor.track, ...rawStream.getAudioTracks()]);
  }, [rawStream, active, processor]);

  const activeRef = useRef(active);
  activeRef.current = active;

  /** The track that should be sent for a given raw camera track right now. */
  const getOutgoingVideoTrack = useCallback((raw: MediaStreamTrack): MediaStreamTrack => {
    const p = processorRef.current;
    return activeRef.current && p ? p.track : raw;
  }, []);

  const setEffect = useCallback((next: BackgroundEffect) => {
    setError(null);
    setEffectState(next);
    saveEffect(next);
    if (next.kind !== 'none') preloadPersonSegmenter();
  }, []);

  return {
    /** Stream to preview locally (video processed, audio raw). */
    outputStream,
    /** Current outgoing camera track — changes only when toggling effect on/off. */
    outgoingVideoTrack: outputStream?.getVideoTracks()[0] ?? null,
    getOutgoingVideoTrack,
    effect,
    setEffect,
    /** 'loading' while the AI model downloads the first time. */
    status,
    error,
    isActive: active,
    /** Start downloading the model early (e.g. when the picker opens). */
    preload: preloadPersonSegmenter,
  };
}

export type BackgroundEffectController = ReturnType<typeof useBackgroundEffect>;
