import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { recordingsService, Recording, RecordingStats } from '../../../services/recordings/recordings.service';

export function useRecordings(params: { page?: number; limit?: number; meetingId?: string } = {}) {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.workspaceId ?? null;

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stats, setStats] = useState<RecordingStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, s] = await Promise.all([
        recordingsService.list(workspaceId, params),
        recordingsService.stats(workspaceId),
      ]);
      setRecordings(data.recordings);
      setTotal(data.total);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, params.page, params.meetingId, params.limit]);

  useEffect(() => { void load(); }, [load]);

  const remove = useCallback(async (id: string) => {
    if (!workspaceId) return;
    await recordingsService.delete(workspaceId, id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
    void load();
  }, [workspaceId, load]);

  const rename = useCallback(async (id: string, title: string) => {
    if (!workspaceId) return null;
    const updated = await recordingsService.rename(workspaceId, id, title);
    setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    return updated;
  }, [workspaceId]);

  return { recordings, stats, total, loading, error, reload: load, remove, rename };
}
