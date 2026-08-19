import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { createMeetingsController } from './controllers/meetings.controller';
import {
  CreateMeetingSchema,
  ListMeetingsQuerySchema,
  MeetingIdParamsSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './meetings.validation';

const router = Router();
const controller = createMeetingsController();

router.use(authenticate);

router.get('/', validateQuery(ListMeetingsQuerySchema), (req, res) => controller.list(req, res));
router.post('/', validateBody(CreateMeetingSchema), (req, res) => controller.create(req, res));
router.delete('/:id', validateParams(MeetingIdParamsSchema), (req, res) => controller.remove(req, res));

export const meetingsRouter = router;
