import { Router } from 'express';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { Meeting } from '../../database/models/Meeting.model';
import { User } from '../../database/models/User.model';

const router = Router();

router.get('/events', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const isAdminPlus = req.workspaceRole === 'admin' || req.workspaceRole === 'owner';

  const from = q.from ? new Date(q.from) : new Date();
  const to = q.to ? new Date(q.to) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

  const filter: Record<string, unknown> = {
    workspaceId,
    scheduledAt: { $gte: from, $lte: to },
    status: 'scheduled',
  };

  if (!isAdminPlus) {
    filter.createdBy = new Types.ObjectId(req.user!.id);
  }

  const meetings = await Meeting.find(filter).sort({ scheduledAt: 1 }).limit(200).lean();
  const hostIds = [...new Set(meetings.map((m) => String(m.createdBy)))];
  const hosts = hostIds.length
    ? await User.find({ _id: { $in: hostIds } })
        .select('avatarUrl avatarColor')
        .lean()
    : [];
  const hostMap = new Map(hosts.map((u) => [String(u._id), u]));

  res.json({
    events: meetings.map((m) => {
      const host = hostMap.get(String(m.createdBy));
      return {
        id: String(m._id),
        roomId: m.roomId,
        title: m.title || 'Meeting',
        scheduledAt: m.scheduledAt?.toISOString(),
        duration: m.duration,
        status: m.status,
        type: m.type,
        participantCount: m.participantCount ?? 1,
        createdByName: m.createdByName,
        createdByAvatarUrl: host?.avatarUrl ?? null,
        createdByAvatarColor: host?.avatarColor ?? null,
      };
    }),
  });
});

export const calendarRouter = router;
