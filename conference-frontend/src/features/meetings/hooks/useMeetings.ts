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

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, s] = await Promise.all([
        meetingsService.list(workspaceId, params),
        meetingsService.stats(workspaceId),
      ]);
      setMeetings(data.meetings);
      setTotal(data.total);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, params.status, params.q, params.date, params.page]);

  useEffect(() => { void load(); }, [load]);

  return { meetings, stats, total, loading, error, reload: load };
}
