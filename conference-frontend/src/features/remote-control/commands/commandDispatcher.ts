import type { CommandHandlerMap, RemoteUiCommand } from '../types';

const ALLOWED = new Set<RemoteUiCommand>([
  'OPEN_CHAT',
  'CLOSE_CHAT',
  'OPEN_PARTICIPANTS',
  'CLOSE_PARTICIPANTS',
  'TOGGLE_CHAT_PANEL',
  'TOGGLE_PARTICIPANTS_PANEL',
  'SELECT_PARTICIPANT',
  'CHANGE_LAYOUT',
  'SCROLL_PANEL',
  'TOGGLE_MUTE',
  'TOGGLE_CAMERA',
  'START_SCREEN_SHARE',
  'STOP_SCREEN_SHARE',
  'RAISE_HAND',
  'LOWER_HAND',
  'SEND_CHAT',
  'SEND_REACTION',
]);

/**
 * Executes only allowlisted meeting UI commands. Never eval, never DOM selectors from the network.
 */
export function dispatchRemoteCommand(
  actionType: string,
  payload: Record<string, unknown>,
  handlers: CommandHandlerMap,
): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED.has(actionType as RemoteUiCommand)) {
    return { ok: false, reason: 'command-not-allowlisted' };
  }
  const handler = handlers[actionType as RemoteUiCommand];
  if (!handler) {
    return { ok: false, reason: 'no-handler' };
  }
  void handler(payload ?? {});
  return { ok: true };
}
