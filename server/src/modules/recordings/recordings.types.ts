export interface SavedRecording {
  roomId: string;
  recordingId: string;
  filename: string;
  bytes: number;
  storageKey: string;
  /** 'processing' until the background MP4 conversion finishes. */
  status: 'processing' | 'ready';
}

export interface UploadRecordingInput {
  roomId: string;
  userId: string;
  /** Absolute path of the uploaded WebM (streamed to disk by the route). */
  filePath: string;
  workspaceId?: string | null;
  /** Optional: pass the meeting ID from the client so participants can be
   *  resolved even when the Meeting document has already been deleted. */
  meetingId?: string | null;
}
