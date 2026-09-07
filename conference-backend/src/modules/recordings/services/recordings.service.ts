import { Types } from 'mongoose';
import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';
import { recordingFileRepository, RecordingFileDeps } from '../recordings.repository';
import { convertToMp4, probeDurationSeconds } from '../transcode';
import { sanitizeStorageSegment } from '../recordings.utils';
import type { SavedRecording, UploadRecordingInput } from '../recordings.types';
import { Recording } from '../../../database/models/Recording.model';
import { Meeting } from '../../../database/models/Meeting.model';
import { WorkspaceMember } from '../../../database/models/WorkspaceMember.model';

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
      const durationSeconds = await probeDurationSeconds(mp4Path);
      const storageKey = deps.files.storageKey(mp4Key);

      logger.info('Meeting composite recording saved as MP4', {
        roomId,
        recordingId,
        bytes,
        durationSeconds,
        storageKey,
        userId: input.userId,
      });

      // Persist metadata in Recording collection (required for list/play)
      const meeting = await Meeting.findOne({ roomId }).lean();
      let workspaceId: Types.ObjectId | null = null;
      if (input.workspaceId && Types.ObjectId.isValid(input.workspaceId)) {
        workspaceId = new Types.ObjectId(input.workspaceId);
      } else if (meeting?.workspaceId) {
        workspaceId = meeting.workspaceId as Types.ObjectId;
      } else {
        const member = await WorkspaceMember.findOne({
          userId: new Types.ObjectId(input.userId),
          status: 'active',
        }).lean();
        if (member?.workspaceId) workspaceId = member.workspaceId as Types.ObjectId;
      }

      if (!workspaceId) {
        await deps.files.delete(mp4Key).catch(() => {});
        throw new ValidationError('Workspace is required to save a recording. Rejoin from your organization.');
      }

      try {
        // Snapshot host + registered participants so recording cards show profile images
        let participants: Array<{ userId: string; name: string; avatarUrl?: string | null }> = [];
        if (meeting?._id) {
          const { listMeetingParticipants } = await import(
            '../../meetings/services/meeting-participants.service'
          );
          const roster = await listMeetingParticipants(String(meeting._id));
          participants = roster.map((p) => ({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl ?? null,
          }));
        }
        if (participants.length === 0) {
          const uploader = await import('../../auth/auth.repository').then((m) =>
            m.authRepository.findUserById(input.userId),
          );
          if (uploader) {
            participants = [
              {
                userId: String(uploader.id),
                name: uploader.name,
                avatarUrl: uploader.avatarUrl ?? null,
              },
            ];
          }
        }

        await Recording.create({
          workspaceId,
          meetingId: meeting?._id ?? undefined,
          roomId,
          recordingId,
          title: meeting?.title || `Recording ${new Date().toLocaleDateString()}`,
          source: 'client_composite',
          storageKey,
          filename: mp4Name,
          mimeType: 'video/mp4',
          bytes,
          durationSeconds,
          sharedBy: new Types.ObjectId(input.userId),
          participants,
          status: 'ready',
        });
      } catch (dbErr) {
        logger.error('Failed to persist recording metadata', { err: String(dbErr) });
        throw new AppError(
          'Recording file saved but metadata failed. Please try again.',
          'RECORDING_META_FAILED',
          500,
        );
      }

      return { roomId, recordingId, filename: mp4Name, bytes, storageKey };
    },
  };
}

export const recordingsService = createRecordingsService();
