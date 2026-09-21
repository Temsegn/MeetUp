/**
 * Refresh-token rotation tests — rotation, reuse detection, expiry, revocation.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createLoginService } from '../services/login.service';
import { createSessionService } from '../services/session.service';
import { hashToken } from '../security/token-hasher';

const ctx = { ip: IP, userAgent: UA };

async function loggedIn(deps: ReturnType<typeof makeStubDeps>['deps']) {
  const { password } = await seedUser(deps);
  const { session } = await createLoginService(deps).login({
    email: 'test@example.com', password, rememberMe: false, ctx,
  });
  return { session, password };
}

describe('refresh (rotation)', () => {
  it('rotates the refresh token and issues a new one (never extends expiry)', async () => {
    const { deps, state } = makeStubDeps();
    const { session } = await loggedIn(deps);
    const original = state.sessions.get(session.id)!;
    const originalExpiry = original.expiresAt.getTime();

    const result = await createSessionService(deps).rotateSession({ refreshToken: session.refreshToken, ctx });

    assert.notEqual(result.refreshToken, session.refreshToken);
    const stored = state.sessions.get(session.id)!;
    // Old token hash moved to previousTokenHash (reuse detection).
    assert.equal(stored.previousTokenHash, hashToken(session.refreshToken));
    assert.equal(stored.tokenHash, hashToken(result.refreshToken));
    // Rotation must NOT extend the absolute lifetime.
    assert.equal(stored.expiresAt.getTime(), originalExpiry);
    assert.ok(state.audits.some((a) => a.action === 'TOKEN_REFRESHED'));
  });

  it('detects reuse of a rotated-out token and revokes the whole family', async () => {
    const { deps, state } = makeStubDeps();
    const { session } = await loggedIn(deps);
    const sessions = createSessionService(deps);
    const familyId = state.sessions.get(session.id)!.familyId;

    // One legitimate rotation.
    await sessions.rotateSession({ refreshToken: session.refreshToken, ctx });

    // Attacker replays the OLD token → reuse → family revoked.
    await assert.rejects(
      sessions.rotateSession({ refreshToken: session.refreshToken, ctx }),
      (err: unknown) => err instanceof AuthError && err.code === 'SESSION_REUSE_DETECTED'
    );
    assert.ok(state.audits.some((a) => a.action === 'REFRESH_REUSE_DETECTED'));
    assert.ok(state.sessions.get(session.id)!.revokedAt);
    // Even the NEW token is dead after family revocation.
    const anyLive = [...state.sessions.values()].some(
      (s) => s.familyId === familyId && !s.revokedAt
    );
    assert.equal(anyLive, false);
  });

  it('rejects an unknown token', async () => {
    const { deps } = makeStubDeps();
    await loggedIn(deps);
    await assert.rejects(
      createSessionService(deps).rotateSession({ refreshToken: 'totally-made-up-token', ctx }),
      (err: unknown) => err instanceof AuthError && err.code === 'SESSION_INVALID'
    );
  });

  it('rejects an expired session', async () => {
    const { deps, state } = makeStubDeps();
    const { session } = await loggedIn(deps);
    state.sessions.get(session.id)!.expiresAt = new Date(Date.now() - 1000);

    await assert.rejects(
      createSessionService(deps).rotateSession({ refreshToken: session.refreshToken, ctx }),
      (err: unknown) => err instanceof AuthError && err.code === 'SESSION_EXPIRED'
    );
  });

  it('rejects a revoked session', async () => {
    const { deps, state } = makeStubDeps();
    const { session } = await loggedIn(deps);
    await createSessionService(deps).revokeSession(session.id, 'test');

    await assert.rejects(
      createSessionService(deps).rotateSession({ refreshToken: session.refreshToken, ctx }),
      (err: unknown) => err instanceof AuthError && err.code === 'SESSION_REVOKED'
    );
  });

  it('returns the owning user so a new access token can be minted', async () => {
    const { deps } = makeStubDeps();
    const { session } = await loggedIn(deps);
    const result = await createSessionService(deps).rotateSession({ refreshToken: session.refreshToken, ctx });
    assert.equal(result.user.email, 'test@example.com');
    assert.ok(result.session.id);
  });
});
