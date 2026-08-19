/**
 * Email-verification tests — token issuance, consumption, single-use, expiry.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createEmailVerificationService } from '../services/email-verification.service';
import { generateSecureToken } from '../security/token-generator';
import { hashToken } from '../security/token-hasher';
import { EMAIL_VERIFICATION_TOKEN_TTL_SECONDS } from '../auth.constants';

const ctx = { ip: IP, userAgent: UA };

async function issueToken(deps: ReturnType<typeof makeStubDeps>['deps'], userId: string) {
  const raw = generateSecureToken();
  await deps.createEmailVerificationToken({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1000),
  });
  return raw;
}

describe('email verification', () => {
  it('sendVerification issues a fresh token and audits', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);

    const result = await createEmailVerificationService(deps).sendVerification({ user, ctx });

    assert.equal(result.alreadyVerified, false);
    assert.equal(state.verifyTokens.size, 1);
    assert.ok(state.audits.some((a) => a.action === 'EMAIL_VERIFICATION_SENT'));
  });

  it('sendVerification is a no-op when already verified', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps, { verified: true });

    const result = await createEmailVerificationService(deps).sendVerification({ user, ctx });

    assert.equal(result.alreadyVerified, true);
    assert.equal(state.verifyTokens.size, 0);
  });

  it('a new send invalidates the previous token (single active link)', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const svc = createEmailVerificationService(deps);

    await svc.sendVerification({ user, ctx });
    const [first] = [...state.verifyTokens.values()];
    await svc.sendVerification({ user, ctx });

    assert.equal(state.verifyTokens.size, 1);
    const [second] = [...state.verifyTokens.values()];
    assert.notEqual(first.id, second.id);
  });

  it('verify marks the email verified and consumes the token', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const raw = await issueToken(deps, user.id);

    const { user: verified } = await createEmailVerificationService(deps).verify({ token: raw, ctx });

    assert.ok(verified.emailVerifiedAt);
    assert.ok(state.users.get(user.id)!.emailVerifiedAt);
    const [record] = [...state.verifyTokens.values()];
    assert.ok(record.usedAt);
    assert.ok(state.audits.some((a) => a.action === 'EMAIL_VERIFIED'));
  });

  it('rejects unknown, expired, and already-used tokens', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps);
    const svc = createEmailVerificationService(deps);

    // Unknown.
    await assert.rejects(
      svc.verify({ token: 'bogus', ctx }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_VERIFICATION_TOKEN'
    );

    // Expired.
    const expiredRaw = await issueToken(deps, user.id);
    const expiredRecord = [...state.verifyTokens.values()].find(
      (r) => r.tokenHash === hashToken(expiredRaw)
    )!;
    expiredRecord.expiresAt = new Date(Date.now() - 1000);
    await assert.rejects(
      svc.verify({ token: expiredRaw, ctx }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_VERIFICATION_TOKEN'
    );

    // Used (single-use).
    const usedRaw = await issueToken(deps, user.id);
    const usedRecord = [...state.verifyTokens.values()].find(
      (r) => r.tokenHash === hashToken(usedRaw)
    )!;
    usedRecord.usedAt = new Date();
    await assert.rejects(
      svc.verify({ token: usedRaw, ctx }),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_VERIFICATION_TOKEN'
    );
  });

  it('verifying an already-verified email is idempotent success', async () => {
    const { deps, state } = makeStubDeps();
    const { user } = await seedUser(deps, { verified: true });
    const raw = await issueToken(deps, user.id);

    const { user: v } = await createEmailVerificationService(deps).verify({ token: raw, ctx });
    assert.ok(v.emailVerifiedAt);
    // Token still consumed.
    assert.ok([...state.verifyTokens.values()][0].usedAt);
  });
});
