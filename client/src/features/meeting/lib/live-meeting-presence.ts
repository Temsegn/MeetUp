import { useEffect, useState } from 'react';

/**
 * Lightweight presence flag so shell-level polls (/mine, meetings list)
 * can pause while a live call is active — without provider nesting.
 */
type Listener = (active: boolean) => void;

let active = false;
const listeners = new Set<Listener>();

export function getLiveMeetingPresence(): boolean {
  return active;
}

export function setLiveMeetingPresence(next: boolean): void {
  if (active === next) return;
  active = next;
  listeners.forEach((listener) => {
    try {
      listener(active);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeLiveMeetingPresence(listener: Listener): () => void {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}

export function useLiveMeetingPresence(): boolean {
  const [value, setValue] = useState(getLiveMeetingPresence);
  useEffect(() => subscribeLiveMeetingPresence(setValue), []);
  return value;
}
