import { Response } from 'express';
import { AuthRequest } from '../../auth/auth.types';
import { meetingRepository, MeetingDeps } from '../meetings.repository';
import { createMeetingsService } from '../services/meetings.service';
import type { CreateMeetingBody, ListMeetingsQueryInput, MeetingIdParams } from '../meetings.validation';
import { toMeetingJson } from '../meetings.types';

export function createMeetingsController(deps: MeetingDeps = meetingRepository) {
  const service = createMeetingsService(deps);

  return {
    /** GET /meetings */
    async list(req: AuthRequest, res: Response): Promise<void> {
      const query = res.locals.query as ListMeetingsQueryInput;
      const { meetings, total } = await service.list(req.user!.id, query);
      res.json({
        meetings: meetings.map(toMeetingJson),
        total,
        page: query.page,
        limit: query.limit,
      });
    },

    /** POST /meetings */
    async create(req: AuthRequest, res: Response): Promise<void> {
      const body = res.locals.body as CreateMeetingBody;
      const meeting = await service.create(req.user!.id, req.user!.name, body);
      res.status(201).json(toMeetingJson(meeting));
    },

    /** DELETE /meetings/:id */
    async remove(req: AuthRequest, res: Response): Promise<void> {
      const { id } = res.locals.params as MeetingIdParams;
      const meeting = await service.deleteOwned(id, req.user!.id);
      res.json({ success: true, roomId: meeting.roomId });
    },
  };
}
