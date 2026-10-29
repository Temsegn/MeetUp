import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  Eye,
  HardDrive,
  Play,
  Share2,
  Users,
} from 'lucide-react';
import { RecordingPlayer } from '../components/RecordingPlayer';
import { RecordingDetailSkeleton } from '../components/DashboardSkeletons';
import { RowActionsMenu } from '../components/RowActionsMenu';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { cn } from '../../../lib/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { recordingShareUrl } from '../../../lib/frontendUrl';
import { recordingsService, type Recording } from '../../../services/recordings/recordings.service';

/**
 * Watch page: player + details below; recordings list on the right.
 *
 * Bug fixes applied:
 *  - Bug 1: Only mount <RecordingPlayer> when status === 'ready'; show
 *    "Processing…" or "Recording unavailable" for other statuses so the
 *    player never shows a fake-playing blank state.
 *  - Bug 2: Stream URL is built via getStreamDirectUrl (plain string, no
 *    full-file blob download) so the browser can use HTTP range requests
 *    and start playback immediately.
 *  - Bug 4: Rename option removed from the actions menu.
 */
export function RecordingDetailPage() {
  const { recordingId = '' } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !recordingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      recordingsService.get(activeWorkspace.workspaceId, recordingId),
      recordingsService.list(activeWorkspace.workspaceId, { page: 1, limit: 20 }),
    ])
      .then(([current, list]) => {
        setRecording(current);
        setRecordings(list.recordings);
        // Bug 1 + Bug 2: only build a stream URL when the recording is ready
        // to play. getStreamDirectUrl returns a plain string (no blob fetch)
        // so the browser can immediately begin buffering via range requests.
        if (current.status === 'ready') {
          const url = recordingsService.getStreamDirectUrl(
            activeWorkspace.workspaceId,
            recordingId,
          );
          setStreamUrl(url);
          // Poster: synchronous URL build — server returns 204 if not ready yet,
          // browser will silently ignore it and show a black frame instead.
          setPosterUrl(
            recordingsService.getPosterUrl(activeWorkspace.workspaceId, recordingId),
          );
        } else {
          setStreamUrl(null);
          setPosterUrl(null);
        }
      })
      .catch(() => {
        setRecording(null);
        setRecordings([]);
      })
      .finally(() => setLoading(false));

    return () => {
      setStreamUrl(null);
      setPosterUrl(null);
    };
  }, [activeWorkspace?.workspaceId, recordingId]);

  if (loading) {
    return <RecordingDetailSkeleton />;
  }

  if (!recording) {
    return <Navigate to="/app/recordings" replace />;
  }

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const share = async () => {
    const url = recordingShareUrl(recording.id);
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copied to clipboard');
    } catch {
      notify(url);
    }
  };

  const createdAt = new Date(recording.createdAt);
  const durationLabel =
    recording.durationSeconds > 0
      ? `${Math.floor(recording.durationSeconds / 60)}m ${recording.durationSeconds % 60}s`
      : '—';
  const sizeLabel = recording.bytes > 0 ? `${(recording.bytes / 1e6).toFixed(1)} MB` : '—';
  const participantCount = recording.participants?.length ?? 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden pr-2 sm:pr-3 md:pr-4">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/app/recordings')}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#016BE6] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Recordings
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#334155] shadow-sm hover:bg-[#F8FAFC]"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                if (!activeWorkspace?.workspaceId || !recording) {
                  notify('Stream is not ready yet');
                  return;
                }
                try {
                  notify('Downloading…');
                  await recordingsService.download(
                    activeWorkspace.workspaceId,
                    recording.id,
                    recording.title,
                  );
                  notify('Download started');
                } catch (err) {
                  notify(err instanceof Error ? err.message : 'Download failed');
                }
              })();
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#334155] shadow-sm hover:bg-[#F8FAFC]"
          >
            <Download className="size-3.5" />
            Download
          </button>
          {/* Bug 4: Rename removed from actions */}
          <RowActionsMenu
            actions={[
              { label: 'Copy link', onClick: () => void share() },
              {
                label: 'Open in new tab',
                onClick: () => window.open(recordingShareUrl(recording.id), '_blank'),
              },
              {
                label: 'Delete',
                danger: true,
                onClick: () => setDeleteOpen(true),
              },
            ]}
          />
        </div>
      </div>

      {/* ── Delete dialog ── */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete this recording?"
        description={`"${recording.title}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete recording"
        cancelLabel="Keep recording"
        danger
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void (async () => {
            if (!activeWorkspace?.workspaceId) {
              notify('No workspace selected');
              return;
            }
            setDeleting(true);
            try {
              await recordingsService.delete(activeWorkspace.workspaceId, recording.id);
              notify('Recording deleted');
              navigate('/app/recordings');
            } catch (err) {
              notify(err instanceof Error ? err.message : 'Could not delete recording');
              setDeleting(false);
            }
          })();
        }}
      />

      {/* ── Main grid ── */}
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4">
        {/* Left: video + scrollable details */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">

          {/* Bug 1: status-aware player area */}
          <div className="min-h-0 flex-[1.15] overflow-hidden">
            {recording.status === 'ready' ? (
              <RecordingPlayer
                key={recording.id}
                title={recording.title}
                durationSec={recording.durationSeconds}
                src={streamUrl ?? undefined}
                poster={posterUrl ?? undefined}
                className="h-full min-h-[200px]"
              />
            ) : recording.status === 'processing' ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl bg-[#0B1220]">
                <div className="size-10 animate-spin rounded-full border-4 border-white/10 border-t-[#016BE6]" />
                <p className="text-[13px] font-medium text-white/60">Processing recording…</p>
                <p className="text-[11px] text-white/30">
                  This may take a few minutes. Refresh to check again.
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl bg-[#0B1220]">
                <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20 text-2xl">
                  ⚠️
                </div>
                <p className="text-[13px] font-medium text-white/60">Recording unavailable</p>
                <p className="text-[11px] text-white/30">
                  This recording could not be processed or the file is missing.
                </p>
              </div>
            )}
          </div>

          {/* Scrollable details */}
          <div className="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-1">
            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <h1 className="text-lg font-bold tracking-tight text-[#151D2B] sm:text-xl">
                {recording.title}
              </h1>
              <p className="mt-1 text-[12px] text-[#6F7B8C]">
                {recording.roomId}
                <span className="mx-1.5 text-[#CBD5E1]">•</span>
                {createdAt.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {createdAt.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                  <Clock3 className="size-3 text-[#016BE6]" />
                  {durationLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                  <HardDrive className="size-3 text-[#016BE6]" />
                  {sizeLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                  <Eye className="size-3 text-[#016BE6]" />
                  {recording.views} views
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                  <CalendarDays className="size-3 text-[#016BE6]" />
                  {createdAt.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Bug 3: participants now show all attendees (fixed server-side) */}
            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[#151D2B]">
                  <Users className="size-4 text-[#016BE6]" />
                  Participants
                </h2>
                <span className="text-[11px] font-medium text-[#8A94A6]">
                  {participantCount} {participantCount === 1 ? 'person' : 'people'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(recording.participants ?? []).map((participant, i) => (
                  <UserAvatar
                    key={`${recording.id}-p-${i}`}
                    name={participant.name}
                    avatarUrl={participant.avatarUrl}
                    avatarColor={participant.avatarColor}
                    size="md"
                    ring
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <h2 className="text-[13px] font-semibold text-[#151D2B]">About</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#54708C]">
                {recording.description || 'No description available for this recording yet.'}
              </p>
              <div className="mt-3 border-t border-[#EEF1F5] pt-3 text-[11px] text-[#8A94A6]">
                Source: {recording.status} · Recording ID: {recording.recordingId}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: recordings list */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] max-lg:max-h-[40vh]">
          <div className="shrink-0 border-b border-[#EEF1F5] px-3.5 py-3">
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Recordings</h2>
            <p className="text-[11px] text-[#8A94A6]">
              {recordings.length} files — click a row to play
            </p>
          </div>

          <ul className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {recordings.map((r) => {
              const active = r.id === recording.id;
              const itemDate = new Date(r.createdAt);
              const itemDuration =
                r.durationSeconds > 0 ? `${Math.floor(r.durationSeconds / 60)}m` : '—';
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/recordings/${r.id}`)}
                    className={cn(
                      'flex w-full gap-2.5 rounded-xl px-2 py-2 text-left transition',
                      active
                        ? 'bg-[#E8F1FE] ring-1 ring-[#016BE6]/25'
                        : 'hover:bg-[#F8FAFC]',
                    )}
                  >
                    <div className="relative h-12 w-[68px] shrink-0 overflow-hidden rounded-lg bg-[#0B1220]">
                      <span
                        className={cn(
                          'absolute inset-0 flex items-center justify-center',
                          active ? 'bg-[#016BE6]/35' : 'bg-black/20',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full',
                            active ? 'bg-[#016BE6] text-white' : 'bg-black/45 text-white',
                          )}
                        >
                          <Play className="size-2.5" fill="currentColor" />
                        </span>
                      </span>
                      <span className="absolute right-0.5 bottom-0.5 rounded bg-black/55 px-1 text-[8px] font-medium text-white">
                        {itemDuration}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'line-clamp-2 text-[12px] font-semibold',
                          active ? 'text-[#016BE6]' : 'text-[#151D2B]',
                        )}
                      >
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#8A94A6]">
                        {itemDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {r.views} views
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Toast */}
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
