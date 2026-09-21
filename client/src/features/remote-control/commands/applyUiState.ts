import type { ControlledUiState, RemoteUiCommand } from '../types';

export function emptyUiState(): ControlledUiState {
  return {
    version: 1,
    sidebar: null,
    layout: 'gallery',
    selectedParticipantId: null,
    isMuted: false,
    isCameraOff: false,
    isSharingScreen: false,
    isHandRaised: false,
    chatDraft: '',
    showAllParticipants: false,
    scrollTop: 0,
    whiteboardOpen: false,
  };
}

export function applyCommandToUiState(
  current: ControlledUiState | null,
  actionType: RemoteUiCommand,
  payload: Record<string, unknown> = {},
): ControlledUiState {
  const next: ControlledUiState = { ...(current ?? emptyUiState()), version: (current?.version ?? 0) + 1 };

  switch (actionType) {
    case 'OPEN_CHAT':
    case 'TOGGLE_CHAT_PANEL':
      next.sidebar = current?.sidebar === 'chat' && actionType === 'TOGGLE_CHAT_PANEL' ? null : 'chat';
      break;
    case 'CLOSE_CHAT':
      if (next.sidebar === 'chat') next.sidebar = null;
      break;
    case 'OPEN_PARTICIPANTS':
    case 'TOGGLE_PARTICIPANTS_PANEL':
      next.sidebar = current?.sidebar === 'participants' && actionType === 'TOGGLE_PARTICIPANTS_PANEL' ? null : 'participants';
      break;
    case 'CLOSE_PARTICIPANTS':
      if (next.sidebar === 'participants') next.sidebar = null;
      break;
    case 'SELECT_PARTICIPANT':
      if (typeof payload.participantId === 'string') next.selectedParticipantId = payload.participantId;
      break;
    case 'CHANGE_LAYOUT':
      if (payload.layout === 'gallery' || payload.layout === 'presentation') next.layout = payload.layout;
      break;
    case 'TOGGLE_MUTE':
      next.isMuted = !next.isMuted;
      break;
    case 'TOGGLE_CAMERA':
      next.isCameraOff = !next.isCameraOff;
      break;
    case 'START_SCREEN_SHARE':
      // Do not mark sharing as started until the controlled browser actually
      // captures a screen. The picker can only appear on that machine.
      break;
    case 'STOP_SCREEN_SHARE':
      next.isSharingScreen = false;
      break;
    case 'RAISE_HAND':
      next.isHandRaised = true;
      break;
    case 'LOWER_HAND':
      next.isHandRaised = false;
      break;
    case 'SEND_CHAT':
      next.chatDraft = '';
      next.sidebar = 'chat';
      break;
    case 'SCROLL_PANEL':
      if (typeof payload.deltaY === 'number') {
        next.scrollTop = Math.max(0, next.scrollTop + payload.deltaY);
      }
      break;
    default:
      break;
  }

  return next;
}
