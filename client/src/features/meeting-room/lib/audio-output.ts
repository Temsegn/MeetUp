/** Preferred speaker device for in-meeting remote audio. */

let preferredSinkId = '';

export function getMeetingAudioOutputId(): string {
  return preferredSinkId;
}

export async function setMeetingAudioOutput(deviceId: string): Promise<void> {
  preferredSinkId = deviceId;
  const nodes = document.querySelectorAll('audio');
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const media = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (typeof media.setSinkId !== 'function') return;
      try {
        await media.setSinkId(deviceId || '');
      } catch {
        /* browser may reject while element has no src */
      }
    }),
  );
}

export async function applyMeetingAudioOutput(el: HTMLAudioElement | null): Promise<void> {
  if (!el || !preferredSinkId) return;
  const media = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  if (typeof media.setSinkId !== 'function') return;
  try {
    await media.setSinkId(preferredSinkId);
  } catch {
    /* ignore */
  }
}
