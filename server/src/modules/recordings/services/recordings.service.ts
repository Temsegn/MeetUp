import { Types } from 'mongoose';
import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';
import { recordingFileRepository, RecordingFileDeps } from '../recordings.repository';
import { convertToMp4, probeDurationSeconds, extractPosterFrame } from '../transcode';
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

const MP4_NAME = 'meeting-composite.mp4';
const WEBM_NAME = 'meeting-composite.webm';

/** Strip the bucket prefix from a storageKey → key relative to the recordings bucket. */
function relativeKeyOf(storageKey: string): string {
  return storageKey.replace(/^recordings\//, '').replace(/^\/+/, '');
}

function dirOf(relativeKey: string): string {
  const i = relativeKey.lastIndexOf('/');
  return i === -1 ? '' : relativeKey.slice(0, i);
}

/**
 * Transcodes run one at a time: ffmpeg/libx264 is CPU-heavy and shares the box
 * with mediasoup — parallel conversions would degrade live meetings.
 */
let transcodeChain: Promise<void> = Promise.resolve();
const queued = new Set<string>();

export function createRecordingsService(deps: RecordingServiceDeps = defaultDeps) {
  /**
   * Background step: WebM → MP4 (+faststart), then flip the row to 'ready'.
   * On conversion failure the original WebM is kept and marked ready, so the
   * recording is never lost — it just plays as WebM.
   */
  async function finalizeRecording(recordingDbId: string): Promise<void> {
    const rec = await Recording.findById(recordingDbId);
    if (!rec || rec.status !== 'processing') return;

    const webmKey = relativeKeyOf(rec.storageKey);
    const mp4Key = `${dirOf(webmKey)}/${MP4_NAME}`;
    const webmPath = deps.files.pathFor(webmKey);
    const mp4Path = deps.files.pathFor(mp4Key);
    const started = Date.now();

    try {
      await deps.transcode(webmPath, mp4Path);
    } catch (err) {
      await deps.files.delete(mp4Key).catch(() => {});
      logger.error('Recording MP4 conversion failed — keeping WebM', {
        recordingId: rec.recordingId,
        err: err instanceof Error ? err.message : String(err),
      });
      rec.status = 'ready';
      rec.durationSeconds = await probeDurationSeconds(webmPath).catch(() => 0);
      await rec.save();
      return;
    }

    const bytes = await deps.files.size(mp4Path);
    const durationSeconds = await probeDurationSeconds(mp4Path).catch(() => 0);
    void extractPosterFrame(mp4Path, deps.files.pathFor(`${dirOf(webmKey)}/poster.jpg`)).catch(
      () => {},
    );

    rec.storageKey = deps.files.storageKey(mp4Key);
    rec.filename = MP4_NAME;
    rec.mimeType = 'video/mp4';
    rec.bytes = bytes;
    rec.durationSeconds = durationSeconds;
    rec.status = 'ready';
    await rec.save();
    await deps.files.delete(webmKey);

    logger.info('Meeting recording converted to MP4', {
      recordingId: rec.recordingId,
      bytes,
      durationSeconds,
      tookMs: Date.now() - started,
    });
  }

  function enqueueFinalize(recordingDbId: string): void {
    if (queued.has(recordingDbId)) return;
    queued.add(recordingDbId);
    transcodeChain = transcodeChain
      .then(() => finalizeRecording(recordingDbId))
      .catch((err) => {
        logger.error('Recording finalize crashed', {
          recordingDbId,
          err: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => queued.delete(recordingDbId));
  }

  return {
    /**
     * Save an uploaded meeting recording.
     *
     * The upload is already on disk (streamed by the route). This moves it into
     * place, creates the Recording row as 'processing' and returns immediately;
     * MP4 conversion runs in the background. Previously the HTTP request waited
     * for the whole transcode, so long meetings hit the proxy timeout, the
     * upload "failed", and the browser fell back to a local .webm download.
     */
    async saveComposite(input: UploadRecordingInput): Promise<SavedRecording> {
      const uploadBytes = await deps.files.size(input.filePath).catch(() => 0);
      if (uploadBytes < 256) {
        await deps.files.removeAbsolute(input.filePath);
        throw new ValidationError('Empty or invalid recording body.');
      }

      const roomId = sanitizeStorageSegment(input.roomId || 'room');

      // Resolve the workspace before keeping any file.
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
        await deps.files.removeAbsolute(input.filePath);
        throw new ValidationError('Workspace is required to save a recording. Rejoin from your organization.');
      }

      const recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const relativeDir = `${roomId}/${recordingId}`;
      const webmKey = `${relativeDir}/${WEBM_NAME}`;
      await deps.files.mkdir(relativeDir);
      await deps.files.adopt(input.filePath, webmKey);
      const storageKey = deps.files.storageKey(webmKey);

      let recordingDbId: string;
      try {
        // Snapshot ALL participants who ever joined this meeting. Prefer the
        // DB meeting id, fall back to the client-supplied one (the Meeting
        // document may already be cleaned up after the meeting ended).
        const effectiveMeetingId: string | null = meeting?._id
          ? String(meeting._id)
          : (input.meetingId ?? null);

        let participants: Array<{ userId: string; name: string; avatarUrl?: string | null }> = [];
        if (effectiveMeetingId) {
          const { listMeetingParticipants } = await import(
            '../../meetings/services/meeting-participants.service'
          );
          const roster = await listMeetingParticipants(effectiveMeetingId);
          participants = roster.map((p) => ({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl ?? null,
          }));
        }
        // Only fall back to uploader-only when we genuinely have no roster data.
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

        const doc = await Recording.create({
          workspaceId,
          meetingId: meeting?._id ?? undefined,
          roomId,
          recordingId,
          title: meeting?.title || `Recording ${new Date().toLocaleDateString()}`,
          source: 'client_composite',
          storageKey,
          filename: WEBM_NAME,
          mimeType: 'video/webm',
          bytes: uploadBytes,
          durationSeconds: 0,
          sharedBy: new Types.ObjectId(input.userId),
          participants,
          status: 'processing',
        });
        recordingDbId = String(doc._id);
      } catch (dbErr) {
        logger.error('Failed to persist recording metadata', { err: String(dbErr) });
        await deps.files.delete(webmKey).catch(() => {});
        throw new AppError(
          'Recording upload received but could not be saved. Please try again.',
          'RECORDING_META_FAILED',
          500,
        );
      }

      logger.info('Meeting recording uploaded — converting in background', {
        roomId,
        recordingId,
        bytes: uploadBytes,
        userId: input.userId,
      });
      enqueueFinalize(recordingDbId);

      return {
        roomId,
        recordingId,
        filename: WEBM_NAME,
        bytes: uploadBytes,
        storageKey,
        status: 'processing',
      };
    },

    /** Re-queue conversions interrupted by a server restart. */
    async resumeProcessing(): Promise<number> {
      const pending = await Recording.find({ status: 'processing' }).select('_id').lean();
      for (const r of pending) enqueueFinalize(String(r._id));
      return pending.length;
    },
  };
}

export const recordingsService = createRecordingsService();
