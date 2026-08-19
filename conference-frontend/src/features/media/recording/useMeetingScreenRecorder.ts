import { useCallback, useEffect, useRef, useState } from 'react';
import { MeetingScreenRecorder } from './meeting-screen-recorder';
import { getAccessToken } from '../../../services/auth/auth.service';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

interface UseMeetingScreenRecorderOptions {
  roomId: string;
  getStageEl: () => HTMLElement | null;
  getAudioStreams: () => MediaStream[];
  /** Open chat so messages appear in the composite. */
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
  warning?: string;
  error?: string;
}

async function uploadRecording(roomId: string, blob: Blob): Promise<SaveRecordingResponse> {
  const token = getAccessToken() ?? '';
  const res = await fetch(`${API_URL}/recordings/${encodeURIComponent(roomId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': blob.type || 'video/webm',
    },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data as SaveRecordingResponse;
}

/**
 * Records meeting layout + chat in-page (no browser “Sharing this tab” bar)
 * and auto-saves MP4 on the server.
 */
export function useMeetingScreenRecorder({
  roomId,
  getStageEl,
  getAudioStreams,
  onCaptureReady,
  addToast,
}: UseMeetingScreenRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const recorderRef = useRef<MeetingScreenRecorder | null>(null);

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
    addToast?.('Starting meeting recording…');
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
      addToast?.('Recording meeting + chat (no share bar). Stop to save MP4.');
    } catch (err) {
      recorderRef.current = null;
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      addToast?.(msg);
    } finally {
      setIsBusy(false);
    }
  }, [isRecording, isBusy, getStageEl, getAudioStreams, roomId, addToast, onCaptureReady]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || isBusy) return;
    setIsBusy(true);
    addToast?.('Saving MP4 to server…');
    try {
      const result = await recorderRef.current?.stop({ downloadLocal: false });
      recorderRef.current = null;
      setIsRecording(false);

      if (!result) {
        addToast?.('Recording was empty — try again and record a bit longer.');
        return;
      }

      const saved = await uploadRecording(roomId, result.blob);
      setLastSavedPath(saved.path);
      addToast?.(`Saved MP4: ${saved.path}`);
    } catch (err) {
      recorderRef.current = null;
      setIsRecording(false);
      const msg = err instanceof Error ? err.message : 'Failed to save recording';
      addToast?.(msg);
    } finally {
      setIsBusy(false);
    }
  }, [isRecording, isBusy, addToast, roomId]);

  return {
    isRecording,
    isBusy,
    lastSavedPath,
    startRecording,
    stopRecording,
  };
}
