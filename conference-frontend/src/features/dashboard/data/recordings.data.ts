/** Shared recording row shape for the library table and filters. */
export type RecordingRow = {
  id: string;
  title: string;
  meeting: string;
  at: string;
  date: string;
  time: string;
  duration: string;
  /** duration in seconds for the player scrubber */
  durationSec: number;
  size: string;
  views: number;
  thumb: string;
  avatars: string[];
  people?: Array<{ name?: string; avatarUrl?: string | null; avatarColor?: string | null }>;
  moreCount: number;
  sharedBy: {
    name: string;
    avatar: string;
    avatarColor?: string | null;
  };
  description?: string;
};

export function formatPlayerTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
