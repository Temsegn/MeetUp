/** Persist guest display names across invite-link revisits (keyed by room + email). */

export function guestDisplayNameStorageKey(roomId: string, email: string): string {
  return `meetup:guestName:${roomId}:${String(email).trim().toLowerCase()}`;
}

export function loadGuestDisplayName(roomId: string, email: string): string | null {
  if (!roomId || !email) return null;
  try {
    const raw = localStorage.getItem(guestDisplayNameStorageKey(roomId, email));
    const name = String(raw || '').trim();
    return name || null;
  } catch {
    return null;
  }
}

export function saveGuestDisplayName(roomId: string, email: string, name: string): void {
  const trimmed = String(name || '').trim();
  if (!roomId || !email || !trimmed) return;
  try {
    localStorage.setItem(guestDisplayNameStorageKey(roomId, email), trimmed.slice(0, 80));
  } catch {
    /* ignore quota / private mode */
  }
}
