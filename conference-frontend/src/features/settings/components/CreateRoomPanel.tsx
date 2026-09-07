import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  ChevronDown,
  CloudUpload,
  FileText,
  Hash,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import { roomsService } from '../../../services/rooms/rooms.service';
import {
  workspaceService,
  type WorkspaceDirectoryMember,
} from '../../../services/workspace/workspace.service';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { SettingsToggle } from './SettingsUi';

type Props = {
  onCancel: () => void;
  onCreated: (info: { name: string; roomId: string }) => void;
};

const CARD =
  'rounded-[14px] border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5';

const INPUT =
  'h-10 w-full rounded-[14px] border border-[#E1E7EE] bg-white text-[12px] text-[#151D2B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15';

const LABEL = 'mb-1.5 block text-[12px] font-medium text-[#6F7B8C]';

const DEPTS = [
  'Product',
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'HR',
  'Finance',
  'Other',
];

const ROOM_TYPES = ['Meeting', 'Webinar', 'Classroom', 'Interview', 'Support', 'Other'];

const DESC_MAX = 150;

const ROOM_ID_RE = /^[a-z0-9_]+$/;

type RoomSettings = {
  allowRecording: boolean;
  allowChat: boolean;
  screenSharing: boolean;
  fileSharing: boolean;
  waitingRoom: boolean;
  roomApproval: boolean;
};

export function CreateRoomPanel({ onCancel, onCreated }: Props) {
  const { activeWorkspace } = useAuth();
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomType, setRoomType] = useState('');
  const [department, setDepartment] = useState('');
  const [tags, setTags] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [directory, setDirectory] = useState<WorkspaceDirectoryMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<WorkspaceDirectoryMember[]>([]);
  const [settings, setSettings] = useState<RoomSettings>({
    allowRecording: true,
    allowChat: true,
    screenSharing: true,
    fileSharing: true,
    waitingRoom: false,
    roomApproval: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !canManage) return;
    let cancelled = false;
    workspaceService
      .listDirectory(activeWorkspace.workspaceId)
      .then((rows) => {
        if (!cancelled) setDirectory(rows);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId, canManage]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const memberMatches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return [];
    const selectedIds = new Set(selectedMembers.map((m) => m.userId));
    return directory
      .filter(
        (m) =>
          !selectedIds.has(m.userId) &&
          (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [directory, memberQuery, selectedMembers]);

  const previewName = name.trim() || 'New Room';
  const previewId = roomId.trim() || 'room_id';
  const previewInitial = previewName.charAt(0).toUpperCase() || 'N';
  const capacityNum = Math.max(0, Number(capacity) || 0);
  const memberCount = selectedMembers.length;

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(roomId.trim()) &&
    ROOM_ID_RE.test(roomId.trim()) &&
    capacityNum > 0;

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      setError('Room image must be PNG or JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Room image must be 2MB or smaller.');
      return;
    }
    setError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const addMember = (m: WorkspaceDirectoryMember) => {
    setSelectedMembers((prev) => [...prev, m]);
    setMemberQuery('');
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canManage || !canSubmit || !activeWorkspace?.workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const created = await roomsService.create(activeWorkspace.workspaceId, {
        name: name.trim(),
        roomId: roomId.trim(),
        description: description.trim() || undefined,
        capacity: capacityNum,
        roomType: roomType || undefined,
        department: department || undefined,
        tags: tagList,
        memberIds: selectedMembers.map((m) => m.userId),
        settings,
      });
      onCreated({ name: created.name, roomId: created.roomId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create room.');
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div className={CARD}>
        <p className="text-[12px] text-[#6F7B8C]">Only admins can create rooms.</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-9 rounded-[14px] border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#475569]"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <form
      id="create-room-form"
      onSubmit={(e) => void submit(e)}
      className={cn('space-y-4', busy && 'pointer-events-none opacity-60')}
      aria-busy={busy}
    >
      {error ? (
        <div
          className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-[12px] font-medium text-[#B91C1C]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={CARD}>
          <h2 className="text-[15px] font-semibold tracking-tight text-[#1A2846]">
            Room Information
          </h2>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cr-name" className={LABEL}>
                  Room Name <span className="text-[#E1212D]">*</span>
                </label>
                <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                  <Building2 size={15} className="shrink-0 text-[#94A3B8]" />
                  <input
                    id="cr-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter room name"
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cr-id" className={LABEL}>
                  Room ID <span className="text-[#E1212D]">*</span>
                </label>
                <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                  <Hash size={15} className="shrink-0 text-[#94A3B8]" />
                  <input
                    id="cr-id"
                    value={roomId}
                    onChange={(e) =>
                      setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="Enter a unique room ID"
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#6D7B93]">
                  Use lowercase letters, numbers, and underscores only.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="cr-desc" className="text-[12px] font-medium text-[#6F7B8C]">
                  Description <span className="font-normal text-[#94A3B8]">(Optional)</span>
                </label>
                <span className="text-[11px] tabular-nums text-[#94A3B8]">
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                id="cr-desc"
                value={description}
                maxLength={DESC_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter room description (optional)"
                disabled={busy}
                rows={3}
                className="w-full resize-none rounded-[14px] border border-[#E1E7EE] bg-white px-3 py-2.5 text-[12px] text-[#151D2B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cr-capacity" className={LABEL}>
                  Capacity <span className="text-[#E1212D]">*</span>
                </label>
                <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                  <Users size={15} className="shrink-0 text-[#94A3B8]" />
                  <input
                    id="cr-capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Enter maximum capacity"
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cr-type" className={LABEL}>
                  Room Type
                </label>
                <div className="relative">
                  <select
                    id="cr-type"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    disabled={busy}
                    className={cn(
                      INPUT,
                      'appearance-none px-3 pr-8 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]',
                    )}
                  >
                    <option value="">Select room type</option>
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cr-dept" className={LABEL}>
                  Department <span className="font-normal text-[#94A3B8]">(Optional)</span>
                </label>
                <div className="relative">
                  <select
                    id="cr-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={busy}
                    className={cn(
                      INPUT,
                      'appearance-none px-3 pr-8 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]',
                    )}
                  >
                    <option value="">Select Department</option>
                    {DEPTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6F7B8C]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cr-tags" className={LABEL}>
                  Tags <span className="font-normal text-[#94A3B8]">(Optional)</span>
                </label>
                <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                  <FileText size={15} className="shrink-0 text-[#94A3B8]" />
                  <input
                    id="cr-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Add tags"
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className={LABEL}>
                Room Image <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </p>
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[#D0D7E2] bg-[#F8FAFC] px-4 py-6 text-center transition hover:border-[#016BE6] hover:bg-[#F3F8FF]',
                  imagePreview && 'py-4',
                )}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Room preview"
                    className="mb-1 h-20 w-full max-w-[220px] rounded-[12px] object-cover"
                  />
                ) : (
                  <CloudUpload size={22} className="text-[#94A3B8]" strokeWidth={1.7} />
                )}
                <span className="text-[12px] font-medium text-[#334155]">
                  Click to upload or drag and drop
                </span>
                <span className="text-[11px] text-[#8A94A6]">PNG, JPG up to 2MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="border-t border-[#EEF1F5] pt-4">
              <h3 className="text-[13px] font-semibold text-[#151D2B]">
                Room Members <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </h3>
              <p className="mt-0.5 text-[11px] text-[#6F7B8C]">
                Add members who will have access to this room.
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <div className={cn(INPUT, 'flex items-center gap-2 px-3')}>
                    <Search size={14} className="shrink-0 text-[#94A3B8]" />
                    <input
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      placeholder="Search members by name or email"
                      disabled={busy}
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                  {memberMatches.length > 0 ? (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[14px] border border-[#E1E7EE] bg-white py-1 shadow-lg">
                      {memberMatches.map((m) => (
                        <li key={m.userId}>
                          <button
                            type="button"
                            onClick={() => addMember(m)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F8FAFC]"
                          >
                            <UserAvatar
                              name={m.name}
                              avatarUrl={m.avatarUrl}
                              avatarColor={m.avatarColor}
                              size="sm"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-semibold text-[#151D2B]">
                                {m.name}
                              </span>
                              <span className="block truncate text-[11px] text-[#6F7B8C]">
                                {m.email}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busy || memberMatches.length === 0}
                  onClick={() => {
                    if (memberMatches[0]) addMember(memberMatches[0]);
                  }}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[14px] border border-[#E2E7ED] bg-white px-3.5 text-[12px] font-semibold text-[#1968F2] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add Member
                </button>
              </div>

              {selectedMembers.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {selectedMembers.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center gap-2 rounded-[12px] border border-[#EEF1F5] bg-[#F8FAFC] px-2.5 py-1.5"
                    >
                      <UserAvatar
                        name={m.name}
                        avatarUrl={m.avatarUrl}
                        avatarColor={m.avatarColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#151D2B]">{m.name}</p>
                        <p className="truncate text-[11px] text-[#6F7B8C]">{m.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(m.userId)}
                        className="inline-flex size-7 items-center justify-center rounded-full text-[#94A3B8] hover:bg-white hover:text-[#475569]"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className={CARD}>
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Room Preview</h2>
            <div className="mt-4 flex flex-col items-center rounded-[14px] border border-[#EEF1F5] bg-[#F8FAFC] px-4 py-5 text-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt=""
                  className="size-14 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-[#7C6BFF] text-[18px] font-bold text-white">
                  {previewInitial}
                </span>
              )}
              <p className="mt-3 text-[13px] font-semibold text-[#151D2B]">{previewName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-[#6F7B8C]">{previewId}</p>
              <div className="mt-4 flex w-full items-center justify-center gap-4 border-t border-[#E8ECF1] pt-3 text-[11px] text-[#6F7B8C]">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} />
                  {memberCount} Members
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} />
                  {memberCount} / {capacityNum || 0} Capacity
                </span>
              </div>
            </div>
          </section>

          <section className={CARD}>
            <h2 className="text-[13px] font-semibold text-[#151D2B]">Room Settings</h2>
            <ul className="mt-3 space-y-3.5">
              {(
                [
                  {
                    key: 'allowRecording',
                    title: 'Allow recording',
                    desc: 'Members can record meetings in this room.',
                  },
                  {
                    key: 'allowChat',
                    title: 'Allow chat',
                    desc: 'Members can send messages in this room.',
                  },
                  {
                    key: 'screenSharing',
                    title: 'Screen sharing',
                    desc: 'Members can share their screen.',
                  },
                  {
                    key: 'fileSharing',
                    title: 'File sharing',
                    desc: 'Members can share files in this room.',
                  },
                  {
                    key: 'waitingRoom',
                    title: 'Waiting room',
                    desc: 'Enable waiting room for this room.',
                  },
                  {
                    key: 'roomApproval',
                    title: 'Room approval',
                    desc: 'Require approval before joining.',
                  },
                ] as const
              ).map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#151D2B]">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6F7B8C]">{item.desc}</p>
                  </div>
                  <SettingsToggle
                    enabled={settings[item.key]}
                    label={item.title}
                    disabled={busy}
                    onChange={(next) =>
                      setSettings((prev) => ({
                        ...prev,
                        [item.key]: next,
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pb-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="inline-flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-[14px] bg-[#DC6C7C] px-4 text-[12px] font-semibold text-white hover:bg-[#d45a6c] disabled:opacity-60"
        >
          {busy ? (
            <>
              <span
                className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              Creating…
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              Create Room
            </>
          )}
        </button>
      </div>
    </form>
  );
}
