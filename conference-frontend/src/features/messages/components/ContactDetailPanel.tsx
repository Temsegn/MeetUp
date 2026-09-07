import { useEffect, useState } from 'react';
import {
  File,
  FileText,
  Image as ImageIcon,
  Link2,
  MoreHorizontal,
  MoreVertical,
  Phone,
  User,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import {
  messagesService,
  resolveMediaUrl,
  type SharedProfile,
} from '../../../services/messages/messages.service';

export type ContactDetailProps = {
  conversationId?: string | null;
  workspaceId?: string | null;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  about?: string | null;
  localTime?: string | null;
  online?: boolean;
  isGroup?: boolean;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
  className?: string;
};

export function ContactDetailPanel({
  conversationId,
  workspaceId,
  name,
  email,
  avatarUrl,
  avatarColor,
  about,
  localTime,
  online = false,
  isGroup = false,
  onVideoCall,
  onAudioCall,
  className,
}: ContactDetailProps) {
  const [shared, setShared] = useState<SharedProfile | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!conversationId || !workspaceId) {
      setShared(null);
      return;
    }
    let cancelled = false;
    messagesService
      .getShared(workspaceId, conversationId)
      .then((data) => {
        if (!cancelled) setShared(data);
      })
      .catch(() => {
        if (!cancelled) setShared(null);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const item of shared?.media ?? []) {
        if (!item.url) continue;
        const resolved = await resolveMediaUrl(item.url, workspaceId);
        if (resolved && !cancelled) next[item.url] = resolved;
      }
      if (!cancelled) setThumbUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [shared?.media, workspaceId]);

  const aboutLine =
    shared?.peer?.about ??
    about ??
    (isGroup ? 'Group chat with workspace members.' : 'Workspace teammate');
  const timeLine =
    localTime ??
    new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' local time';
  const isOnline = shared?.peer?.online ?? online;
  const media = shared?.media ?? [];
  const links = shared?.links ?? [];
  const meetings = shared?.meetings ?? [];
  const extra = Math.max(0, (shared?.mediaTotal ?? 0) - media.length);

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center px-4 pb-4 pt-5 text-center">
          <div className="relative">
            <UserAvatar
              name={shared?.peer?.name ?? name}
              avatarUrl={shared?.peer?.avatarUrl ?? avatarUrl}
              avatarColor={shared?.peer?.avatarColor ?? avatarColor}
              size="xl"
              className="sm:size-[4.75rem] sm:text-[22px]"
            />
            {isOnline && !isGroup ? (
              <span
                className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-white bg-[#22C55E]"
                aria-label="Online"
              />
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <h3 className="text-[15px] font-semibold text-[#151D2B]">
              {shared?.peer?.name ?? name}
            </h3>
            {isOnline && !isGroup ? (
              <span className="size-2 shrink-0 rounded-full bg-[#22C55E]" aria-hidden />
            ) : null}
          </div>

          {shared?.peer?.email || email ? (
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
              {shared?.peer?.email ?? email}
            </p>
          ) : isGroup ? (
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">Group conversation</p>
          ) : null}

          {!isGroup ? (
            <div className="mt-4 flex w-full max-w-[260px] items-start justify-between gap-1 px-1">
              {(
                [
                  { icon: Video, label: 'Video Call', onClick: onVideoCall },
                  { icon: Phone, label: 'Audio Call', onClick: onAudioCall },
                  { icon: User, label: 'Profile', onClick: undefined },
                  { icon: MoreHorizontal, label: 'More', onClick: undefined },
                ] as const
              ).map(({ icon: Icon, label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  disabled={!onClick}
                  className="flex flex-1 flex-col items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] transition-colors hover:bg-[#E8ECF1]">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-center text-[10px] leading-tight text-[#6F7B8C]">{label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#F1F4F8] px-4 py-3.5">
          <h4 className="mb-1.5 text-[13px] font-semibold text-[#151D2B]">About</h4>
          <p className="text-[12px] leading-relaxed text-[#6F7B8C]">{aboutLine}</p>
          {!isGroup ? (
            <p className="mt-0.5 text-[12px] text-[#6F7B8C]">{timeLine}</p>
          ) : null}
        </div>

        <div className="border-t border-[#F1F4F8] px-4 py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#151D2B]">Shared Media</h4>
          </div>
          {media.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8]">No shared media yet.</p>
          ) : (
            <div className="flex flex-wrap items-start gap-2.5">
              {media.slice(0, 8).map((item) => (
                <div key={`${item.url}-${item.name}`} className="flex w-[58px] flex-col items-center gap-1">
                  <div className="flex size-[58px] items-center justify-center overflow-hidden rounded-xl bg-[#F1F5F9] text-[#64748B]">
                    {item.kind === 'image' && item.url && thumbUrls[item.url] ? (
                      <img src={thumbUrls[item.url]} alt="" className="size-full object-cover" />
                    ) : item.kind === 'image' ? (
                      <ImageIcon className="size-5" />
                    ) : item.kind === 'file' && item.mimeType?.includes('pdf') ? (
                      <FileText className="size-5" />
                    ) : (
                      <File className="size-5" />
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-[#6F7B8C]">
                    {item.name}
                  </span>
                </div>
              ))}
              {extra > 0 ? (
                <div className="flex size-[58px] shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[12px] font-semibold text-[#6F7B8C]">
                  +{extra}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-[#F1F4F8] px-4 py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#151D2B]">Shared Links</h4>
          </div>
          {links.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8]">No links shared yet.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.url}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E8ECF1] bg-white px-2.5 py-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8F1FF] text-[#016BE6]">
                    <Link2 className="size-3.5" />
                  </span>
                  <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{link.title}</p>
                    <p className="truncate text-[11px] text-[#94A3B8]">{link.url}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#F1F4F8] px-4 py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#151D2B]">Shared Meetings</h4>
          </div>
          {meetings.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8]">No shared meetings yet.</p>
          ) : (
            <ul className="space-y-2">
              {meetings.map((mt) => (
                <li
                  key={`${mt.roomId}-${mt.title}`}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E8ECF1] bg-white px-2.5 py-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8F1FF] text-[#016BE6]">
                    <Video className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#151D2B]">{mt.title}</p>
                    <p className="text-[11px] text-[#94A3B8]">{mt.meta}</p>
                  </div>
                  {mt.href ? (
                    <a
                      href={mt.href}
                      className="shrink-0 rounded-md p-1 text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569]"
                      aria-label="Open meeting"
                    >
                      <MoreVertical className="size-3.5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
