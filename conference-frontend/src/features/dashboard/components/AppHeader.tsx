import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronDown,
  CreditCard,
  LogOut,
  MoreHorizontal,
  User,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import { CreateMeetingMenu } from '../../meetings/components/CreateMeetingMenu';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { workspaceService } from '../../../services/workspace/workspace.service';

type Props = {
  title: string;
  subtitle?: string;
  /** Small path under the title, e.g. Workspace > Members */
  breadcrumb?: ReactNode;
  className?: string;
  actions?: ReactNode;
  /** Show only the right-side actions (New Meeting, profile). */
  actionsOnly?: boolean;
  /** Replaces the New Meeting control (e.g. Create Member on Members page). Pass null to hide it. */
  primaryAction?: ReactNode | null;
};

const HEADER_BTN =
  'inline-flex h-9 items-center justify-center rounded-[14px] border border-[#E1E7EE] bg-white text-[#1E293B] shadow-sm hover:bg-[#F8FAFC]';

export function AppHeader({
  title,
  subtitle,
  breadcrumb,
  className,
  actions,
  actionsOnly,
  primaryAction,
}: Props) {
  const { user, signOut, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || 'User';
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    const workspaceId = activeWorkspace?.workspaceId;
    if (!workspaceId) {
      setMemberCount(null);
      return;
    }
    let cancelled = false;
    workspaceService
      .listMembers(workspaceId)
      .then((rows) => {
        if (!cancelled) setMemberCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setMemberCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId]);

  const goProfile = () => {
    setMenuOpen(false);
    navigate('/app/settings/profile');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  };

  return (
    <header
      className={cn(
        'flex flex-wrap gap-3',
        actionsOnly ? 'items-center justify-end' : 'items-start justify-between',
        className,
      )}
    >
      {!actionsOnly ? (
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-9 tracking-tight text-[#151D2B]">{title}</h1>
          {breadcrumb ? (
            <div className="mt-1 text-[12px] text-[#8A94A6]">{breadcrumb}</div>
          ) : null}
          {subtitle ? (
            <p className={cn('text-[12px] text-[#6F7B8C]', breadcrumb ? 'mt-1' : 'mt-0.5')}>
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex h-9 flex-wrap items-center gap-2.5">
        {actions}

        {/* Members count — real workspace member total */}
        <button
          type="button"
          onClick={() => navigate('/app/settings/members')}
          className={cn(HEADER_BTN, 'min-w-[52px] gap-1.5 px-2.5')}
          aria-label={`Workspace members: ${memberCount ?? 0}`}
          title="Members"
        >
          <Users className="size-4 shrink-0 text-[#1E293B]" strokeWidth={1.9} />
          <span className="text-[13px] font-semibold tabular-nums text-[#1E293B]">
            {memberCount ?? '—'}
          </span>
        </button>

        {/* Three-dot menu */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(HEADER_BTN, 'w-9')}
            aria-label="More options"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="size-4 text-[#1E293B]" strokeWidth={2} />
          </button>

          {moreOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#E1E7EE] bg-white py-1.5 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  navigate('/app/settings/members');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
              >
                <Users className="size-4 text-[#016BE6]" strokeWidth={1.9} />
                Members
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  navigate('/app/billing');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
              >
                <CreditCard className="size-4 text-[#016BE6]" strokeWidth={1.9} />
                Billing
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  navigate('/app/notifications');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
              >
                <Bell className="size-4 text-[#016BE6]" strokeWidth={1.9} />
                Notifications
              </button>
            </div>
          ) : null}
        </div>

        {primaryAction === undefined ? <CreateMeetingMenu /> : primaryAction}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 items-center gap-1.5 rounded-[14px] p-0.5 hover:bg-[#F8FAFC]"
            aria-label="Profile menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="relative flex size-11 items-center justify-center">
              <UserAvatar
                name={name}
                avatarUrl={user?.avatarUrl}
                avatarColor={user?.avatarColor}
                size="lg"
                className="size-11 text-[15px]"
              />
              <span className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-white bg-[#00A45C]" />
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 text-[#64748B] transition-transform',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#E1E7EE] bg-white py-1.5 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)]"
            >
              <div className="border-b border-[#F1F4F8] px-3.5 py-2.5">
                <p className="truncate text-[13px] font-semibold text-[#151D2B]">{name}</p>
                {user?.email ? (
                  <p className="truncate text-[11px] text-[#6F7B8C]">{user.email}</p>
                ) : null}
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={goProfile}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#151D2B] hover:bg-[#F8FAFC]"
              >
                <User className="size-4 text-[#016BE6]" strokeWidth={1.9} />
                Profile
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={loggingOut}
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#DF1E39] hover:bg-[#FEF2F2] disabled:opacity-60"
              >
                <LogOut className="size-4" strokeWidth={1.9} />
                {loggingOut ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
