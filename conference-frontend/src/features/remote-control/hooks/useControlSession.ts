import { useCallback, useRef } from 'react';
import { useRemoteControlStore } from '../store/remoteControl.store';
import { remoteControlService } from '../services/remoteControl.service';
import type { Socket } from 'socket.io-client';
import type { RemoteUiCommand } from '../types';

export function useControlSession(socket: Socket | null, localParticipantId: string) {
  const session = useRemoteControlStore((s) => s.session);
  const seqRef = useRef(0);

  const sendAction = useCallback(
    async (actionType: RemoteUiCommand, payload: Record<string, unknown> = {}) => {
      if (!socket || !session || session.role !== 'controlling') return;
      seqRef.current += 1;
      await remoteControlService.action(socket, session.sessionId, seqRef.current, actionType, payload);
    },
    [socket, session],
  );

  const stop = useCallback(async () => {
    if (!socket || !session) return;
    await remoteControlService.stop(socket, session.sessionId);
  }, [socket, session]);

  return {
    session,
    isControlling: session?.role === 'controlling',
    isControlled: session?.role === 'controlled',
    sendAction,
    stop,
    localParticipantId,
  };
}
