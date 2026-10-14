import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_RECOVERY_MAX_ATTEMPTS,
  classifyJoinError,
  nextRecoveryDelayMs,
  recoveryBannerCopy,
  shouldContinueAutoRecovery,
} from './connection-recovery';

describe('connection recovery policy', () => {
  it('classifies auth denial vs meeting ended vs network failure', () => {
    assert.equal(classifyJoinError('You were removed from this meeting by the host.'), 'auth_denied');
    assert.equal(classifyJoinError('Forbidden'), 'auth_denied');
    assert.equal(classifyJoinError('This meeting has ended.'), 'meeting_ended');
    assert.equal(classifyJoinError('Meeting cancelled'), 'meeting_ended');
    assert.equal(classifyJoinError('Socket not connected'), 'network_failed');
    assert.equal(classifyJoinError('rejoin timed out'), 'network_failed');
  });

  it('bounds automatic recovery attempts', () => {
    assert.equal(shouldContinueAutoRecovery(0), true);
    assert.equal(shouldContinueAutoRecovery(AUTO_RECOVERY_MAX_ATTEMPTS - 1), true);
    assert.equal(shouldContinueAutoRecovery(AUTO_RECOVERY_MAX_ATTEMPTS), false);
  });

  it('uses exponential backoff with jitter within caps', () => {
    const d0 = nextRecoveryDelayMs(0, { random: () => 0.5 });
    const d3 = nextRecoveryDelayMs(3, { random: () => 0.5 });
    assert.ok(d0 >= 650 && d0 <= 1_400);
    assert.ok(d3 > d0);
    const capped = nextRecoveryDelayMs(20, { random: () => 0.5, maxMs: 12_000 });
    assert.ok(capped <= 12_000 * 1.35);
  });

  it('shows Rejoin meeting copy only for recoverable failures', () => {
    assert.equal(
      recoveryBannerCopy('reconnecting').title.includes('Reconnecting'),
      true,
    );
    const failed = recoveryBannerCopy('failed', 'network_failed');
    assert.equal(failed.title, 'Connection lost. You can rejoin the meeting.');
    assert.equal(failed.actionLabel, 'Rejoin meeting');

    assert.equal(recoveryBannerCopy('failed', 'auth_denied').actionLabel, null);
    assert.equal(recoveryBannerCopy('failed', 'meeting_ended').actionLabel, null);
  });
});
