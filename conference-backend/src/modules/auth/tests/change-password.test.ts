/**
 * Change-password tests — current-password check, reuse prevention,
 * session revocation (others revoked, current kept), fresh access token.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createPasswordService } from '../services/password.service';
import { createLoginService } from '../services/login.service';
import { tokenService } from '../services/token.service';
import { verifyPassword } from '../security/password-hasher';

const ctx = { ip: IP, userAgent: UA };

describe('change-password', () => {
  it('requires the correct current password', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps);

    await assert.rejects(
      createPasswordService(deps).changePassword({
        userId: user.id, currentPassword: 'WrongCurrent1', newPassword: 'BrandNewPass789',
        ctx,
      }),
      (err: unknown) =>
        err instanceof AppError && err.code === 'CURRENT_PASSWORD_INCORRECT' && err.statusCode === 400
    );
    // Nothing changed.
    assert.ok(await verifyPassword(password, state.users.get(user.id)!.passwordHash));
    assert.ok(state.audits.some((a) => a.action === 'ACCESS_DENIED'));
  });

  it('rejects reusing the current password', async () => {
    const { deps } = makeStubDeps();
    const { user, password } = await seedUser(deps);

    await assert.rejects(
      createPasswordService(deps).changePassword({
        userId: user.id, currentPassword: password, newPassword: password, ctx,
      }),
      (err: unknown) => err instanceof ValidationError && err.code === 'PASSWORD_REUSE'
    );
  });

  it('rejects weak new passwords', async () => {
    const { deps } = makeStubDeps();
    const { user, password } = await seedUser(deps);

    await assert.rejects(
      createPasswordService(deps).changePassword({
        userId: user.id, currentPassword: password, newPassword: 'short', ctx,
      }),
      (err: unknown) => err instanceof ValidationError && err.code === 'WEAK_PASSWORD'
    );
  });

  it('updates the hash, revokes OTHER sessions, keeps the current one', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    const login = createLoginService(deps);

    const current = await login.login({ email: user.email, password, rememberMe: false, ctx });
    const other = await login.login({ email: user.email, password, rememberMe: false, ctx });

    const result = await createPasswordService(deps).changePassword({
      userId: user.id,
      currentPassword: password,
      newPassword: 'BrandNewPass789',
      keepSessionId: current.session.id,
      ctx,
    });

    // Hash updated; old password no longer works.
    assert.ok(await verifyPassword('BrandNewPass789', state.users.get(user.id)!.passwordHash));
    assert.ok(!(await verifyPassword(password, state.users.get(user.id)!.passwordHash)));

    // Current session kept, other session revoked.
    assert.ok(!state.sessions.get(current.session.id)!.revokedAt);
    assert.ok(state.sessions.get(other.session.id)!.revokedAt);
    assert.ok(state.audits.some((a) => a.action === 'PASSWORD_CHANGED'));

    // Fresh access token returned and verifies.
    const payload = tokenService.verifyAccessToken(result.accessToken);
    assert.equal(payload.userId, user.id);
    assert.equal(payload.sessionId, current.session.id);
  });

  it('a post-change access token is accepted while pre-change tokens are rejected', async () => {
    const { deps, state } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    const current = await createLoginService(deps).login({
      email: user.email, password, rememberMe: false, ctx,
    });

    const oldToken = tokenService.issueAccessToken(user.id, current.session.id).accessToken;
    const result = await createPasswordService(deps).changePassword({
      userId: user.id, currentPassword: password, newPassword: 'BrandNewPass789',
      keepSessionId: current.session.id, ctx,
    });

    const changedAtMs = state.users.get(user.id)!.passwordChangedAt!.getTime();
    const oldPayload = tokenService.verifyAccessToken(oldToken);
    const newPayload = tokenService.verifyAccessToken(result.accessToken);

    // Pre-change token was issued (milliseconds) before the change → rejected
    // by the authenticate middleware's passwordChangedAt check.
    assert.ok(oldPayload.iatMs! < changedAtMs);
    assert.ok(newPayload.iatMs! >= changedAtMs);
  });
});
