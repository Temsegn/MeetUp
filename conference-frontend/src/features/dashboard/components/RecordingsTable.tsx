import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Play,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { RowActionsMenu } from './RowActionsMenu';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  ALL_RECORDINGS,
  RECORDING_SHARED_BY_OPTIONS,
  type RecordingRow,
} from '../data/recordings.data';

export type { RecordingRow };
export { RECORDING_SHARED_BY_OPTIONS };

export type RecordingFilters = {
  sharedBy: string;
  dateRange: 'all' | '7d' | '30d' | '90d';
  minViews: number;
};

const PAGE_SIZES = [10, 20] as const;

type SortDir = 'desc' | 'asc';

type Props = {
  query?: string;
  filters: RecordingFilters;
  onToast?: (message: string) => void;
  /** Optional live recordings from the API — falls back to mock data when not provided. */
  liveRecordings?: RecordingRow[];
  /** Persist delete to the API; required for real data. */
  onDelete?: (id: string) => Promise<void>;
  /** Persist rename to the API; required for real data. */
  onRename?: (id: string, title: string) => Promise<void>;
  /** Workspace for authenticated download. */
  workspaceId?: string | null;
};

export function RecordingsTable({
  query = '',
  filters,
  onToast,
  liveRecordings,
  onDelete,
  onRename,
  workspaceId,
}: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => liveRecordings ?? [...ALL_RECORDINGS]);

  useEffect(() => {
    if (liveRecordings) setItems(liveRecordings);
  }, [liveRecordings]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<RecordingRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RecordingRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [query, filters, pageSize, sortDir]);

  useEffect(() => {
    if (!pageSizeOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pageSizeRef.current?.contains(e.target as Node)) setPageSizeOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pageSizeOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rangeMs =
      filters.dateRange === '7d'
        ? 7 * 864e5
        : filters.dateRange === '30d'
          ? 30 * 864e5
          : filters.dateRange === '90d'
            ? 90 * 864e5
            : null;

    let list = items.filter((r) => {
      if (q) {
        const hit =
          r.title.toLowerCase().includes(q) ||
          r.meeting.toLowerCase().includes(q) ||
          r.sharedBy.name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filters.sharedBy && r.sharedBy.name !== filters.sharedBy) return false;
      if (filters.minViews > 0 && r.views < filters.minViews) return false;
      if (rangeMs != null) {
        const t = new Date(r.at).getTime();
        // Anchor relative to newest recording for demo data
        const newest = Math.max(...items.map((x) => new Date(x.at).getTime()));
        if (newest - t > rangeMs) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const da = new Date(a.at).getTime();
      const db = new Date(b.at).getTime();
      return sortDir === 'desc' ? db - da : da - db;
    });

    return list;
  }, [items, query, filters, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = filtered.slice(start, end);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 2) return [1, 2, 3];
    if (safePage >= totalPages - 1) return [totalPages - 2, totalPages - 1, totalPages];
    return [safePage - 1, safePage, safePage + 1];
  }, [safePage, totalPages]);

  const allChecked =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someChecked = pageRows.some((r) => selected.has(r.id)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.delete(r.id));
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const notify = (message: string) => onToast?.(message);

  const actionsFor = (r: RecordingRow) => [
    {
      label: 'Play recording',
      onClick: () => navigate(`/app/recordings/${r.id}`),
    },
    {
      label: 'Share link',
      onClick: async () => {
        const url = `${window.location.origin}/app/recordings/${r.id}`;
        try {
          await navigator.clipboard.writeText(url);
          notify('Share link copied');
        } catch {
          notify(`Share: ${url}`);
        }
      },
    },
    {
      label: 'Download',
      onClick: () => {
        void (async () => {
          if (!workspaceId) {
            notify('No workspace selected');
            return;
          }
          try {
            notify(`Downloading — ${r.title}`);
            const { recordingsService } = await import(
              '../../../services/recordings/recordings.service'
            );
            await recordingsService.download(workspaceId, r.id, r.title);
            notify(`Downloaded — ${r.title}`);
          } catch (err) {
            notify(err instanceof Error ? err.message : 'Download failed');
          }
        })();
      },
    },
    {
      label: 'Rename',
      onClick: () => {
        setRenameTarget(r);
        setRenameValue(r.title);
      },
    },
    {
      label: 'Delete',
      danger: true,
      onClick: () => setDeleteTarget(r),
    },
  ];

  const confirmRename = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next || next === renameTarget.title) {
      setRenameTarget(null);
      return;
    }
    setRenaming(true);
    try {
      if (onRename) {
        await onRename(renameTarget.id, next);
      } else {
        setItems((prev) =>
          prev.map((row) => (row.id === renameTarget.id ? { ...row, title: next } : row)),
        );
      }
      setRenameTarget(null);
      notify('Recording renamed');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not rename recording');
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(deleteTarget.id);
      }
      setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      notify('Recording deleted');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete recording');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <ConfirmDialog
        open={Boolean(renameTarget)}
        title="Rename recording"
        description="Choose a name that makes this recording easy to find later."
        confirmLabel="Save name"
        cancelLabel="Cancel"
        busy={renaming}
        input={{
          label: 'Recording name',
          value: renameValue,
          placeholder: 'Enter a title',
          onChange: setRenameValue,
        }}
        onClose={() => {
          if (!renaming) setRenameTarget(null);
        }}
        onConfirm={() => void confirmRename()}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this recording?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently deleted. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete recording"
        cancelLabel="Keep recording"
        danger
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#EEF1F5] bg-[#FAFBFC]">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="size-3.5 rounded border-[#CBD5E1] text-[#016BE6] accent-[#016BE6]"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="min-w-[240px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Recording Name
              </th>
              <th className="min-w-[140px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Meeting
              </th>
              <th className="min-w-[110px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#016BE6]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                >
                  Date & Time
                  {sortDir === 'desc' ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronUp className="size-3.5" />
                  )}
                </button>
              </th>
              <th className="min-w-[72px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Duration
              </th>
              <th className="min-w-[72px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Size
              </th>
              <th className="min-w-[56px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Views
              </th>
              <th className="min-w-[140px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Shared By
              </th>
              <th className="w-12 px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#8A94A6]">
                  No recordings match your search or filters.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr
                  key={r.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/app/recordings/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/app/recordings/${r.id}`);
                    }
                  }}
                  className="cursor-pointer border-b border-[#F1F4F8] last:border-b-0 hover:bg-[#FAFBFC]"
                >
                  <td
                    className="px-3 py-3 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="size-3.5 rounded border-[#CBD5E1] text-[#016BE6] accent-[#016BE6]"
                      aria-label={`Select ${r.title}`}
                    />
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#E8F1FE]"
                        aria-hidden
                      >
                        <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                          <span className="flex size-7 items-center justify-center rounded-full bg-[#016BE6] shadow-sm">
                            <Play className="size-3 text-white" fill="currentColor" />
                          </span>
                        </span>
                        <span className="absolute right-1 bottom-1 rounded bg-black/55 px-1 py-px text-[9px] font-medium text-white">
                          {r.duration}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#151D2B]">
                          {r.title}
                        </p>
                        <div className="mt-1.5 flex items-center">
                          {(r.people?.length
                            ? r.people
                            : r.avatars.map((src) => ({ name: '', avatarUrl: src, avatarColor: null }))
                          ).map((person, i) => (
                            <UserAvatar
                              key={`${r.id}-a-${i}`}
                              name={person.name}
                              avatarUrl={person.avatarUrl}
                              avatarColor={person.avatarColor}
                              size="xs"
                              ring
                              className={cn(i > 0 && '-ml-1.5')}
                            />
                          ))}
                          {r.moreCount > 0 ? (
                            <span className="-ml-1.5 flex size-5 items-center justify-center rounded-full bg-[#E8EEF5] text-[9px] font-semibold text-[#64748B] ring-2 ring-white">
                              +{r.moreCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <p className="max-w-[160px] text-[12px] leading-snug text-[#334155]">{r.meeting}</p>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <p className="text-[12px] font-medium text-[#151D2B]">{r.date}</p>
                    <p className="mt-0.5 text-[11px] text-[#8A94A6]">{r.time}</p>
                  </td>

                  <td className="px-3 py-3 align-middle text-[12px] text-[#334155]">{r.duration}</td>
                  <td className="px-3 py-3 align-middle text-[12px] text-[#334155]">{r.size}</td>
                  <td className="px-3 py-3 align-middle text-[12px] text-[#334155]">{r.views}</td>

                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <img
                        src={r.sharedBy.avatar}
                        alt=""
                        className="size-6 rounded-full object-cover"
                      />
                      <span className="truncate text-[12px] font-medium text-[#151D2B]">
                        {r.sharedBy.name}
                      </span>
                    </div>
                  </td>

                  <td
                    className="px-2 py-3 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActionsMenu actions={actionsFor(r)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F5] px-4 py-3">
        <p className="text-[12px] text-[#8A94A6]">
          {total === 0
            ? 'Showing 0 recordings'
            : `Showing ${start + 1} to ${end} of ${total} recordings`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-[12px] font-semibold',
                safePage === n
                  ? 'bg-[#016BE6] text-white'
                  : 'text-[#64748B] hover:bg-[#F1F5F9]',
              )}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="relative ml-1" ref={pageSizeRef}>
            <button
              type="button"
              onClick={() => setPageSizeOpen((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-medium text-[#334155] hover:bg-[#F8FAFC]"
            >
              {pageSize} / page
              <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </button>
            {pageSizeOpen ? (
              <div className="absolute right-0 bottom-[calc(100%+6px)] z-40 min-w-[110px] overflow-hidden rounded-lg border border-[#E8ECF1] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                {PAGE_SIZES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-[12px] font-medium hover:bg-[#F5F7FA]',
                      pageSize === n ? 'text-[#016BE6]' : 'text-[#151D2B]',
                    )}
                    onClick={() => {
                      setPageSize(n);
                      setPageSizeOpen(false);
                    }}
                  >
                    {n} / page
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

type FilterPanelProps = {
  open: boolean;
  value: RecordingFilters;
  onChange: (next: RecordingFilters) => void;
  onClose: () => void;
  onClear: () => void;
};

export function RecordingsFilterPanel({
  open,
  value,
  onChange,
  onClose,
  onClear,
}: FilterPanelProps) {
  if (!open) return null;

  return (
    <div className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#151D2B]">Filters</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
          aria-label="Close filters"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-[11px] font-semibold text-[#6F7B8C]">
          Shared by
          <select
            value={value.sharedBy}
            onChange={(e) => onChange({ ...value, sharedBy: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-medium text-[#151D2B] outline-none"
          >
            <option value="">Anyone</option>
            {RECORDING_SHARED_BY_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] font-semibold text-[#6F7B8C]">
          Date range
          <select
            value={value.dateRange}
            onChange={(e) =>
              onChange({
                ...value,
                dateRange: e.target.value as RecordingFilters['dateRange'],
              })
            }
            className="mt-1.5 h-9 w-full rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-medium text-[#151D2B] outline-none"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>

        <label className="block text-[11px] font-semibold text-[#6F7B8C]">
          Min. views
          <select
            value={value.minViews}
            onChange={(e) => onChange({ ...value, minViews: Number(e.target.value) })}
            className="mt-1.5 h-9 w-full rounded-lg border border-[#E1E7EE] bg-white px-2.5 text-[12px] font-medium text-[#151D2B] outline-none"
          >
            <option value={0}>Any</option>
            <option value={10}>10+</option>
            <option value={20}>20+</option>
            <option value={30}>30+</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-semibold text-[#016BE6] hover:underline"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

export const DEFAULT_RECORDING_FILTERS: RecordingFilters = {
  sharedBy: '',
  dateRange: 'all',
  minViews: 0,
};
