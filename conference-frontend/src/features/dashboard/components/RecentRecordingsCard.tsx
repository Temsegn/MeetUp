import { useState } from 'react';
import { ArrowUpRight, Download, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { RowActionsMenu } from './RowActionsMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecordings } from '../hooks/useRecordings';
import { recordingsService } from '../../../services/recordings/recordings.service';
import { RecordingRowSkeleton } from './DashboardSkeletons';
import {
  DASHBOARD_CARD_RADIUS_CLASS,
  DASHBOARD_LIST_CARD_HEADER_CLASS,
  DASHBOARD_LIST_CLASS,
  DASHBOARD_LIST_EMPTY_CLASS,
  DASHBOARD_RECORDING_ROW_CLASS,
  DASHBOARD_RECORDING_THUMB_CLASS,
} from './dashboardListStyles';

function formatBytes(n?: number) {
  if (!n || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(0)} MB`;
}

/** Always minutes:seconds, e.g. 0:12 or 45:12 */
function formatDuration(sec?: number | null) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RecentRecordingsCard() {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const { recordings, loading, rename } = useRecordings({ page: 1, limit: 5 });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const download = async (id: string, title: string) => {
    if (!activeWorkspace?.workspaceId || downloadingId) return;
    setDownloadingId(id);
    try {
      await recordingsService.download(activeWorkspace.workspaceId, id, title);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SectionCard
      className={DASHBOARD_CARD_RADIUS_CLASS}
      title="Recent Recordings"
      headerClassName={DASHBOARD_LIST_CARD_HEADER_CLASS}
      action={
        <button
          type="button"
          onClick={() => navigate('/app/recordings')}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-[#006DEC] hover:underline"
        >
          View all <ArrowUpRight className="size-2.5" />
        </button>
      }
    >
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
        onConfirm={() => {
          void (async () => {
            if (!renameTarget) return;
            const next = renameValue.trim();
            if (!next || next === renameTarget.title) {
              setRenameTarget(null);
              return;
            }
            setRenaming(true);
            try {
              await rename(renameTarget.id, next);
              setRenameTarget(null);
            } catch (err) {
              window.alert(err instanceof Error ? err.message : 'Could not rename recording.');
            } finally {
              setRenaming(false);
            }
          })();
        }}
      />
      {loading ? (
        <ul className={DASHBOARD_LIST_CLASS} aria-busy="true" aria-label="Loading recordings">
          {Array.from({ length: 5 }, (_, i) => (
            <RecordingRowSkeleton key={i} />
          ))}
        </ul>
      ) : recordings.length === 0 ? (
        <p className={DASHBOARD_LIST_EMPTY_CLASS}>0</p>
      ) : (
        <ul className={DASHBOARD_LIST_CLASS}>
          {recordings.slice(0, 5).map((r) => {
            const date = new Date(r.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const meta = `${date} • ${formatDuration(r.durationSeconds)}`;

            return (
              <li key={r.id} className={DASHBOARD_RECORDING_ROW_CLASS}>
                <button
                  type="button"
                  onClick={() => navigate(`/app/recordings/${r.id}`)}
                  className={DASHBOARD_RECORDING_THUMB_CLASS}
                  aria-label={`Play ${r.title}`}
                >
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-[#016BE6]">
                    REC
                  </span>
                  <span className="absolute bottom-1 left-1 flex size-4 items-center justify-center rounded-full bg-black/45">
                    <Play className="size-2 text-white" fill="currentColor" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/app/recordings/${r.id}`)}
                  className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-2 text-left"
                >
                  <p className="truncate text-[12px] font-semibold leading-tight text-[#151D2B] hover:text-[#016BE6]">
                    {r.title}
                  </p>
                  <p className="text-[10px] leading-tight tabular-nums text-[#8A94A6]">{meta}</p>
                  <p className="text-[10px] leading-tight text-[#8A94A6]">
                    {formatBytes(r.bytes)}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-1.5 self-center">
                  <button
                    type="button"
                    disabled={downloadingId === r.id}
                    onClick={() => void download(r.id, r.title)}
                    className="rounded-md p-1 text-[#006DEC] hover:bg-[#E8F1FE] disabled:opacity-50"
                    aria-label={`Download ${r.title}`}
                  >
                    <Download className="size-3.5" strokeWidth={2} />
                  </button>
                  <RowActionsMenu
                    actions={[
                      {
                        label: 'Play recording',
                        onClick: () => navigate(`/app/recordings/${r.id}`),
                      },
                      {
                        label: downloadingId === r.id ? 'Downloading…' : 'Download',
                        onClick: () => void download(r.id, r.title),
                      },
                      { label: 'Share link' },
                      {
                        label: 'Rename',
                        onClick: () => {
                          setRenameTarget({ id: r.id, title: r.title });
                          setRenameValue(r.title);
                        },
                      },
                      { label: 'Delete', danger: true },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
