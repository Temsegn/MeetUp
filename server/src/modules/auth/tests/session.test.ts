/**
 * Session-management tests — listing, ownership-scoped revocation, and the
 * session-info mapping used by GET /auth/sessions.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeStubDeps, seedUser, IP, UA } from './stub-deps';
import { createSessionService } from '../services/session.service';
import { createLoginService } from '../services/login.service';

const ctx = { ip: IP, userAgent: UA };

describe('session management', () => {
  it('lists a user\'s active sessions (and not revoked ones)', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);
    const login = createLoginService(deps);
    const sessions = createSessionService(deps);

    const a = await login.login({ email: 'test@example.com', password, rememberMe: false, ctx });
    const b = await login.login({ email: 'test@example.com', password, rememberMe: true, ctx });

    // Revoke one of them.
    await sessions.revokeSession(a.session.id, 'test');

    const list = await sessions.listUserSessions(a.user.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, b.session.id);
    assert.equal(list[0].rememberMe, true);
  });

  it('sorts sessions by most recently used first', async () => {
    const { deps, state } = makeStubDeps();
    const { password } = await seedUser(deps);
    const login = createLoginService(deps);

    const first = await login.login({ email: 'test@example.com', password, rememberMe: false, ctx });
    const second = await login.login({ email: 'test@example.com', password, rememberMe: false, ctx });

    // Simulate activity on the first session so it sorts to the top.
    state.sessions.get(first.session.id)!.lastUsedAt = new Date(Date.now() + 60000);

    const list = await createSessionService(deps).listUserSessions(first.user.id);
    assert.equal(list[0].id, first.session.id);
    assert.equal(list[1].id, second.session.id);
  });

  it('enforces ownership on session lookup (findSessionByIdForUser)', async () => {
    const { deps } = makeStubDeps();
    const a = await seedUser(deps, { email: 'a@example.com' });
    const b = await seedUser(deps, { email: 'b@example.com' });
    const login = createLoginService(deps);

    const sessionA = await login.login({ email: 'a@example.com', password: a.password, rememberMe: false, ctx });
    const sessionB = await login.login({ email: 'b@example.com', password: b.password, rememberMe: false, ctx });

    // User B cannot find or revoke user A's session.
    assert.equal(await deps.findSessionByIdForUser(sessionA.session.id, sessionB.user.id), null);
    assert.ok(await deps.findSessionByIdForUser(sessionA.session.id, sessionA.user.id));
    assert.ok(await deps.findSessionByIdForUser(sessionB.session.id, sessionB.user.id));
  });

  it('sessions carry device metadata (user agent + IP) for the sessions page', async () => {
    const { deps } = makeStubDeps();
    const { user, password } = await seedUser(deps);
    await createLoginService(deps).login({
      email: user.email,
      password,
      rememberMe: true,
      ctx: { ip: '198.51.100.9', userAgent: 'Chrome/125 on macOS' },
    });

    const list = await createSessionService(deps).listUserSessions(user.id);
    assert.equal(list[0].ip, '198.51.100.9');
    assert.equal(list[0].userAgent, 'Chrome/125 on macOS');
  });
});
