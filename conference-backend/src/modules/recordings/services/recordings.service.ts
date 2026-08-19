import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';
import { recordingFileRepository, RecordingFileDeps } from '../recordings.repository';
import { convertToMp4 } from '../transcode';
import { sanitizeStorageSegment } from '../recordings.utils';
import type { SavedRecording, UploadRecordingInput } from '../recordings.types';

export interface RecordingServiceDeps {
  files: RecordingFileDeps;
  transcode: (inputWebm: string, outputMp4: string) => Promise<void>;
}

const defaultDeps: RecordingServiceDeps = {
  files: recordingFileRepository,
  transcode: convertToMp4,
};

export function createRecordingsService(deps: RecordingServiceDeps = defaultDeps) {
  return {
    async saveComposite(input: UploadRecordingInput): Promise<SavedRecording> {
      if (!Buffer.isBuffer(input.body) || input.body.length < 256) {
        throw new ValidationError('Empty or invalid recording body.');
      }

      const roomId = sanitizeStorageSegment(input.roomId || 'room');
      const recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const relativeDir = `${roomId}/${recordingId}`;
      const mp4Name = 'meeting-composite.mp4';
      const webmKey = `${relativeDir}/meeting-composite.webm`;
      const mp4Key = `${relativeDir}/${mp4Name}`;

      await deps.files.mkdir(relativeDir);
      await deps.files.putWebm(webmKey, input.body);

      const webmPath = deps.files.pathFor(webmKey);
      const mp4Path = deps.files.pathFor(mp4Key);

      try {
        await deps.transcode(webmPath, mp4Path);
      } catch (convErr) {
        await deps.files.delete(webmKey);
        await deps.files.delete(mp4Key);
        logger.error('MP4 conversion failed', {
          err: convErr instanceof Error ? convErr.message : String(convErr),
          webmPath,
        });
        throw new AppError(
          'Failed to create MP4. Check RECORDING_FFMPEG_PATH / FFmpeg install.',
          'TRANSCODE_FAILED',
          500,
        );
      }

      await deps.files.delete(webmKey);
      const bytes = await deps.files.size(mp4Path);
      const storageKey = deps.files.storageKey(mp4Key);

      logger.info('Meeting composite recording saved as MP4', {
        roomId,
        recordingId,
        bytes,
        storageKey,
        userId: input.userId,
      });

      return { roomId, recordingId, filename: mp4Name, bytes, storageKey };
    },
  };
}

export const recordingsService = createRecordingsService();
