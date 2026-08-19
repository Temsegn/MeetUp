import { Response } from 'express';
import { AuthRequest } from '../../auth/auth.types';
import { createRecordingsService, RecordingServiceDeps } from '../services/recordings.service';
import type { RoomIdParams } from '../recordings.validation';

export function createRecordingsController(deps?: RecordingServiceDeps) {
  const service = createRecordingsService(deps);

  return {
    /** POST /recordings/:roomId */
    async upload(req: AuthRequest, res: Response): Promise<void> {
      const { roomId } = res.locals.params as RoomIdParams;
      const saved = await service.saveComposite({
        roomId,
        userId: req.user!.id,
        body: req.body as Buffer,
      });

      res.status(201).json({
        success: true,
        format: 'mp4',
        roomId: saved.roomId,
        recordingId: saved.recordingId,
        filename: saved.filename,
        bytes: saved.bytes,
        storageKey: saved.storageKey,
        path: saved.storageKey,
        relativePath: saved.storageKey,
      });
    },
  };
}
