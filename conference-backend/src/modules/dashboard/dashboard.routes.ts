import { Router } from 'express';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { Meeting } from '../../database/models/Meeting.model';
import { Recording } from '../../database/models/Recording.model';
import { ParticipantMinuteLog } from '../../database/models/ParticipantMinuteLog.model';
import { MeetingParticipant } from '../../database/models/MeetingParticipant.model';
import { Subscription } from '../../database/models/Subscription.model';
import { User } from '../../database/models/User.model';
import { promoteDueMeetings } from '../meetings/services/meetings-workspace.service';

const router = Router();

type PeriodKey = 'today' | 'week' | 'month' | 'year';

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Period window + previous window for trend comparison. */
function periodBounds(period: PeriodKey, now = new Date()) {
  const end = now;
  let from: Date;
  let prevFrom: Date;
  let prevTo: Date;

  if (period === 'today') {
    from = startOfDay(now);
    prevTo = from;
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 1);
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    prevTo = from;
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    prevTo = from;
    prevFrom = new Date(now.getFullYear() - 1, 0, 1);
  } else {
    // This week — calendar week starting Sunday
    from = startOfDay(now);
    from.setDate(from.getDate() - from.getDay());
    prevTo = from;
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 7);
  }

  return { from, end, prevFrom, prevTo };
}

function parsePeriod(raw: unknown): PeriodKey {
  const v = String(raw ?? 'week').toLowerCase();
  if (v === 'today' || v === 'month' || v === 'year' || v === 'week') return v;
  return 'week';
}

async function topParticipantsForWorkspace(workspaceId: Types.ObjectId, from: Date, limit = 5) {
  // Prefer live join minutes (unique user, distinct meetings, total hours)
  const fromLogs = await ParticipantMinuteLog.aggregate<{
    _id: Types.ObjectId;
    meetingIds: Types.ObjectId[];
    totalMinutes: number;
  }>([
    {
      $match: {
        workspaceId,
        createdAt: { $gte: from },
        userId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$userId',
        meetingIds: { $addToSet: '$meetingId' },
        totalMinutes: { $sum: '$participantMinutes' },
      },
    },
    {
      $addFields: {
        meetingCount: {
          $size: {
            $filter: {
              input: '$meetingIds',
              as: 'mid',
              cond: { $ne: ['$$mid', null] },
            },
          },
        },
      },
    },
    { $match: { meetingCount: { $gte: 1 } } },
    { $sort: { meetingCount: -1, totalMinutes: -1 } },
    { $limit: limit },
  ]);

  let rows = fromLogs;

  // Fallback: registered/joined roster when metering is empty
  if (rows.length === 0) {
    const fromRoster = await MeetingParticipant.aggregate<{
      _id: Types.ObjectId;
      meetingCount: number;
      totalMinutes: number;
    }>([
      {
        $match: {
          workspaceId,
          status: { $in: ['joined', 'registered'] },
          registeredAt: { $gte: from },
        },
      },
      {
        $group: {
          _id: '$userId',
          meetingIds: { $addToSet: '$meetingId' },
        },
      },
      {
        $addFields: {
          meetingCount: { $size: '$meetingIds' },
          totalMinutes: 0,
        },
      },
      { $match: { meetingCount: { $gte: 1 } } },
      { $sort: { meetingCount: -1 } },
      { $limit: limit },
    ]);
    rows = fromRoster.map((r) => ({
      _id: r._id,
      meetingIds: [],
      totalMinutes: r.totalMinutes,
      meetingCount: r.meetingCount,
    })) as typeof fromLogs;
  }

  const userIds = rows.map((r) => r._id).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name avatarUrl avatarColor')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((r) => {
    const u = userMap.get(String(r._id));
    const meetingCount =
      typeof (r as { meetingCount?: number }).meetingCount === 'number'
        ? (r as { meetingCount: number }).meetingCount
        : (r.meetingIds ?? []).filter(Boolean).length;
    return {
      userId: String(r._id),
      name: u?.name ?? 'Participant',
      avatarUrl: u?.avatarUrl ?? null,
      avatarColor: u?.avatarColor ?? null,
      meetingCount,
      totalMinutes: Math.max(0, Math.round(r.totalMinutes || 0)),
    };
  });
}

/** Same workspace-wide dashboard for every member, admin, and owner. */
router.get('/summary', requireWorkspace('member'), async (req: AuthRequest, res) => {
  await promoteDueMeetings(req.workspaceId!);
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const period = parsePeriod((req.query as Record<string, string>).period);
  const { from, prevFrom, prevTo } = periodBounds(period);
  const now = new Date();
  const meetingFilter = { workspaceId };

  const [
    upcomingMeetings,
    completedCurrent,
    completedPrev,
    liveMeetings,
    totalRecordings,
    recordingsCurrent,
    recordingsPrev,
    sub,
    recentPM,
    participantsCurrent,
    participantsPrev,
    topParticipants,
  ] = await Promise.all([
    Meeting.countDocuments({
      ...meetingFilter,
      status: 'scheduled',
      scheduledAt: { $gte: now },
    }),
    Meeting.countDocuments({
      ...meetingFilter,
      status: 'ended',
      endedAt: { $gte: from },
    }),
    Meeting.countDocuments({
      ...meetingFilter,
      status: 'ended',
      endedAt: { $gte: prevFrom, $lt: prevTo },
    }),
    Meeting.countDocuments({ ...meetingFilter, status: 'live' }),
    Recording.countDocuments({ workspaceId }),
    Recording.countDocuments({ workspaceId, createdAt: { $gte: from } }),
    Recording.countDocuments({ workspaceId, createdAt: { $gte: prevFrom, $lt: prevTo } }),
    Subscription.findOne({ workspaceId }).lean(),
    ParticipantMinuteLog.aggregate([
      {
        $match: {
          workspaceId,
          createdAt: { $gte: from },
        },
      },
      {
        $group: {
          _id:
            period === 'today'
              ? { $dateToString: { format: '%H', date: '$createdAt' } }
              : period === 'year'
                ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
                : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          participantMinutes: { $sum: '$participantMinutes' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ParticipantMinuteLog.distinct('userId', {
      workspaceId,
      createdAt: { $gte: from },
    }),
    ParticipantMinuteLog.distinct('userId', {
      workspaceId,
      createdAt: { $gte: prevFrom, $lt: prevTo },
    }),
    topParticipantsForWorkspace(workspaceId, from, 5),
  ]);

  const totalParticipants = participantsCurrent.length;

  res.json({
    period,
    upcomingMeetings,
    completedMeetings: completedCurrent,
    liveMeetings,
    totalRecordings,
    totalParticipants,
    totalMeetings: upcomingMeetings,
    billing: sub
      ? {
          planKey: sub.planKey,
          used: sub.participantMinutesUsed,
          included: sub.participantMinutesIncluded,
          remaining: Math.max(0, sub.participantMinutesIncluded - sub.participantMinutesUsed),
        }
      : null,
    participantMinutesTrend: recentPM.map((d) => ({
      date: d._id as string,
      participantMinutes: d.participantMinutes as number,
    })),
    topParticipants,
    trends: {
      completed: pctChange(completedCurrent, completedPrev),
      participants: pctChange(totalParticipants, participantsPrev.length),
      recordings: pctChange(recordingsCurrent, recordingsPrev),
    },
  });
});

export const dashboardRouter = router;
