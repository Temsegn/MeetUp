import { Router } from 'express';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { Meeting } from '../../database/models/Meeting.model';
import { User } from '../../database/models/User.model';
import { buildMeetingVisibilityFilter } from '../meetings/services/meeting-join-authz.service';

const router = Router();

router.get('/events', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const from = q.from ? new Date(q.from) : new Date();
  const to = q.to ? new Date(q.to) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

  const visibility = await buildMeetingVisibilityFilter({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });

  const filter: Record<string, unknown> = {
    ...visibility,
    scheduledAt: { $gte: from, $lte: to },
    status: 'scheduled',
  };

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
