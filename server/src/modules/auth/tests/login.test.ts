/**
 * Login service tests — success, generic errors, lockout, remember-me.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError, AuthError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createLoginService } from '../services/login.service';

const ctx = { ip: IP, userAgent: UA };

describe('login', () => {
  it('logs in with correct credentials and creates a session', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps, { verified: true });

    const result = await createLoginService(deps).login({
      email: user.email.toUpperCase(), // normalized
      password,
      rememberMe: false,
      ctx,
    });

    assert.equal(result.user.id, user.id);
    assert.ok(result.session.refreshToken.length >= 32);
    assert.equal(state.sessions.get(result.session.id)?.userId, user.id);
    assert.ok(state.audits.some((a) => a.action === 'LOGIN_SUCCESS'));
    assert.ok(state.attempts.some((a) => a.succeeded));
  });

  it('returns a GENERIC error for wrong password and unknown email alike', async () => {
    const { deps } = makeStubDeps();
    const { password } = await seedUser(deps);

    const svc = createLoginService(deps);
    const wrongPw = await svc.login({ email: 'test@example.com', password: 'WrongPass999', rememberMe: false, ctx })
      .then(() => null, (e: unknown) => e);
    const unknown = await svc.login({ email: 'nobody@example.com', password: 'WrongPass999', rememberMe: false, ctx })
      .then(() => null, (e: unknown) => e);

    assert.ok(wrongPw instanceof AuthError && unknown instanceof AuthError);
    assert.equal((wrongPw as AuthError).message, (unknown as AuthError).message);
    assert.equal((wrongPw as AuthError).statusCode, (unknown as AuthError).statusCode);
    assert.equal((wrongPw as AuthError).code, 'INVALID_CREDENTIALS');
  });

  it('records failed attempts for both existing and non-existing emails', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);

    const svc = createLoginService(deps);
    await svc.login({ email: 'test@example.com', password: 'BadPass123', rememberMe: false, ctx }).catch(() => {});
    await svc.login({ email: 'ghost@example.com', password: 'BadPass123', rememberMe: false, ctx }).catch(() => {});

    const failures = state.attempts.filter((a) => !a.succeeded);
    assert.equal(failures.length, 2);
    assert.ok(state.audits.filter((a) => a.action === 'LOGIN_FAILED').length === 2);
  });

  it('locks out after LOGIN_MAX_FAILED_ATTEMPTS with a generic 429', async () => {
    const { deps } = makeStubDeps();
    const { password } = await seedUser(deps);

    const svc = createLoginService(deps);
    for (let i = 0; i < 5; i++) {
      await assert.rejects(
        svc.login({ email: 'test@example.com', password: 'BadPass123', rememberMe: false, ctx })
      );
    }
    await assert.rejects(
      svc.login({ email: 'test@example.com', password, rememberMe: false, ctx }),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 429 && err.code === 'LOGIN_LOCKED'
    );
  });

  it('lockout applies equally to non-existent emails (no enumeration oracle)', async () => {
    const { deps } = makeStubDeps();
    const svc = createLoginService(deps);

    for (let i = 0; i < 5; i++) {
      await svc.login({ email: 'ghost@example.com', password: 'BadPass123', rememberMe: false, ctx }).catch(() => {});
    }
    await assert.rejects(
      svc.login({ email: 'ghost@example.com', password: 'Whatever1', rememberMe: false, ctx }),
      (err: unknown) => err instanceof AppError && err.statusCode === 429
    );
  });

  it('rememberMe controls the session lifetime (7d vs 12h)', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);
    const svc = createLoginService(deps);

    const remember = await svc.login({ email: 'test@example.com', password, rememberMe: true, ctx });
    const plain = await svc.login({ email: 'test@example.com', password, rememberMe: false, ctx });

    const rememberSession = state.sessions.get(remember.session.id)!;
    const plainSession = state.sessions.get(plain.session.id)!;

    assert.equal(rememberSession.rememberMe, true);
    assert.equal(plainSession.rememberMe, false);
    const sevenDays = 7 * 24 * 3600 * 1000;
    const twelveHours = 12 * 3600 * 1000;
    assert.ok(Math.abs(rememberSession.expiresAt.getTime() - Date.now() - sevenDays) < 5000);
    assert.ok(Math.abs(plainSession.expiresAt.getTime() - Date.now() - twelveHours) < 5000);
  });
});
