import { Router } from 'express';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { createWorkspaceRoom, listWorkspaceRooms } from './workspace-rooms.service';

const router = Router();

router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const rooms = await listWorkspaceRooms({
    workspaceId: req.workspaceId!,
    q: q.q,
    status: q.status,
  });
  res.json({ rooms });
});

router.post('/', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    roomId?: string;
    description?: string;
    capacity?: number;
    roomType?: string;
    department?: string;
    tags?: string[] | string;
    memberIds?: string[];
    settings?: {
      allowRecording?: boolean;
      allowChat?: boolean;
      screenSharing?: boolean;
      fileSharing?: boolean;
      waitingRoom?: boolean;
      roomApproval?: boolean;
    };
  };

  const tags =
    typeof body.tags === 'string'
      ? body.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : body.tags;

  const room = await createWorkspaceRoom({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    name: body.name ?? '',
    roomId: body.roomId ?? '',
    description: body.description,
    capacity: Number(body.capacity),
    roomType: body.roomType,
    department: body.department,
    tags,
    memberIds: body.memberIds,
    settings: body.settings,
  });
  res.status(201).json(room);
});

export const workspaceRoomsRouter = router;
