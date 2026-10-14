/**
 * Bounded reconnection policy for meeting signaling + media recovery.
 * Signaling reconnect alone does not prove media works — callers must
 * still rebuild mediasoup transports after Socket.IO recovers.
 */

export const AUTO_RECOVERY_MAX_ATTEMPTS = 5;
export const AUTO_RECOVERY_BASE_DELAY_MS = 1_000;
export const AUTO_RECOVERY_MAX_DELAY_MS = 12_000;
export const AUTO_RECOVERY_JITTER = 0.35;

export type RecoveryOutcome =
  | 'success'
  | 'waiting'
  | 'auth_denied'
  | 'meeting_ended'
  | 'network_failed'
  | 'aborted';

export function classifyJoinError(message: string): RecoveryOutcome {
  const m = message.toLowerCase();
  if (/kicked|removed|revoked|denied|forbidden|not allowed|declined/.test(m)) {
    return 'auth_denied';
  }
  if (/ended|cancelled|canceled|expired|not found/.test(m)) {
    return 'meeting_ended';
  }
  return 'network_failed';
}

/** Exponential backoff with full jitter, capped. */
export function nextRecoveryDelayMs(
  attemptIndex: number,
  opts?: {
    baseMs?: number;
    maxMs?: number;
    jitter?: number;
    random?: () => number;
  },
): number {
  const base = opts?.baseMs ?? AUTO_RECOVERY_BASE_DELAY_MS;
  const max = opts?.maxMs ?? AUTO_RECOVERY_MAX_DELAY_MS;
  const jitter = opts?.jitter ?? AUTO_RECOVERY_JITTER;
  const rnd = opts?.random ?? Math.random;
  const exp = Math.min(max, base * Math.pow(2, Math.max(0, attemptIndex)));
  const spread = exp * jitter;
  return Math.round(exp - spread + rnd() * 2 * spread);
}

export function shouldContinueAutoRecovery(attemptCount: number, max = AUTO_RECOVERY_MAX_ATTEMPTS): boolean {
  return attemptCount < max;
}

export function recoveryBannerCopy(state: 'reconnecting' | 'failed', outcome?: RecoveryOutcome | null): {
  title: string;
  actionLabel: string | null;
} {
  if (state === 'reconnecting') {
    return {
      title: 'Reconnecting…',
      actionLabel: null,
    };
  }
  if (outcome === 'auth_denied') {
    return {
      title: 'You no longer have access to this meeting.',
      actionLabel: null,
    };
  }
  if (outcome === 'meeting_ended') {
    return {
      title: 'This meeting has ended.',
      actionLabel: null,
    };
  }
  return {
    title: 'Connection lost. You can rejoin the meeting.',
    actionLabel: 'Rejoin meeting',
  };
}
