import type { WhiteboardElement, WhiteboardFiles } from '../types/whiteboard.types';
import { WB_MAX_SCENE_ELEMENTS } from '../whiteboard.constants';

/**
 * Deterministic Excalidraw element merge.
 * Prefer higher `version`; on tie prefer higher `versionNonce`.
 */
export function shouldApplyRemote(
  local: WhiteboardElement | undefined,
  remote: WhiteboardElement,
): boolean {
  if (!local) return true;
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;
  return (remote.versionNonce ?? 0) > (local.versionNonce ?? 0);
}

export function elementsToMap(elements: WhiteboardElement[]): Map<string, WhiteboardElement> {
  const map = new Map<string, WhiteboardElement>();
  for (const el of elements) {
    if (!el?.id || typeof el.id !== 'string') continue;
    map.set(el.id, el);
  }
  return map;
}

export function mapToElements(map: Map<string, WhiteboardElement>): WhiteboardElement[] {
  return Array.from(map.values());
}

export type MergeResult = {
  applied: WhiteboardElement[];
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
  rejected: number;
};

/**
 * Merge a partial update into the scene. Returns only elements that changed.
 */
export function mergeWhiteboardUpdate(opts: {
  currentElements: WhiteboardElement[];
  currentFiles: WhiteboardFiles;
  incomingElements: WhiteboardElement[];
  incomingFiles?: WhiteboardFiles;
}): MergeResult {
  const map = elementsToMap(opts.currentElements);
  const applied: WhiteboardElement[] = [];
  let rejected = 0;

  for (const remote of opts.incomingElements) {
    if (!remote || typeof remote.id !== 'string' || !remote.id) {
      rejected += 1;
      continue;
    }
    if (typeof remote.version !== 'number' || typeof remote.versionNonce !== 'number') {
      rejected += 1;
      continue;
    }
    const local = map.get(remote.id);
    if (!shouldApplyRemote(local, remote)) {
      rejected += 1;
      continue;
    }
    map.set(remote.id, remote);
    applied.push(remote);
  }

  if (map.size > WB_MAX_SCENE_ELEMENTS) {
    // Prefer keeping non-deleted + newest versions when over cap.
    const sorted = mapToElements(map).sort((a, b) => {
      const aDel = a.isDeleted ? 1 : 0;
      const bDel = b.isDeleted ? 1 : 0;
      if (aDel !== bDel) return aDel - bDel;
      return (b.version ?? 0) - (a.version ?? 0);
    });
    map.clear();
    for (const el of sorted.slice(0, WB_MAX_SCENE_ELEMENTS)) {
      map.set(el.id, el);
    }
  }

  const files: WhiteboardFiles = { ...opts.currentFiles };
  if (opts.incomingFiles) {
    for (const [id, file] of Object.entries(opts.incomingFiles)) {
      if (!id || !file || typeof file.dataURL !== 'string') continue;
      if (file.dataURL.length > 1_500_000) continue; // ~1.5MB dataURL cap per file
      files[id] = file;
    }
  }

  return {
    applied,
    elements: mapToElements(map),
    files,
    rejected,
  };
}

export function createEmptyScene(): {
  revision: number;
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
} {
  return { revision: 0, elements: [], files: {} };
}
