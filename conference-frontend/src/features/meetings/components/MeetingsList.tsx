import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { RowActionsMenu } from '../../dashboard/components/RowActionsMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { cn } from '../../../lib/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { meetingsService } from '../../../services/meetings/meetings.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import {
  STATUS_META,
  type ListedMeeting,
} from '../data/meetings.data';

const PAGE_SIZES = [5, 10, 20] as const;

type Props = {
  meetings: ListedMeeting[];
  /** Reset pagination when filters change */
  filterKey?: string;
  onChanged?: () => void;
};

export function MeetingsList({ meetings, filterKey = '', onChanged }: Props) {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(5);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ListedMeeting | null>(null);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [filterKey, pageSize]);

  useEffect(() => {
    if (!pageSizeOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pageSizeRef.current?.contains(e.target as Node)) setPageSizeOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pageSizeOpen]);

  const total = meetings.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = meetings.slice(start, end);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 2) return [1, 2, 3];
    if (safePage >= totalPages - 1) return [totalPages - 2, totalPages - 1, totalPages];
    return [safePage - 1, safePage, safePage + 1];
  }, [safePage, totalPages]);

  /** Live → room. Upcoming / cancelled / ended → preview detail page. */
  const openDetail = (m: ListedMeeting) => {
    if (m.status === 'live') {
      navigate(`/app/meeting/${m.roomId ?? m.id}`);
      return;
    }
    navigate(`/app/meetings/${m.id}`);
  };

  const confirmCancel = async () => {
    if (!activeWorkspace?.workspaceId || !cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await meetingsService.cancel(activeWorkspace.workspaceId, cancelTarget.id);
      setCancelTarget(null);
      onChanged?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not cancel meeting.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#EEF1F5] bg-[#FAFBFC]">
              <th className="min-w-[240px] px-4 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Meeting Name
              </th>
              <th className="min-w-[120px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Date & Time
              </th>
              <th className="min-w-[80px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Duration
              </th>
              <th className="min-w-[110px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Participants
              </th>
              <th className="min-w-[120px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Host
              </th>
              <th className="min-w-[100px] px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Status
              </th>
              <th className="w-[140px] px-3 py-3 text-right text-[11px] font-semibold tracking-wide text-[#8A94A6]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[#8A94A6]">
                  No meetings match your search or filters.
                </td>
              </tr>
            ) : (
              pageRows.map((m) => {
                const meta = STATUS_META[m.status];

                return (
                  <tr
                    key={m.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openDetail(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(m);
                      }
                    }}
                    className="cursor-pointer border-b border-[#F1F4F8] last:border-b-0 hover:bg-[#FAFBFC]"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F1FE] text-[#016BE6]">
                          <Video className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#151D2B]">
                            {m.title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-[#8A94A6]">
                            Hosted by {m.host}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <p className="text-[12px] font-medium text-[#151D2B]">{m.date}</p>
                      <p className="mt-0.5 text-[11px] text-[#8A94A6]">{m.time}</p>
                    </td>

                    <td className="px-3 py-3 align-middle text-[12px] text-[#334155]">
                      {m.duration}
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {(m.people && m.people.length > 0
                            ? m.people
                            : [
                                {
                                  name: m.host,
                                  avatarUrl: m.hostAvatarUrl,
                                  avatarColor: m.hostAvatarColor,
                                },
                              ]
                          )
                            .slice(0, 3)
                            .map((p, i) => (
                              <span key={`${p.name}-${i}`} className={i === 0 ? '' : '-ml-1.5'}>
                                <UserAvatar
                                  name={p.name}
                                  avatarUrl={p.avatarUrl}
                                  avatarColor={p.avatarColor}
                                  size="sm"
                                  ring
                                />
                              </span>
                            ))}
                          {(() => {
                            const shown = Math.min(3, m.people?.length || 1);
                            const extra = Math.max(0, m.participants - shown);
                            return extra > 0 ? (
                              <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full bg-[#E8EEF5] text-[9px] font-semibold text-[#64748B] ring-2 ring-white">
                                +{extra}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <span className="text-[12px] text-[#334155]">{m.participants}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <p className="truncate text-[12px] text-[#334155]">{m.host}</p>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold',
                          meta.badge,
                        )}
                      >
                        {m.status === 'live' ? (
                          <span className={cn('size-2 animate-pulse rounded-full', meta.dot)} />
                        ) : null}
                        {meta.label}
                      </span>
                    </td>

                    <td
                      className="px-3 py-3 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {m.status === 'live' ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/meeting/${m.roomId ?? m.id}`)}
                            className="inline-flex h-9 items-center rounded-xl bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF]"
                          >
                            Join
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDetail(m)}
                            className="inline-flex h-9 items-center rounded-xl border border-[#E1E7EE] bg-white px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                          >
                            Preview
                          </button>
                        )}
                        <RowActionsMenu
                          actions={[
                            { label: 'View preview', onClick: () => openDetail(m) },
                            ...(m.status === 'live'
                              ? [
                                  {
                                    label:
                                      'Join conference',
                                    onClick: () =>
                                      navigate(`/app/meeting/${m.roomId ?? m.id}`),
                                  },
                                ]
                              : []),
                            ...(m.status === 'ended' && m.recordingId
                              ? [
                                  {
                                    label: 'Open recording',
                                    onClick: () =>
                                      navigate(`/app/recordings/${m.recordingId}`),
                                  },
                                ]
                              : []),
                            { label: 'Copy invite link' },
                            ...(m.status !== 'ended' && m.status !== 'cancelled'
                              ? [
                                  {
                                    label: busyId === m.id ? 'Cancelling…' : 'Cancel meeting',
                                    danger: true as const,
                                    onClick: () => setCancelTarget(m),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this meeting?"
        description={
          cancelTarget
            ? `“${cancelTarget.title}” will be marked as Cancelled. Participants will no longer be able to join.`
            : undefined
        }
        confirmLabel="Cancel meeting"
        cancelLabel="Keep meeting"
        danger
        busy={busyId === cancelTarget?.id}
        onClose={() => {
          if (busyId) return;
          setCancelTarget(null);
        }}
        onConfirm={() => void confirmCancel()}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F5] px-4 py-3">
        <p className="text-[12px] text-[#8A94A6]">
          {total === 0
            ? 'Showing 0 meetings'
            : `Showing ${start + 1} to ${end} of ${total} meetings`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] bg-white text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
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
                  : 'bg-white text-[#64748B] hover:bg-[#F1F5F9]',
              )}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-[#E1E7EE] bg-white text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
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
    </div>
  );
}
