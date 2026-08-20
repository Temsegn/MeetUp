import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dispatchRemoteCommand } from './commandDispatcher';
import { applyCommandToUiState, emptyUiState } from './applyUiState';

describe('remote-control command dispatcher', () => {
  it('executes only allowlisted handlers', async () => {
    let opened = false;
    const result = dispatchRemoteCommand('OPEN_CHAT', {}, {
      OPEN_CHAT: () => {
        opened = true;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(opened, true);
  });

  it('rejects unknown commands instead of evaluating them', () => {
    const result = dispatchRemoteCommand('EVAL_JS', { code: 'alert(1)' }, {});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'command-not-allowlisted');
  });

  it('rejects allowlisted commands with no local handler', () => {
    const result = dispatchRemoteCommand('OPEN_CHAT', {}, {});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'no-handler');
  });

  it('does not treat DOM selectors or URLs as executable commands', () => {
    const result = dispatchRemoteCommand('#chat-panel', { href: 'https://evil.example' }, {});
    assert.equal(result.ok, false);
  });

  it('opens chat on the controller mirror immediately', () => {
    const next = applyCommandToUiState(emptyUiState(), 'OPEN_CHAT');
    assert.equal(next.sidebar, 'chat');
    const toggled = applyCommandToUiState(next, 'TOGGLE_CHAT_PANEL');
    assert.equal(toggled.sidebar, null);
  });

  it('does not mark screen share as started until capture exists', () => {
    const next = applyCommandToUiState(emptyUiState(), 'START_SCREEN_SHARE');
    assert.equal(next.isSharingScreen, false);
  });
});
