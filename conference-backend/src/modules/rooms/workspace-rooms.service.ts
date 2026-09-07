import mongoose from 'mongoose';
import { WorkspaceRoom } from '../../database/models/WorkspaceRoom.model';
import { authRepository } from '../auth/auth.repository';
import { ConflictError, ValidationError } from '../../shared/errors/AppError';

const SLUG_RE = /^[a-z0-9_]+$/;
const ACCENTS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#EF4444'];

function accentFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function isDuplicateKey(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000,
  );
}

export type WorkspaceRoomDto = {
  id: string;
  workspaceId: string;
  name: string;
  roomId: string;
  description: string;
  capacity: number;
  roomType: string;
  department: string;
  tags: string[];
  imageUrl: string | null;
  memberIds: string[];
  memberCount: number;
  settings: {
    allowRecording: boolean;
    allowChat: boolean;
    screenSharing: boolean;
    fileSharing: boolean;
    waitingRoom: boolean;
    roomApproval: boolean;
  };
  status: 'active' | 'inactive' | 'pending';
  accent: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdByAvatarUrl: string | null;
  createdByAvatarColor: string | null;
  createdAt: string;
};

async function toDto(doc: InstanceType<typeof WorkspaceRoom>): Promise<WorkspaceRoomDto> {
  const creator = await authRepository.findUserById(String(doc.createdBy));
  return {
    id: String(doc._id),
    workspaceId: String(doc.workspaceId),
    name: doc.name,
    roomId: doc.slug,
    description: doc.description ?? '',
    capacity: doc.capacity,
    roomType: doc.roomType ?? '',
    department: doc.department ?? '',
    tags: doc.tags ?? [],
    imageUrl: doc.imageUrl ?? null,
    memberIds: (doc.memberIds ?? []).map((id) => String(id)),
    memberCount: (doc.memberIds ?? []).length,
    settings: {
      allowRecording: doc.settings?.allowRecording ?? true,
      allowChat: doc.settings?.allowChat ?? true,
      screenSharing: doc.settings?.screenSharing ?? true,
      fileSharing: doc.settings?.fileSharing ?? true,
      waitingRoom: doc.settings?.waitingRoom ?? false,
      roomApproval: doc.settings?.roomApproval ?? false,
    },
    status: doc.status,
    accent: doc.accent || accentFromName(doc.name),
    createdBy: String(doc.createdBy),
    createdByName: creator?.name ?? 'Unknown',
    createdByEmail: creator?.email ?? '',
    createdByAvatarUrl: creator?.avatarUrl ?? null,
    createdByAvatarColor: creator?.avatarColor ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listWorkspaceRooms(input: {
  workspaceId: string;
  q?: string;
  status?: string;
}): Promise<WorkspaceRoomDto[]> {
  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(input.workspaceId),
  };
  if (input.status && input.status !== 'all') {
    filter.status = input.status;
  }
  if (input.q?.trim()) {
    const q = input.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
    ];
  }
  const rows = await WorkspaceRoom.find(filter).sort({ createdAt: -1 }).exec();
  return Promise.all(rows.map((r) => toDto(r)));
}

export async function createWorkspaceRoom(input: {
  workspaceId: string;
  userId: string;
  name: string;
  roomId: string;
  description?: string;
  capacity: number;
  roomType?: string;
  department?: string;
  tags?: string[];
  memberIds?: string[];
  settings?: Partial<WorkspaceRoomDto['settings']>;
}): Promise<WorkspaceRoomDto> {
  const name = input.name.trim();
  const slug = input.roomId.trim().toLowerCase();
  if (!name) throw new ValidationError('Room name is required.');
  if (!slug) throw new ValidationError('Room ID is required.');
  if (!SLUG_RE.test(slug)) {
    throw new ValidationError('Room ID must use lowercase letters, numbers, and underscores only.');
  }
  if (!Number.isFinite(input.capacity) || input.capacity < 1) {
    throw new ValidationError('Capacity must be at least 1.');
  }

  const memberIds = [...new Set(input.memberIds ?? [])]
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));

  try {
    const doc = await WorkspaceRoom.create({
      workspaceId: new mongoose.Types.ObjectId(input.workspaceId),
      name,
      slug,
      description: (input.description ?? '').trim().slice(0, 150),
      capacity: Math.floor(input.capacity),
      roomType: (input.roomType ?? '').trim(),
      department: (input.department ?? '').trim(),
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
      memberIds,
      settings: {
        allowRecording: input.settings?.allowRecording ?? true,
        allowChat: input.settings?.allowChat ?? true,
        screenSharing: input.settings?.screenSharing ?? true,
        fileSharing: input.settings?.fileSharing ?? true,
        waitingRoom: input.settings?.waitingRoom ?? false,
        roomApproval: input.settings?.roomApproval ?? false,
      },
      status: 'active',
      accent: accentFromName(name),
      createdBy: new mongoose.Types.ObjectId(input.userId),
    });
    return toDto(doc);
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new ConflictError('A room with this ID already exists in the workspace.');
    }
    throw err;
  }
}
