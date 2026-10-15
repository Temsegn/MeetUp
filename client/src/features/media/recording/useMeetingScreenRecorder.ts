import { useCallback, useEffect, useRef, useState } from 'react';
import { MeetingScreenRecorder } from './meeting-screen-recorder';
import { getAccessToken, refreshSession, notifySessionExpired } from '../../../services/auth/auth.service';
import { API_URL } from '../../../lib/apiUrl';


interface UseMeetingScreenRecorderOptions {
  roomId: string;
  workspaceId?: string | null;
  getStageEl: () => HTMLElement | null;
  getAudioStreams: () => MediaStream[];
  onCaptureReady?: () => void;
  addToast?: (message: string) => void;
}

interface SaveRecordingResponse {
  success: boolean;
  format?: 'mp4' | 'webm';
  path: string;
  relativePath: string;
  filename: string;
  bytes: number;
  recordingId?: string;
  warning?: string;
  error?: string;
}

async function uploadRecording(
  roomId: string,
  blob: Blob,
  workspaceId?: string | null,
): Promise<SaveRecordingResponse> {
  const doFetch = async () => {
    const token = getAccessToken() ?? '';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': blob.type || 'video/webm',
    };
    if (workspaceId) headers['X-Workspace-Id'] = workspaceId;

    return fetch(`${API_URL}/recordings/${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: blob,
    });
  };

  const attempt = async (): Promise<Response> => {
    try {
      return await doFetch();
    } catch {
      throw new Error(
        'Failed to reach the server. Check that the backend is running and VITE_API_URL is correct.',
      );
    }
  };

  let res = await attempt();

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        res = await doFetch();
      } catch {
        throw new Error('Failed to upload recording after refreshing your session.');
      }
    } else {
      notifySessionExpired();
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  // One retry for transient upstream / gateway failures.
  if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504 || res.status >= 500)) {
    await new Promise((r) => window.setTimeout(r, 800));
    res = await attempt();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return data as SaveRecordingResponse;
}

function downloadBlobLocally(blob: Blob, roomId: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `samtal-recording-${roomId}-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Records the live meeting UI silently (no share picker / pause cover),
 * then auto-saves to the server when stopped.
 */
export function useMeetingScreenRecorder({
  roomId,
  workspaceId,
  getStageEl,
  getAudioStreams,
  onCaptureReady,
  addToast,
}: UseMeetingScreenRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const recorderRef = useRef<MeetingScreenRecorder | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    return () => {
      void recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isBusy) return;
    const stageEl = getStageEl();
    if (!stageEl) {
      addToast?.('Meeting is not ready to record yet.');
      return;
    }

    setIsBusy(true);
    try {
      const recorder = new MeetingScreenRecorder();
      recorderRef.current = recorder;
      await recorder.start({
        stageEl,
        getAudioStreams,
        filePrefix: `meetup-${roomId}`,
        onCaptureReady,
      });
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
      addToast?.('Recording…');
    } catch (err) {
      recorderRef.current = null;
      setRecordingStartedAt(null);
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      addToast?.(msg);
    } finally {
      setIsBusy(false);
    }
  }, [isRecording, isBusy, getStageEl, getAudioStreams, roomId, addToast, onCaptureReady]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || isBusy || stoppingRef.current) return;
    stoppingRef.current = true;
    setIsBusy(true);
    addToast?.('Saving recording…');
    try {
      const result = await recorderRef.current?.stop({ downloadLocal: false });
      recorderRef.current = null;
      setIsRecording(false);
      setRecordingStartedAt(null);

      if (!result) {
        addToast?.('Recording was empty — try again and record a bit longer.');
        return;
      }

      if (!workspaceId) {
        downloadBlobLocally(result.blob, roomId);
        addToast?.(
          'No workspace selected — recording downloaded locally. Join a workspace to save to Recordings.',
        );
        return;
      }

      try {
        const saved = await uploadRecording(roomId, result.blob, workspaceId);
        setLastSavedPath(saved.path);
        addToast?.(
          `Recording saved (${Math.round(saved.bytes / 1e6)} MB). Find it under Recordings.`,
        );
      } catch (uploadErr) {
        // Never lose the take — fall back to a local download.
        downloadBlobLocally(result.blob, roomId);
        const msg =
          uploadErr instanceof Error ? uploadErr.message : 'Failed to save recording';
        addToast?.(`${msg} — downloaded a local copy so the recording is not lost.`);
      }
    } catch (err) {
      recorderRef.current = null;
      setIsRecording(false);
      setRecordingStartedAt(null);
      const msg = err instanceof Error ? err.message : 'Failed to save recording';
      addToast?.(msg);
    } finally {
      setIsBusy(false);
      stoppingRef.current = false;
    }
  }, [isRecording, isBusy, addToast, roomId, workspaceId]);

  return {
    isRecording,
    isBusy,
    recordingStartedAt,
    lastSavedPath,
    startRecording,
    stopRecording,
  };
}
