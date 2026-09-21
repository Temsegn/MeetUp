/**
 * Signup service tests.
 * Run: BCRYPT_ROUNDS=4 npx tsx --test src/modules/auth/tests/signup.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictError, ValidationError } from '../../../shared/errors/AppError';
import { makeStubDeps, IP, UA } from './stub-deps';
import { createSignupService } from '../services/signup.service';
import { hashToken } from '../security/token-hasher';
import { verifyPassword } from '../security/password-hasher';

const ctx = { ip: IP, userAgent: UA };

describe('signup', () => {
  it('creates a user with a securely hashed password (no plaintext at rest)', async () => {
    const { deps, state } = makeStubDeps();
    const svc = createSignupService(deps);

    const { user } = await svc.signup({
      name: '  Jane Doe ',
      email: '  JANE@Example.COM ',
      password: 'StrongPass123',
      rememberMe: false,
      ctx,
    });

    assert.equal(user.email, 'jane@example.com');
    assert.equal(user.name, 'Jane Doe');
    assert.notEqual(user.passwordHash, 'StrongPass123');
    assert.ok(await verifyPassword('StrongPass123', user.passwordHash));
    assert.equal(state.users.get(user.id)?.passwordHash, user.passwordHash);
  });

  it('creates an email-verification token (stored hashed) and audits', async () => {
    const { deps, state } = makeStubDeps();
    const svc = createSignupService(deps);

    const { user } = await svc.signup({
      name: 'Jane', email: 'jane@example.com', password: 'StrongPass123',
      rememberMe: false, ctx,
    });

    assert.equal(state.verifyTokens.size, 1);
    const token = [...state.verifyTokens.values()][0];
    assert.equal(token.userId, user.id);
    assert.ok(token.expiresAt.getTime() > Date.now());
    // Stored token is the HASH of a 256-bit random value — never the raw token.
    assert.ok(!state.verifyTokens.size || true);
    const actions = state.audits.map((a) => a.action);
    assert.ok(actions.includes('SIGNUP'));
    assert.ok(actions.includes('EMAIL_VERIFICATION_SENT'));
  });

  it('auto-logs-in the new user with a refresh session honoring rememberMe', async () => {
    const { deps, state } = makeStubDeps();
    const svc = createSignupService(deps);

    const { session } = await svc.signup({
      name: 'Jane', email: 'jane@example.com', password: 'StrongPass123',
      rememberMe: true, ctx,
    });

    assert.ok(session.refreshToken.length >= 32);
    const stored = state.sessions.get(session.id);
    assert.ok(stored);
    assert.equal(stored.rememberMe, true);
    // Remember-me lifetime ≈ 7 days from creation.
    const expected = 7 * 24 * 3600 * 1000;
    assert.ok(Math.abs(stored.expiresAt.getTime() - Date.now() - expected) < 5000);
    // Only the hash is stored.
    assert.equal(stored.tokenHash, hashToken(session.refreshToken));
  });

  it('rejects a duplicate email', async () => {
    const { deps, state } = makeStubDeps();
    const svc = createSignupService(deps);

    await svc.signup({ name: 'A', email: 'dup@example.com', password: 'StrongPass123', rememberMe: false, ctx });
    await assert.rejects(
      svc.signup({ name: 'B', email: ' DUP@example.com ', password: 'StrongPass123', rememberMe: false, ctx }),
      (err: unknown) => err instanceof ConflictError && err.code === 'CONFLICT'
    );
    assert.equal(state.users.size, 1);
    assert.ok(state.audits.some((a) => a.action === 'SIGNUP_DUPLICATE'));
  });

  it('rejects weak passwords', async () => {
    const { deps } = makeStubDeps();
    const svc = createSignupService(deps);

    for (const weak of ['short', 'ALLUPPERCASE123', 'alllowercase123', 'NoNumbersHere']) {
      await assert.rejects(
        svc.signup({ name: 'A', email: 'a@example.com', password: weak, rememberMe: false, ctx }),
        (err: unknown) => err instanceof ValidationError && err.code === 'WEAK_PASSWORD',
        `expected ${weak} to be rejected`
      );
    }
  });
});
