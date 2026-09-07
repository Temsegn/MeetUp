import { Types } from 'mongoose';
import { Meeting } from '../../database/models/Meeting.model';
import { MeetingParticipant } from '../../database/models/MeetingParticipant.model';
import { ParticipantMinuteLog } from '../../database/models/ParticipantMinuteLog.model';
import { Recording } from '../../database/models/Recording.model';
import { Message } from '../../database/models/Message.model';
import { User } from '../../database/models/User.model';

export type ReportMeetingType = 'instant' | 'scheduled';

export function parseReportTypes(raw?: string): ReportMeetingType[] | null {
  if (!raw?.trim()) return null;
  const types = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is ReportMeetingType => t === 'instant' || t === 'scheduled');
  if (types.length === 0 || types.length >= 2) return null;
  return types;
}

export function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatPct(n: number): string {
  const abs = Math.abs(n);
  return `${abs}%`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rangeBounds(rangeDays: number, now = new Date()) {
  const range = Math.max(1, Math.min(rangeDays, 365));
  let from: Date;
  let prevFrom: Date;
  let prevTo: Date;

  if (range === 1) {
    from = startOfDay(now);
    prevTo = from;
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 1);
  } else {
    from = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    prevTo = from;
    prevFrom = new Date(from.getTime() - range * 24 * 60 * 60 * 1000);
  }

  return { range, from, prevFrom, prevTo, now };
}

function meetingEndedFilter(
  workspaceId: Types.ObjectId,
  from: Date,
  types: ReportMeetingType[] | null,
  prev?: { prevFrom: Date; prevTo: Date },
) {
  const base: Record<string, unknown> = {
    workspaceId,
    status: 'ended',
    endedAt: prev ? { $gte: prev.prevFrom, $lt: prev.prevTo } : { $gte: from },
  };
  if (types?.length) {
    base.type = types.length === 1 ? types[0] : { $in: types };
  }
  return base;
}

async function meetingIdsForFilter(
  workspaceId: Types.ObjectId,
  from: Date,
  types: ReportMeetingType[] | null,
  prev?: { prevFrom: Date; prevTo: Date },
): Promise<Types.ObjectId[] | null> {
  if (!types?.length) return null;
  return Meeting.find(meetingEndedFilter(workspaceId, from, types, prev)).distinct('_id');
}

function pmMatch(
  workspaceId: Types.ObjectId,
  from: Date,
  meetingIds: Types.ObjectId[] | null,
  prev?: { prevFrom: Date; prevTo: Date },
) {
  const match: Record<string, unknown> = {
    workspaceId,
    createdAt: prev ? { $gte: prev.prevFrom, $lt: prev.prevTo } : { $gte: from },
  };
  if (meetingIds !== null) {
    match.meetingId = { $in: meetingIds };
  }
  return match;
}

/** Map hour 0–23 → heatmap row 0–3 (12 AM, 6 AM, 12 PM, 6 PM buckets). */
function hourToHeatRow(hour: number): number {
  if (hour < 6) return 0;
  if (hour < 12) return 1;
  if (hour < 18) return 2;
  return 3;
}

/** Sunday=0 … Saturday=6 → Mon=0 … Sun=6 */
function dowToCol(dow: number): number {
  return dow === 0 ? 6 : dow - 1;
}

function emptyHeatmap(): number[][] {
  return [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ];
}

async function topParticipantsForWorkspace(
  workspaceId: Types.ObjectId,
  from: Date,
  meetingIds: Types.ObjectId[] | null,
  limit = 5,
) {
  const pmMatchStage: Record<string, unknown> = {
    workspaceId,
    createdAt: { $gte: from },
    userId: { $ne: null },
  };
  if (meetingIds !== null) {
    pmMatchStage.meetingId = { $in: meetingIds };
  }

  const fromLogs = await ParticipantMinuteLog.aggregate<{
    _id: Types.ObjectId;
    meetingIds: Types.ObjectId[];
    totalMinutes: number;
    meetingCount: number;
  }>([
    { $match: pmMatchStage },
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

  if (rows.length === 0) {
    const rosterMatch: Record<string, unknown> = {
      workspaceId,
      status: { $in: ['joined', 'registered'] },
      registeredAt: { $gte: from },
    };
    if (meetingIds !== null) {
      rosterMatch.meetingId = { $in: meetingIds };
    }

    const fromRoster = await MeetingParticipant.aggregate<{
      _id: Types.ObjectId;
      meetingCount: number;
    }>([
      { $match: rosterMatch },
      {
        $group: {
          _id: '$userId',
          meetingIds: { $addToSet: '$meetingId' },
        },
      },
      {
        $addFields: {
          meetingCount: { $size: '$meetingIds' },
        },
      },
      { $match: { meetingCount: { $gte: 1 } } },
      { $sort: { meetingCount: -1 } },
      { $limit: limit },
    ]);
    rows = fromRoster.map((r) => ({
      _id: r._id,
      meetingIds: [],
      totalMinutes: 0,
      meetingCount: r.meetingCount,
    }));
  }

  const userIds = rows.map((r) => r._id).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name avatarUrl avatarColor')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((r) => {
    const u = userMap.get(String(r._id));
    return {
      userId: String(r._id),
      name: u?.name ?? 'Participant',
      avatarUrl: u?.avatarUrl ?? null,
      avatarColor: u?.avatarColor ?? null,
      meetingCount: r.meetingCount,
      totalMinutes: Math.max(0, Math.round(r.totalMinutes || 0)),
    };
  });
}

async function meetingAttendanceMap(meetingIds: Types.ObjectId[]) {
  if (meetingIds.length === 0) return new Map<string, number>();

  const rows = await MeetingParticipant.aggregate<{
    _id: Types.ObjectId;
    invited: number;
    joined: number;
  }>([
    { $match: { meetingId: { $in: meetingIds } } },
    {
      $group: {
        _id: '$meetingId',
        invited: { $sum: 1 },
        joined: {
          $sum: {
            $cond: [{ $eq: ['$status', 'joined'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const map = new Map<string, number>();
  for (const r of rows) {
    const rate =
      r.invited > 0 ? Math.min(100, Math.round((r.joined / r.invited) * 100)) : 0;
    map.set(String(r._id), rate);
  }
  return map;
}

function recordingFilter(
  workspaceId: Types.ObjectId,
  from: Date,
  meetingIds: Types.ObjectId[] | null,
  types: ReportMeetingType[] | null,
  prev?: { prevFrom: Date; prevTo: Date },
) {
  const base: Record<string, unknown> = {
    workspaceId,
    status: { $ne: 'failed' },
    createdAt: prev ? { $gte: prev.prevFrom, $lt: prev.prevTo } : { $gte: from },
  };
  if (meetingIds !== null && types?.length) {
    base.$or = [{ meetingId: { $in: meetingIds } }];
    if (types.includes('instant')) {
      (base.$or as unknown[]).push({ meetingId: null });
    }
  }
  return base;
}

export async function buildReportsOverview(
  workspaceId: Types.ObjectId,
  rangeDays: number,
  types: ReportMeetingType[] | null = null,
) {
  const { range, from, prevFrom, prevTo } = rangeBounds(rangeDays);
  const prevWindow = { prevFrom, prevTo };

  const meetingFilter = meetingEndedFilter(workspaceId, from, types);
  const meetingFilterPrev = meetingEndedFilter(workspaceId, from, types, prevWindow);

  const [currentMeetingIds, prevMeetingIds] = await Promise.all([
    meetingIdsForFilter(workspaceId, from, types),
    meetingIdsForFilter(workspaceId, from, types, prevWindow),
  ]);

  const pmFilter = pmMatch(workspaceId, from, currentMeetingIds);
  const pmPrevFilter = pmMatch(workspaceId, from, prevMeetingIds, prevWindow);

  const [
    pmByDay,
    meetingsByDay,
    totalMeetings,
    prevMeetings,
    uniqueParticipants,
    prevParticipants,
    totalParticipantMinutes,
    prevParticipantMinutes,
    totalRecordings,
    prevRecordings,
    filesShared,
    endedMeetings,
    topParticipantsRaw,
  ] = await Promise.all([
    ParticipantMinuteLog.aggregate([
      { $match: pmFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          participantMinutes: { $sum: '$participantMinutes' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Meeting.aggregate([
      { $match: meetingFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
          meetings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Meeting.countDocuments(meetingFilter),
    Meeting.countDocuments(meetingFilterPrev),
    ParticipantMinuteLog.distinct('userId', pmFilter),
    ParticipantMinuteLog.distinct('userId', pmPrevFilter),
    ParticipantMinuteLog.aggregate([
      { $match: pmFilter },
      { $group: { _id: null, total: { $sum: '$participantMinutes' } } },
    ]),
    ParticipantMinuteLog.aggregate([
      { $match: pmPrevFilter },
      { $group: { _id: null, total: { $sum: '$participantMinutes' } } },
    ]),
    Recording.countDocuments(recordingFilter(workspaceId, from, currentMeetingIds, types)),
    Recording.countDocuments(
      recordingFilter(workspaceId, from, prevMeetingIds, types, prevWindow),
    ),
    Message.countDocuments({
      workspaceId,
      createdAt: { $gte: from },
      deletedAt: null,
      'attachments.0': { $exists: true },
    }),
    Meeting.find(meetingFilter)
      .sort({ endedAt: -1 })
      .select('_id title type startedAt endedAt peakParticipants participantCount')
      .lean(),
    topParticipantsForWorkspace(workspaceId, from, currentMeetingIds, 5),
  ]);

  const minutesCurrent = (totalParticipantMinutes[0]?.total as number) ?? 0;
  const minutesPrev = (prevParticipantMinutes[0]?.total as number) ?? 0;
  const avgCurrent = totalMeetings > 0 ? Math.round(minutesCurrent / totalMeetings) : 0;
  const avgPrev = prevMeetings > 0 ? Math.round(minutesPrev / prevMeetings) : 0;

  const meetingsDayMap = new Map(
    (meetingsByDay as { _id: string; meetings: number }[]).map((d) => [d._id, d.meetings]),
  );
  const byDay = (pmByDay as { _id: string; participantMinutes: number }[]).map((d) => ({
    date: d._id,
    participantMinutes: d.participantMinutes,
    meetings: meetingsDayMap.get(d._id) ?? 0,
  }));

  for (const d of meetingsByDay as { _id: string; meetings: number }[]) {
    if (!byDay.some((b) => b.date === d._id)) {
      byDay.push({ date: d._id, participantMinutes: 0, meetings: d.meetings });
    }
  }
  byDay.sort((a, b) => a.date.localeCompare(b.date));

  const meetingIds = endedMeetings.map((m) => m._id as Types.ObjectId);
  const attendanceMap = await meetingAttendanceMap(meetingIds);

  const heatmap = emptyHeatmap();
  const engagementByDow = Array.from({ length: 7 }, () => ({ att: [] as number[] }));

  const meetings = endedMeetings.map((m) => {
    const started = m.startedAt ? new Date(m.startedAt) : null;
    const ended = m.endedAt ? new Date(m.endedAt) : null;
    const durationMinutes =
      started && ended
        ? Math.max(0, Math.round((ended.getTime() - started.getTime()) / 60000))
        : 0;
    const attendance = attendanceMap.get(String(m._id)) ?? 0;
    const participants = m.peakParticipants ?? m.participantCount ?? 0;

    if (started && !Number.isNaN(started.getTime())) {
      const row = hourToHeatRow(started.getHours());
      const col = dowToCol(started.getDay());
      heatmap[row][col] = Math.min(10, heatmap[row][col] + 1);
      const idx = dowToCol(started.getDay());
      engagementByDow[idx].att.push(attendance);
    }

    return {
      id: String(m._id),
      title: m.title || 'Meeting',
      type: (m.type === 'scheduled' ? 'scheduled' : 'instant') as ReportMeetingType,
      startedAt: started ? started.toISOString() : '',
      durationMinutes,
      participants,
      attendance,
    };
  });

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const engagement = {
    attendance: engagementByDow.map((d) => avg(d.att)),
    camera: Array.from({ length: 7 }, () => 0),
  };

  const maxParticipantMinutes = topParticipantsRaw[0]?.totalMinutes ?? 1;
  const topParticipants = topParticipantsRaw.map((p) => ({
    userId: p.userId,
    name: p.name,
    avatarUrl: p.avatarUrl,
    avatarColor: p.avatarColor,
    meetingCount: p.meetingCount,
    totalMinutes: p.totalMinutes,
    pct: Math.round((p.totalMinutes / Math.max(maxParticipantMinutes, 1)) * 100),
  }));

  const recordingsRaw = await Recording.find(
    recordingFilter(workspaceId, from, currentMeetingIds, types),
  )
    .sort({ createdAt: -1 })
    .select('_id title createdAt durationSeconds views meetingId')
    .lean();

  const meetingTypeById = new Map(
    endedMeetings.map((m) => [String(m._id), m.type === 'scheduled' ? 'scheduled' : 'instant']),
  );

  const recordings = recordingsRaw.map((r) => {
    const created = r.createdAt ? new Date(r.createdAt) : null;
    const secs = r.durationSeconds ?? 0;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    const duration =
      mins >= 60
        ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
        : `${mins}:${String(rem).padStart(2, '0')}`;
    const meetingType = r.meetingId
      ? (meetingTypeById.get(String(r.meetingId)) ?? 'instant')
      : 'instant';

    return {
      id: String(r._id),
      title: r.title,
      type: meetingType as ReportMeetingType,
      createdAt: created ? created.toISOString() : '',
      duration,
      views: r.views ?? 0,
    };
  });

  const trends = {
    meetings: pctChange(totalMeetings, prevMeetings),
    participants: pctChange(uniqueParticipants.length, prevParticipants.length),
    minutes: pctChange(minutesCurrent, minutesPrev),
    avgDuration: pctChange(avgCurrent, avgPrev),
    recordings: pctChange(totalRecordings, prevRecordings),
  };

  const typeLabel =
    types?.length === 1
      ? types[0] === 'scheduled'
        ? 'scheduled'
        : 'instant'
      : null;

  const insights: string[] = [];
  if (totalMeetings > 0) {
    const typeSuffix = typeLabel ? ` (${typeLabel} meetings)` : '';
    const periodLabel = range === 1 ? 'today' : `the last ${range} days`;
    insights.push(
      `Your workspace ran ${totalMeetings} meeting${totalMeetings === 1 ? '' : 's'}${typeSuffix} in ${periodLabel}.`,
    );
  }
  if (uniqueParticipants.length > 0) {
    insights.push(
      `${uniqueParticipants.length} unique participant${uniqueParticipants.length === 1 ? '' : 's'} joined in this period.`,
    );
  }

  const busiest = [...byDay].sort((a, b) => b.participantMinutes - a.participantMinutes)[0];
  if (busiest && busiest.participantMinutes > 0) {
    const d = new Date(busiest.date + 'T12:00:00');
    const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    insights.push(`Peak activity was on ${label} with ${busiest.participantMinutes} participant-minutes.`);
  }

  let peakHeat: { day: number; row: number; val: number } | null = null;
  for (let ri = 0; ri < heatmap.length; ri++) {
    for (let ci = 0; ci < heatmap[ri].length; ci++) {
      if (!peakHeat || heatmap[ri][ci] > peakHeat.val) {
        peakHeat = { day: ci, row: ri, val: heatmap[ri][ci] };
      }
    }
  }
  if (peakHeat && peakHeat.val > 0) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times = ['midnight–6 AM', '6 AM–noon', 'noon–6 PM', '6 PM–midnight'];
    insights.push(
      `Most meetings start on ${days[peakHeat.day]} between ${times[peakHeat.row]}.`,
    );
  }

  return {
    range,
    types: types ?? [],
    totalParticipantMinutes: minutesCurrent,
    uniqueParticipants: uniqueParticipants.length,
    totalMeetings,
    totalRecordings,
    filesShared,
    byDay,
    heatmap,
    engagement,
    trends: {
      meetings: { change: formatPct(trends.meetings), positive: trends.meetings >= 0 },
      participants: { change: formatPct(trends.participants), positive: trends.participants >= 0 },
      minutes: { change: formatPct(trends.minutes), positive: trends.minutes >= 0 },
      avgDuration: { change: formatPct(trends.avgDuration), positive: trends.avgDuration >= 0 },
      recordings: { change: formatPct(trends.recordings), positive: trends.recordings >= 0 },
    },
    topParticipants,
    meetings,
    recordings,
    insights: insights.slice(0, 3),
  };
}
