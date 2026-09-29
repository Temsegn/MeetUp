import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createOAuthState,
  oauthStatesMatch,
  verifyOAuthState,
} from '../security/oauth-state';

describe('oauth state', () => {
  it('accepts a freshly issued state and the matching cookie', () => {
    const state = createOAuthState();
    assert.equal(verifyOAuthState(state), true);
    assert.equal(oauthStatesMatch(state, state), true);
  });

  it('rejects a missing cookie, a different cookie, and a tampered value', () => {
    const state = createOAuthState();
    assert.equal(oauthStatesMatch(state, undefined), false);
    assert.equal(oauthStatesMatch(state, createOAuthState()), false);
    assert.equal(verifyOAuthState(state.slice(0, -1) + 'x'), false);
    assert.equal(verifyOAuthState('not-a-state'), false);
  });

  it('rejects an expired state', () => {
    const state = createOAuthState(Date.now() - 11 * 60 * 1000, 10 * 60 * 1000);
    assert.equal(verifyOAuthState(state), false);
    assert.equal(oauthStatesMatch(state, state), true);
  });
});
