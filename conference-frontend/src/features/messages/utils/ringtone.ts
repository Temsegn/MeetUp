/**
 * Ringtone / ring-out helpers using Web Audio (no asset files).
 * One “ring” ≈ 2s; five unanswered rings → auto end (~10s).
 */

const RING_MS = 2000;
export const MAX_RINGS = 5;
export const RING_TIMEOUT_MS = RING_MS * MAX_RINGS;

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(freq: number, start: number, dur: number, gain = 0.08): void {
  const ac = ctx();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Play a single dual-tone ring burst (classic phone-like). */
export function playRingBurst(): void {
  try {
    const ac = ctx();
    void ac.resume();
    const t = ac.currentTime;
    tone(440, t, 0.35);
    tone(480, t, 0.35);
    tone(440, t + 0.45, 0.35);
    tone(480, t + 0.45, 0.35);
  } catch {
    /* autoplay / unsupported */
  }
}

export type RingController = {
  stop: () => void;
};

/** Loop ringtone until stopped or max rings reached; then invoke onExhausted. */
export function startRingtoneLoop(onExhausted?: () => void): RingController {
  let rings = 0;
  let stopped = false;
  let intervalId: number | null = null;

  const tick = () => {
    if (stopped) return;
    rings += 1;
    playRingBurst();
    if (rings >= MAX_RINGS) {
      stop();
      onExhausted?.();
    }
  };

  tick();
  intervalId = window.setInterval(tick, RING_MS);

  function stop() {
    stopped = true;
    if (intervalId != null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { stop };
}
