/**
 * Logout service tests — single-session revocation and logout-all.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createLoginService } from '../services/login.service';
import { createLogoutService } from '../services/logout.service';
import { createSessionService } from '../services/session.service';

const ctx = { ip: IP, userAgent: UA };

describe('logout', () => {
  it('revokes the session that owns the presented refresh token', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);
    const { session } = await createLoginService(deps).login({
      email: 'test@example.com', password, rememberMe: false, ctx,
    });

    await createLogoutService(deps).logout({ refreshToken: session.refreshToken, ctx });

    assert.ok(state.sessions.get(session.id)!.revokedAt);
    assert.ok(state.audits.some((a) => a.action === 'LOGOUT'));
    // A revoked cookie cannot be refreshed afterwards.
    await assert.rejects(
      createSessionService(deps).rotateSession({ refreshToken: session.refreshToken, ctx }),
      (err: unknown) => err instanceof AuthError && err.code === 'SESSION_REVOKED'
    );
  });

  it('is a no-op for an unknown/absent token (cookie clearing handles it)', async () => {
    const { deps } = makeStubDeps();
    await seedUser(deps);
    await createLogoutService(deps).logout({ refreshToken: 'unknown-token', ctx });
    await createLogoutService(deps).logout({ ctx });
    // No throw is the assertion.
    assert.ok(true);
  });

  it('logout-all revokes every session for the user', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);
    const svc = createLoginService(deps);

    const a = await svc.login({ email: 'test@example.com', password, rememberMe: false, ctx });
    const b = await svc.login({ email: 'test@example.com', password, rememberMe: false, ctx });

    const count = await createLogoutService(deps).logoutAll({ userId: a.user.id, ctx });

    assert.equal(count, 2);
    assert.ok(state.sessions.get(a.session.id)!.revokedAt);
    assert.ok(state.sessions.get(b.session.id)!.revokedAt);
    assert.ok(state.audits.some((x) => x.action === 'LOGOUT_ALL'));
  });

  it('logout-all revokes the current session too (fresh cookie after re-login)', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    const { session } = await createLoginService(deps).login({
      email: user.email, password, rememberMe: false, ctx,
    });

    await createLogoutService(deps).logoutAll({ userId: user.id, ctx });
    assert.ok(state.sessions.get(session.id)!.revokedAt);
  });
});
