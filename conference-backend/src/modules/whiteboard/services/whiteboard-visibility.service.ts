type WhiteboardOpener = {
  openedByParticipantId: string;
  openedByName: string;
};

/** In-memory map of which meeting currently has the whiteboard panel open. */
const activeByRoom = new Map<string, WhiteboardOpener>();

export function isWhiteboardActive(roomId: string): boolean {
  return activeByRoom.has(roomId);
}

export function getWhiteboardOpener(roomId: string): WhiteboardOpener | undefined {
  return activeByRoom.get(roomId);
}

/**
 * First opener wins. Re-open while already active does not replace the opener
 * (avoids remount flicker / ownership thrash).
 */
export function markWhiteboardActive(
  roomId: string,
  opener: { participantId: string; name: string },
): void {
  if (activeByRoom.has(roomId)) return;
  activeByRoom.set(roomId, {
    openedByParticipantId: opener.participantId,
    openedByName: opener.name,
  });
}

export function clearWhiteboardActive(roomId: string): void {
  activeByRoom.delete(roomId);
}

/** Test helper. */
export function _resetWhiteboardVisibilityForTests(): void {
  activeByRoom.clear();
}
