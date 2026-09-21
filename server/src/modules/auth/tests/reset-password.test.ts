/**
 * Reset-password tests — token consumption, single-use, expiry, session revocation.
 *
 * Tokens are opaque and only their hash is stored, so tests generate a raw
 * token, insert its hash via the repository, then exercise the flow with the
 * raw token (exactly what the email link carries).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createPasswordResetService } from '../services/password-reset.service';
import { createLoginService } from '../services/login.service';
import { generateSecureToken } from '../security/token-generator';
import { hashToken } from '../security/token-hasher';
import { verifyPassword } from '../security/password-hasher';
import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from '../auth.constants';

const ctx = { ip: IP, userAgent: UA };

async function issueToken(deps: ReturnType<typeof makeStubDeps>['deps'], userId: string) {
  const raw = generateSecureToken();
  await deps.createPasswordResetToken({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000),
  });
  return raw;
}

describe('reset-password', () => {
  it('sets the new password, consumes the token, and revokes ALL sessions', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    const { session } = await createLoginService(deps).login({
      email: user.email, password, rememberMe: false, ctx,
    });
    const raw = await issueToken(deps, user.id);

    await createPasswordResetService(deps).resetPassword({
      token: raw,
      newPassword: 'BrandNewPass789',
      ctx,
    });

    // Password updated + hash never matches old password.
    const updated = state.users.get(user.id)!;
    assert.ok(await verifyPassword('BrandNewPass789', updated.passwordHash));
    assert.ok(!(await verifyPassword(password, updated.passwordHash)));
    assert.ok(updated.passwordChangedAt);

    // Token consumed (single-use).
    const [record] = [...state.resetTokens.values()];
    assert.ok(record.usedAt);

    // ALL sessions revoked — the old refresh token is dead.
    assert.ok(state.sessions.get(session.id)!.revokedAt);
    assert.ok(state.audits.some((a) => a.action === 'PASSWORD_RESET_COMPLETED'));

    // The consumed token cannot be used again.
    await assert.rejects(
      createPasswordResetService(deps).resetPassword({ token: raw, newPassword: 'AnotherPass123', ctx }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_RESET_TOKEN'
    );
  });

  it('rejects an unknown token', async () => {
    const { deps } = makeStubDeps();
    await seedUser(deps);
    await assert.rejects(
      createPasswordResetService(deps).resetPassword({
        token: 'bogus', newPassword: 'BrandNewPass789', ctx,
      }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_RESET_TOKEN'
    );
  });

  it('rejects an expired token', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const raw = await issueToken(deps, user.id);
    const [record] = [...state.resetTokens.values()];
    record.expiresAt = new Date(Date.now() - 1000);

    await assert.rejects(
      createPasswordResetService(deps).resetPassword({
        token: raw, newPassword: 'BrandNewPass789', ctx,
      }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_RESET_TOKEN'
    );
  });

  it('rejects reusing the current password', async () => {
    const { deps } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    const raw = await issueToken(deps, user.id);

    await assert.rejects(
      createPasswordResetService(deps).resetPassword({ token: raw, newPassword: password, ctx }),
      (err: unknown) => err instanceof ValidationError && err.code === 'PASSWORD_REUSE'
    );
  });

  it('rejects weak new passwords', async () => {
    const { deps } = makeStubDeps();
    const { user } = await seedUser(deps);
    const raw = await issueToken(deps, user.id);

    await assert.rejects(
      createPasswordResetService(deps).resetPassword({ token: raw, newPassword: 'short', ctx }),
      (err: unknown) => err instanceof ValidationError && err.code === 'WEAK_PASSWORD'
    );
  });
});
