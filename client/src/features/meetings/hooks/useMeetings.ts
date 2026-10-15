import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService, Meeting, MeetingStats } from '../../../services/meetings/meetings.service';

export function useMeetings(params: { status?: string; q?: string; date?: string; page?: number; limit?: number } = {}) {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.workspaceId ?? null;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    const silent = Boolean(opts?.silent);
    // Background polls must not flip loading — that remounts skeletons and "blinks" the page.
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [data, s] = await Promise.all([
        meetingsService.list(workspaceId, params),
        meetingsService.stats(workspaceId),
      ]);
      setMeetings(data.meetings);
      setTotal(data.total);
      setStats(s);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Failed to load meetings');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspaceId, params.status, params.q, params.date, params.page]);

  useEffect(() => { void load(); }, [load]);

  const reload = useCallback(() => load(), [load]);
  const refreshQuietly = useCallback(() => load({ silent: true }), [load]);

  return { meetings, stats, total, loading, error, reload, refreshQuietly };
}
