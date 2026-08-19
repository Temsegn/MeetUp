import { Router } from 'express';
import express from 'express';
import { authenticate } from '../auth/auth.middleware';
import { createRecordingsController } from './controllers/recordings.controller';
import { RoomIdParamsSchema, validateParams } from './recordings.validation';

const router = Router();
const controller = createRecordingsController();

router.use(authenticate);

/**
 * POST /recordings/:roomId
 * Body: raw video/webm bytes. Saved as storage/recordings/{roomId}/{id}/meeting-composite.mp4
 */
router.post(
  '/:roomId',
  express.raw({ type: () => true, limit: '500mb' }),
  validateParams(RoomIdParamsSchema),
  (req, res) => controller.upload(req, res),
);

export const recordingsRouter = router;
