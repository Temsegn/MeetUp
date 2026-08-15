import { Router, Response } from 'express';
import { Meeting } from '../../database/models/Meeting.model';
import { authenticate, AuthRequest } from '../auth/auth.middleware';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

// GET /meetings — return authenticated user's meetings (filterable by type)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '50'), 10));
    const skip  = (page - 1) * limit;

    const query: Record<string, any> = { createdBy: req.user!._id };
    if (req.query.type === 'instant' || req.query.type === 'scheduled') {
      query.type = req.query.type;
    }

    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .sort({ scheduledAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Meeting.countDocuments(query),
    ]);

    res.json({ meetings, total, page, limit });
  } catch (err) {
    console.error('Get meetings error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings.' });
  }
});

// POST /meetings — create a new meeting (instant or scheduled)
// Meetings persist in MongoDB until explicitly deleted — room close does NOT delete them.
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomId, type = 'instant', title, scheduledAt, duration } = req.body;
  if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
    res.status(400).json({ error: 'roomId is required and must be a non-empty string.' });
    return;
  }

  const sanitizedRoomId = roomId.trim().slice(0, 100);
  const meetingType = type === 'scheduled' ? 'scheduled' : 'instant';

  if (meetingType === 'scheduled') {
    if (!scheduledAt || Number.isNaN(Date.parse(String(scheduledAt)))) {
      res.status(400).json({ error: 'scheduledAt must be a valid date for scheduled meetings.' });
      return;
    }
  }

  try {
    const meeting = await Meeting.findOneAndUpdate(
      { roomId: sanitizedRoomId },
      {
        $setOnInsert: {
          roomId:        sanitizedRoomId,
          createdBy:     req.user!._id,
          createdByName: req.user!.name,
          type:          meetingType,
          title:         title ? String(title).slice(0, 200) : undefined,
          scheduledAt:   scheduledAt ? new Date(scheduledAt) : undefined,
          duration:      typeof duration === 'number' ? duration : 30,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json(meeting);
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ error: 'Failed to create meeting.' });
  }
});

// DELETE /meetings/:id — permanently remove a meeting the user owns
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user!._id,
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found or you do not own it.' });
      return;
    }

    res.json({ success: true, roomId: meeting.roomId });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ error: 'Failed to delete meeting.' });
  }
});

export const meetingsRouter = router;
