import { Router } from 'express';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { MeetingTemplate } from '../../database/models/MeetingTemplate.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors/AppError';
import { hasMinRole } from '../workspace/workspace.types';

const router = Router();

function toJson(doc: {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdByName: string;
  title: string;
  agenda?: string[];
  duration?: number;
  settings?: { waitingRoom?: boolean; autoRecord?: boolean; muteOnEntry?: boolean };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(doc._id),
    workspaceId: String(doc.workspaceId),
    createdBy: String(doc.createdBy),
    createdByName: doc.createdByName,
    title: doc.title,
    agenda: doc.agenda ?? [],
    duration: doc.duration ?? 30,
    settings: {
      waitingRoom: Boolean(doc.settings?.waitingRoom),
      autoRecord: Boolean(doc.settings?.autoRecord),
      muteOnEntry: Boolean(doc.settings?.muteOnEntry),
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rows = await MeetingTemplate.find({
    workspaceId: new Types.ObjectId(req.workspaceId!),
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({ templates: rows.map((r) => toJson(r as never)) });
});

router.post('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as {
    title?: string;
    agenda?: string[];
    duration?: number;
    settings?: { waitingRoom?: boolean; autoRecord?: boolean; muteOnEntry?: boolean };
  };
  const title = (body.title ?? '').trim();
  if (!title) throw new ValidationError('Template title is required.');
  const duration = Math.min(480, Math.max(5, Number(body.duration) || 30));
  const doc = await MeetingTemplate.create({
    workspaceId: new Types.ObjectId(req.workspaceId!),
    createdBy: new Types.ObjectId(req.user!.id),
    createdByName: req.user!.name,
    title,
    agenda: (body.agenda ?? []).map((a) => String(a).trim()).filter(Boolean).slice(0, 20),
    duration,
    settings: {
      waitingRoom: Boolean(body.settings?.waitingRoom),
      autoRecord: Boolean(body.settings?.autoRecord),
      muteOnEntry: Boolean(body.settings?.muteOnEntry),
    },
  });
  res.status(201).json(toJson(doc));
});

router.patch('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const id = String(req.params['id'] ?? '');
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Template');
  const doc = await MeetingTemplate.findOne({
    _id: id,
    workspaceId: new Types.ObjectId(req.workspaceId!),
  });
  if (!doc) throw new NotFoundError('Template');
  const isOwner = String(doc.createdBy) === req.user!.id;
  if (!isOwner && !hasMinRole(req.workspaceRole!, 'admin')) {
    throw new ForbiddenError('Only the template creator or an admin can edit this template.');
  }
  const body = req.body as {
    title?: string;
    agenda?: string[];
    duration?: number;
    settings?: { waitingRoom?: boolean; autoRecord?: boolean; muteOnEntry?: boolean };
  };
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) throw new ValidationError('Template title is required.');
    doc.title = title;
  }
  if (body.agenda !== undefined) {
    doc.agenda = body.agenda.map((a) => String(a).trim()).filter(Boolean).slice(0, 20);
  }
  if (body.duration !== undefined) {
    doc.duration = Math.min(480, Math.max(5, Number(body.duration) || 30));
  }
  if (body.settings) {
    if (body.settings.waitingRoom !== undefined) doc.settings.waitingRoom = body.settings.waitingRoom;
    if (body.settings.autoRecord !== undefined) doc.settings.autoRecord = body.settings.autoRecord;
    if (body.settings.muteOnEntry !== undefined) doc.settings.muteOnEntry = body.settings.muteOnEntry;
  }
  await doc.save();
  res.json(toJson(doc));
});

router.delete('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const id = String(req.params['id'] ?? '');
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Template');
  const doc = await MeetingTemplate.findOne({
    _id: id,
    workspaceId: new Types.ObjectId(req.workspaceId!),
  });
  if (!doc) throw new NotFoundError('Template');
  const isOwner = String(doc.createdBy) === req.user!.id;
  if (!isOwner && !hasMinRole(req.workspaceRole!, 'admin')) {
    throw new ForbiddenError('Only the template creator or an admin can delete this template.');
  }
  await doc.deleteOne();
  res.json({ success: true });
});

export const workspaceTemplatesRouter = router;
