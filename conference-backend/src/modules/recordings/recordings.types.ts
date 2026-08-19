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
}
