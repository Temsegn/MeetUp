import type { WhiteboardElement, WhiteboardFiles } from '../types';

/**
 * Deterministic Excalidraw element merge (mirrors server).
 * Prefer higher version; on tie prefer higher versionNonce.
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

export function elementsToMap(elements: readonly WhiteboardElement[]): Map<string, WhiteboardElement> {
  const map = new Map<string, WhiteboardElement>();
  for (const el of elements) {
    if (!el?.id) continue;
    map.set(el.id, el);
  }
  return map;
}

export function mergeElements(
  current: readonly WhiteboardElement[],
  incoming: readonly WhiteboardElement[],
): WhiteboardElement[] {
  const map = elementsToMap(current);
  for (const remote of incoming) {
    if (!remote?.id) continue;
    const local = map.get(remote.id);
    if (shouldApplyRemote(local, remote)) {
      map.set(remote.id, remote);
    }
  }
  return Array.from(map.values());
}

export function mergeFiles(
  current: WhiteboardFiles,
  incoming?: WhiteboardFiles,
): WhiteboardFiles {
  if (!incoming) return current;
  return { ...current, ...incoming };
}

/**
 * Diff local scene against last acknowledged scene — only changed elements.
 */
export function diffElements(
  previous: readonly WhiteboardElement[],
  next: readonly WhiteboardElement[],
): WhiteboardElement[] {
  const prevMap = elementsToMap(previous);
  const changed: WhiteboardElement[] = [];
  for (const el of next) {
    if (!el?.id) continue;
    const old = prevMap.get(el.id);
    if (!old) {
      changed.push(el);
      continue;
    }
    if (el.version !== old.version || el.versionNonce !== old.versionNonce || el.isDeleted !== old.isDeleted) {
      changed.push(el);
    }
  }
  // Soft-deletes that disappeared from `next` are still represented with isDeleted in Excalidraw.
  return changed;
}

export function throttle<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Parameters<T> | null = null;

  const invoke = () => {
    last = Date.now();
    timer = null;
    if (pending) {
      const args = pending;
      pending = null;
      fn(...args);
    }
  };

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    pending = args;
    const remaining = waitMs - (now - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke();
    } else if (!timer) {
      timer = setTimeout(invoke, remaining);
    }
  }) as T;
}
