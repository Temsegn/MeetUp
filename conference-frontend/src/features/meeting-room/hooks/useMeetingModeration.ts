import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

export type ModerationAction =
  | 'mute'
  | 'unmute'
  | 'camera-off'
  | 'camera-on'
  | 'disable-chat'
  | 'enable-chat'
  | 'kick';

type Handlers = {
  onMute: () => void | Promise<void>;
  onUnmute: () => void | Promise<void>;
  onCameraOff: () => void | Promise<void>;
  onCameraOn: () => void | Promise<void>;
  onDisableChat: () => void;
  onEnableChat: () => void;
  onKick: () => void | Promise<void>;
  addToast?: (message: string) => void;
};

export function useMeetingModeration(socket: Socket | null, handlers: Handlers) {
  useEffect(() => {
    if (!socket) return;

    const onCommand = (payload: { action: ModerationAction; by?: string }) => {
      const who = payload.by ? `${payload.by}` : 'Host';
      switch (payload.action) {
        case 'mute':
          void handlers.onMute();
          handlers.addToast?.(`${who} muted your microphone`);
          break;
        case 'unmute':
          void handlers.onUnmute();
          handlers.addToast?.(`${who} asked you to unmute`);
          break;
        case 'camera-off':
          void handlers.onCameraOff();
          handlers.addToast?.(`${who} turned off your camera`);
          break;
        case 'camera-on':
          void handlers.onCameraOn();
          handlers.addToast?.(`${who} asked you to turn on your camera`);
          break;
        case 'disable-chat':
          handlers.onDisableChat();
          handlers.addToast?.(`${who} disabled chat for you`);
          break;
        case 'enable-chat':
          handlers.onEnableChat();
          handlers.addToast?.(`${who} enabled chat for you`);
          break;
        case 'kick':
          handlers.addToast?.(`${who} removed you from the meeting`);
          void handlers.onKick();
          break;
        default:
          break;
      }
    };

    socket.on('moderation-command', onCommand);
    return () => {
      socket.off('moderation-command', onCommand);
    };
  }, [socket, handlers]);
}

export function emitHostModerate(
  socket: Socket | null,
  roomId: string,
  targetParticipantId: string,
  action: ModerationAction,
) {
  if (!socket) return Promise.reject(new Error('Not connected'));
  return new Promise<void>((resolve, reject) => {
    socket.emit('host-moderate', { roomId, targetParticipantId, action }, (res: { error?: string } | undefined) => {
      if (res?.error) reject(new Error(res.error));
      else resolve();
    });
  });
}
