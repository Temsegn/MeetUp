import { useEffect, useRef, useState } from 'react';
import { CloudUpload, Loader2, X } from 'lucide-react';
import { API_URL } from '../../../lib/apiUrl';
import { getAccessToken, refreshSession } from '../../../services/auth/auth.service';

type Props = {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
  /** Called after the server accepted the file (it converts to MP4 in the background). */
  onUploaded: () => void;
};

/** Matches the server limit in recordings.routes.ts (MAX_RECORDING_BYTES). */
const MAX_BYTES = 3 * 1024 ** 3;

function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120) || 'Uploaded recording';
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;
}

/** XHR (not fetch) so we can show real upload progress for large files. */
function uploadWithProgress(opts: {
  file: File;
  title: string;
  workspaceId: string;
  token: string;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<{ status: number; body: { error?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const roomId = `upload-${Date.now().toString(36)}`;
    xhr.open('POST', `${API_URL}/recordings/${roomId}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', `Bearer ${opts.token}`);
    xhr.setRequestHeader('X-Workspace-Id', opts.workspaceId);
    xhr.setRequestHeader('X-Recording-Title', encodeURIComponent(opts.title));
    xhr.setRequestHeader('Content-Type', opts.file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* non-JSON error page */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(opts.file);
  });
}

export function UploadRecordingDialog({ open, workspaceId, onClose, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle('');
    setProgress(null);
    setError(null);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!open) return null;
  const uploading = progress !== null;

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith('video/') && !/\.(webm|mp4|mov|mkv|m4v)$/i.test(f.name)) {
      setError('Choose a video file (MP4, WebM, MOV or MKV).');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(f.size)}. The maximum is 3 GB.`);
      return;
    }
    setFile(f);
    setTitle((t) => t || titleFromFile(f.name));
  };

  const submit = async () => {
    if (!file || !workspaceId) return;
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const send = (token: string) =>
        uploadWithProgress({
          file,
          title: title.trim() || titleFromFile(file.name),
          workspaceId,
          token,
          onProgress: setProgress,
          signal: controller.signal,
        });
      let res = await send(getAccessToken() ?? '');
      if (res.status === 401 && (await refreshSession())) {
        setProgress(0);
        res = await send(getAccessToken() ?? '');
      }
      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.body.error || `Upload failed (HTTP ${res.status}).`);
      }
      onUploaded();
      onClose();
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={uploading ? undefined : close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-recording-title"
        className="relative w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="upload-recording-title" className="text-[15px] font-bold text-[#151D2B]">
              Upload recording
            </h2>
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
              Add a video to your workspace library. It's converted to MP4 after upload.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#334155]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!uploading) pick(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#CBD5E1] px-4 py-6 text-center transition hover:border-[#016BE6] disabled:opacity-60"
        >
          <CloudUpload className="size-6 text-[#016BE6]" />
          {file ? (
            <>
              <span className="max-w-full truncate text-[13px] font-semibold text-[#151D2B]">{file.name}</span>
              <span className="text-[11px] text-[#8A94A6]">{formatBytes(file.size)} · click to change</span>
            </>
          ) : (
            <>
              <span className="text-[13px] font-semibold text-[#151D2B]">Choose a video or drop it here</span>
              <span className="text-[11px] text-[#8A94A6]">MP4, WebM, MOV or MKV · up to 3 GB</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.webm,.mp4,.mov,.mkv,.m4v"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <label className="mt-4 block text-[11px] font-semibold text-[#475569]" htmlFor="upload-recording-name">
          Title
        </label>
        <input
          id="upload-recording-name"
          value={title}
          disabled={uploading}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recording title"
          className="mt-1 h-10 w-full rounded-xl border border-[#E1E7EE] bg-white px-3 text-[16px] outline-none focus:border-[#016BE6] disabled:bg-[#F8FAFC] sm:text-[13px]"
        />

        {uploading ? (
          <div className="mt-4" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF1]">
              <div
                className="h-full rounded-full bg-[#016BE6] transition-[width]"
                style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">
              {progress !== null && progress >= 1 ? 'Finishing…' : `Uploading ${Math.round((progress ?? 0) * 100)}%`}
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-[#DC2626]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!file || uploading || !workspaceId}
          onClick={() => void submit()}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0159C7] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
