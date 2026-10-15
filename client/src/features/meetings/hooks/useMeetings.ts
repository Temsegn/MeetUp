import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService, Meeting, MeetingStats } from '../../../services/meetings/meetings.service';

export type UseMeetingsParams = {
  status?: string;
  q?: string;
  date?: string;
  from?: string;
  to?: string;
  /** Stats window; null/undefined = all-time. */
  days?: number | null;
  page?: number;
  limit?: number;
};

export function useMeetings(params: UseMeetingsParams = {}) {
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
        meetingsService.list(workspaceId, {
          status: params.status,
          q: params.q,
          date: params.date,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        }),
        meetingsService.stats(workspaceId, {
          days: params.days ?? null,
          from: params.from,
          to: params.to,
        }),
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
  }, [
    workspaceId,
    params.status,
    params.q,
    params.date,
    params.from,
    params.to,
    params.days,
    params.page,
    params.limit,
  ]);

  useEffect(() => { void load(); }, [load]);

  const reload = useCallback(() => load(), [load]);
  const refreshQuietly = useCallback(() => load({ silent: true }), [load]);

  return { meetings, stats, total, loading, error, reload, refreshQuietly };
}
