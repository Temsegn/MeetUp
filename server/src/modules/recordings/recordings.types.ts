export interface SavedRecording {
  roomId: string;
  recordingId: string;
  filename: string;
  bytes: number;
  storageKey: string;
}

export interface UploadRecordingInput {
  roomId: string;
  userId: string;
  body: Buffer;
  workspaceId?: string | null;
  /** Optional: pass the meeting ID from the client so participants can be
   *  resolved even when the Meeting document has already been deleted. */
  meetingId?: string | null;
}
