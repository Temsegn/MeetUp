import { useEffect, useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { RecordingStatCards } from '../components/RecordingStatCards';
import {
  DEFAULT_RECORDING_FILTERS,
  RecordingsFilterPanel,
  RecordingsTable,
  type RecordingFilters,
  type RecordingRow,
} from '../components/RecordingsTable';
import { cn } from '../../../lib/cn';
import { useRecordings } from '../hooks/useRecordings';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Recordings library — Figma 1:3612
 * Search, filters, sort, pagination, and row actions are interactive.
 */
export function RecordingsPage() {
  const { activeWorkspace } = useAuth();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<RecordingFilters>(DEFAULT_RECORDING_FILTERS);
  const [toast, setToast] = useState<string | null>(null);

  const { recordings: apiRecordings, stats: recordingStats, loading, remove, rename } = useRecordings();

  const liveRecordings = useMemo<RecordingRow[]>(() => {
    if (loading || apiRecordings.length === 0) return [];
    return apiRecordings.map((r) => ({
      id: r.id,
      title: r.title,
      meeting: r.title,
      at: r.createdAt,
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date(r.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      duration: r.durationSeconds ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : '—',
      durationSec: r.durationSeconds,
      size: r.bytes ? `${(r.bytes / 1e6).toFixed(1)} MB` : '—',
      views: r.views,
      thumb: '/dashboard/rec-1.jpg',
      avatars: [],
      people: (r.participants ?? []).slice(0, 3).map((p) => ({
        name: p.name,
        avatarUrl: p.avatarUrl,
        avatarColor: p.avatarColor,
      })),
      moreCount: Math.max(0, (r.participants?.length ?? 0) - 3),
      sharedBy: { name: 'You', avatar: '' },
      description: r.description,
    }));
  }, [apiRecordings, loading]);

  const statCards = useMemo(() => {
    const secs = recordingStats?.totalDurationSeconds ?? 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
    const bytes = recordingStats?.storageBytes ?? 0;
    const storage =
      bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` :
      bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` :
      `${(bytes / 1e3).toFixed(1)} KB`;
    return {
      total: String(recordingStats?.total ?? 0),
      duration,
      storage,
      filesShared: String(recordingStats?.filesShared ?? 0),
      trends: recordingStats?.trends,
    };
  }, [recordingStats]);

  const filtersActive =
    Boolean(filters.sharedBy) ||
    filters.dateRange !== 'all' ||
    filters.minViews > 0;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <div className="relative flex flex-col gap-4 pb-4 sm:gap-5">
      <AppHeader
        title="Recordings"
        subtitle="View, manage and share your meeting recordings."
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex h-9 w-full max-w-[260px] items-center gap-2 rounded-xl border border-[#E1E7EE] bg-white px-3 shadow-sm">
          <Search className="size-3.5 shrink-0 text-[#94A3B8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recordings..."
            className="w-full bg-transparent text-[12px] text-[#151D2B] outline-none placeholder:text-[#94A3B8]"
          />
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[12px] font-semibold shadow-sm',
            filtersOpen || filtersActive
              ? 'border-[#016BE6] bg-[#E8F1FE] text-[#016BE6]'
              : 'border-[#E1E7EE] bg-white text-[#334155] hover:bg-[#F8FAFC]',
          )}
        >
          <ListFilter className="size-3.5" />
          Filters
          {filtersActive ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-[#016BE6] text-[9px] text-white">
              !
            </span>
          ) : null}
        </button>
      </div>

      <RecordingsFilterPanel
        open={filtersOpen}
        value={filters}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
        onClear={() => setFilters(DEFAULT_RECORDING_FILTERS)}
      />

      <RecordingStatCards {...statCards} />

      <RecordingsTable
        query={query}
        filters={filters}
        onToast={setToast}
        liveRecordings={liveRecordings}
        workspaceId={activeWorkspace?.workspaceId}
        onDelete={async (id) => {
          await remove(id);
        }}
        onRename={async (id, title) => {
          await rename(id, title);
        }}
      />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#151D2B] px-4 py-2.5 text-[12px] font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
