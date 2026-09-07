import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { formatPlayerTime } from '../data/recordings.data';

type Props = {
  title: string;
  poster: string;
  durationSec: number;
  src?: string;
  className?: string;
};

export function RecordingPlayer({ title, poster, durationSec, src, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number | null>(null);

  const totalDuration = Math.max(duration, durationSec, 1);
  const progress = totalDuration > 0 ? Math.min(100, (current / totalDuration) * 100) : 0;

  const seekTo = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, seconds));
      setCurrent(clamped);
      if (src && videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
    },
    [src, totalDuration],
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      seekTo(pct * totalDuration);
    },
    [seekTo, totalDuration],
  );

  useEffect(() => {
    setDuration(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (src) return;
    if (!playing) return;
    const id = window.setInterval(() => {
      setCurrent((t) => {
        const next = t + speed;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, speed, totalDuration, src]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    video.muted = muted;
    video.playbackRate = speed;
    if (playing) {
      void video.play().catch(() => {
        setPlaying(false);
        setLoadError('Could not start playback. Tap play to try again.');
      });
    } else {
      video.pause();
    }
  }, [src, playing, muted, speed]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const video = videoRef.current;

    const onTimeUpdate = () => setCurrent(video.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      setLoadError(null);
    };
    const onEnded = () => setPlaying(false);
    const onError = () => setLoadError('Recording video failed to load.');

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('durationchange', onLoaded);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('durationchange', onLoaded);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [src]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      seekFromClientX(clientX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, seekFromClientX]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3200);
  }, [playing]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    [],
  );

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  const skip = (delta: number) => {
    seekTo(current + delta);
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-black shadow-[0_12px_40px_rgba(15,23,42,0.18)]',
        className,
      )}
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && !dragging && setShowControls(false)}
    >
      <div className="relative min-h-0 w-full flex-1 bg-black">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        ) : (
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {loadError ? (
          <div className="absolute inset-x-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-center text-[12px] text-white">
            {loadError}
          </div>
        ) : null}

        {!playing ? (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              setLoadError(null);
              bumpControls();
            }}
            className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#016BE6] text-white shadow-xl transition hover:scale-105 hover:bg-[#0059C4] sm:size-[72px]"
            aria-label={`Play ${title}`}
          >
            <Play className="ml-1 size-7" fill="currentColor" />
          </button>
        ) : null}

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 transition-opacity sm:px-4 sm:pb-4',
            showControls || !playing || dragging ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <button
            ref={barRef}
            type="button"
            className="group relative mb-3 h-2 w-full cursor-pointer rounded-full bg-white/25 sm:h-2.5"
            aria-label="Seek"
            onMouseDown={(e) => {
              setDragging(true);
              seekFromClientX(e.clientX);
              bumpControls();
            }}
            onTouchStart={(e) => {
              setDragging(true);
              seekFromClientX(e.touches[0]?.clientX ?? 0);
              bumpControls();
            }}
            onClick={(e) => seekFromClientX(e.clientX)}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[#016BE6]"
              style={{ width: `${progress}%` }}
            />
            <span
              className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-lg transition sm:size-4"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </button>

          <div className="flex items-center gap-1.5 text-white sm:gap-2">
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10"
              onClick={() => skip(-10)}
              aria-label="Back 10 seconds"
            >
              <SkipBack className="size-4 sm:size-[18px]" />
            </button>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 sm:size-10"
              onClick={() => {
                setPlaying((p) => !p);
                bumpControls();
              }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="size-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 size-4" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10"
              onClick={() => skip(10)}
              aria-label="Forward 10 seconds"
            >
              <SkipForward className="size-4 sm:size-[18px]" />
            </button>

            <span className="ml-1 min-w-[88px] text-[11px] font-medium tabular-nums text-white/95 sm:text-[12px]">
              {formatPlayerTime(current)} / {formatPlayerTime(totalDuration)}
            </span>

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-white/10"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>

              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="h-7 rounded-md border-0 bg-white/15 px-1.5 text-[11px] font-semibold text-white outline-none"
                aria-label="Playback speed"
              >
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <option key={s} value={s} className="text-[#151D2B]">
                    {s}x
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-white/10"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
