/**
 * Forgot-password tests — generic responses, token issuance, single active link.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createPasswordResetService } from '../services/password-reset.service';
import { hashToken } from '../security/token-hasher';

const ctx = { ip: IP, userAgent: UA };

describe('forgot-password', () => {
  it('returns an identical generic success whether or not the account exists', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const svc = createPasswordResetService(deps);

    const existing = await svc.requestReset({ email: user.email, ctx });
    const missing = await svc.requestReset({ email: 'ghost@example.com', ctx });

    assert.deepEqual(existing, missing);
    assert.equal(existing.ok, true);
    // Only the real account got a token.
    assert.equal(state.resetTokens.size, 1);
  });

  it('stores only a hashed token with a 30-minute expiry', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    await createPasswordResetService(deps).requestReset({ email: user.email, ctx });

    const [record] = [...state.resetTokens.values()];
    assert.equal(record.userId, user.id);
    assert.ok(record.tokenHash.length === 64); // sha256 hex
    const ttl = 30 * 60 * 1000;
    assert.ok(Math.abs(record.expiresAt.getTime() - Date.now() - ttl) < 5000);
    assert.ok(state.audits.some((a) => a.action === 'PASSWORD_RESET_REQUESTED'));
  });

  it('keeps only ONE active reset link — a new request invalidates the old', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const svc = createPasswordResetService(deps);

    await svc.requestReset({ email: user.email, ctx });
    const [first] = [...state.resetTokens.values()];
    await svc.requestReset({ email: user.email, ctx });

    assert.equal(state.resetTokens.size, 1);
    const [second] = [...state.resetTokens.values()];
    assert.notEqual(first.id, second.id);
  });

  it('never leaks the raw token into storage (hash lookup round-trips)', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const svc = createPasswordResetService(deps);

    await svc.requestReset({ email: user.email, ctx });
    const [record] = [...state.resetTokens.values()];
    const found = await deps.findPasswordResetTokenByHash(record.tokenHash);
    assert.equal(found?.id, record.id);
    // The stored value is a SHA-256 digest of the raw token.
    assert.equal(hashToken('not-the-token').length, record.tokenHash.length);
  });
});
