import { useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { WB_EVENTS, type WhiteboardVisibilityAck, type WhiteboardVisibilityEvent } from '../types';

interface UseWhiteboardVisibilityOptions {
  socket: Socket | null;
  roomId: string;
  joined: boolean;
  localParticipantId: string;
  setWhiteboardOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  addToast?: (message: string) => void;
}

/**
 * Shared whiteboard visibility for the meeting:
 * - Opening opens for everyone
 * - Only the opener can close — and that closes for everyone
 */
export function useWhiteboardVisibility({
  socket,
  roomId,
  joined,
  localParticipantId,
  setWhiteboardOpen,
  addToast,
}: UseWhiteboardVisibilityOptions) {
  const openerIdRef = useRef<string | null>(null);
  const openRef = useRef(false);
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;
  const queriedRef = useRef(false);

  useEffect(() => {
    if (!socket || !joined || !localParticipantId) return;

    const applyOpen = (open: boolean) => {
      if (openRef.current === open) return;
      openRef.current = open;
      setWhiteboardOpen(open);
    };

    const onVisibility = (payload: WhiteboardVisibilityEvent) => {
      if (payload.roomId !== roomId) return;

      if (payload.open) {
        openerIdRef.current = payload.openedBy?.participantId ?? openerIdRef.current;
        const alreadyOpen = openRef.current;
        applyOpen(true);
        if (
          !alreadyOpen &&
          payload.openedBy &&
          payload.openedBy.participantId !== localParticipantId
        ) {
          addToastRef.current?.(`${payload.openedBy.name} opened the whiteboard`);
        }
        return;
      }

      openerIdRef.current = null;
      const wasOpen = openRef.current;
      applyOpen(false);
      if (
        wasOpen &&
        payload.closedBy &&
        payload.closedBy.participantId !== localParticipantId
      ) {
        addToastRef.current?.(`${payload.closedBy.name} closed the whiteboard`);
      }
    };

    socket.on(WB_EVENTS.VISIBILITY, onVisibility);

    // Ask once per meeting join — avoids open/close storms from effect re-runs.
    if (!queriedRef.current) {
      queriedRef.current = true;
      socket.emit(WB_EVENTS.GET_VISIBILITY, { roomId }, (ack: WhiteboardVisibilityAck) => {
        if (ack?.active) {
          openerIdRef.current = ack.openedByParticipantId ?? null;
          applyOpen(true);
        }
      });
    }

    return () => {
      socket.off(WB_EVENTS.VISIBILITY, onVisibility);
    };
  }, [socket, roomId, joined, localParticipantId, setWhiteboardOpen]);

  // Reset one-shot query when leaving the meeting.
  useEffect(() => {
    if (!joined) {
      queriedRef.current = false;
      openRef.current = false;
      openerIdRef.current = null;
    }
  }, [joined]);

  const announceOpen = useCallback(() => {
    if (!socket) return;
    openRef.current = true;
    setWhiteboardOpen(true);
    socket.emit(WB_EVENTS.VISIBILITY, { roomId, open: true }, (ack: WhiteboardVisibilityAck) => {
      if (ack?.openedByParticipantId) {
        openerIdRef.current = ack.openedByParticipantId;
      } else if (!openerIdRef.current) {
        openerIdRef.current = localParticipantId;
      }
    });
  }, [socket, roomId, localParticipantId, setWhiteboardOpen]);

  const announceClose = useCallback(() => {
    if (!socket) return;
    socket.emit(WB_EVENTS.VISIBILITY, { roomId, open: false }, (ack: WhiteboardVisibilityAck) => {
      if (ack?.error) {
        addToastRef.current?.(ack.error);
        return;
      }
      openerIdRef.current = null;
      openRef.current = false;
      setWhiteboardOpen(false);
    });
  }, [socket, roomId, setWhiteboardOpen]);

  const isOpener = useCallback(
    () => openerIdRef.current === localParticipantId,
    [localParticipantId],
  );

  return { announceOpen, announceClose, isOpener };
}
