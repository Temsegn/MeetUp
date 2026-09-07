import { Plus, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/cn';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useMatch, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { SettingsSubNav } from '../components/SettingsSubNav';
import {
  AccountSection,
  IntegrationsSection,
  PlaceholderSettingsCard,
  ProfileSection,
  SecuritySection,
} from '../components/SettingsSections';
import { CreateRoomPanel } from '../components/CreateRoomPanel';
import { CreateTeamPanel } from '../components/CreateTeamPanel';
import { InviteMemberPanel } from '../components/InviteMemberPanel';
import { MemberUserPanel } from '../components/MemberUserPanel';
import { MembersSettingsPanel } from '../components/MembersSettingsPanel';
import { RoomsSettingsPanel } from '../components/RoomsSettingsPanel';
import { TeamsSettingsPanel } from '../components/TeamsSettingsPanel';
import { SettingsSectionSkeleton } from '../components/SettingsSkeletons';
import { WorkspaceSettingsPanel } from '../components/WorkspaceSettingsPanel';
import { useSettings } from '../hooks/useSettings';
import {
  isSettingsSectionId,
  SETTINGS_SECTION_META,
  WORKSPACE_SIDEBAR_SECTIONS,
  type SettingsSectionId,
} from '../constants';
import { DASHBOARD_CARD_RADIUS_CLASS } from '../../dashboard/components/dashboardListStyles';

const SECTION_SKELETON_MS = 320;

function sectionFromParams(section: string | undefined): SettingsSectionId {
  if (isSettingsSectionId(section)) return section;
  return 'profile';
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { section: sectionParam, userId } = useParams<{
    section?: string;
    userId?: string;
  }>();
  const memberEditMatch = useMatch('/app/settings/members/:userId/edit');
  const memberViewMatch = useMatch('/app/settings/members/:userId');
  const memberMode = memberEditMatch ? 'edit' : memberViewMatch ? 'view' : null;
  const memberUserId = userId ?? memberEditMatch?.params.userId ?? memberViewMatch?.params.userId;

  const active: SettingsSectionId = memberMode
    ? 'members'
    : sectionFromParams(sectionParam);
  const s = useSettings();
  const { activeWorkspace } = useAuth();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const hideSubNav = active === 'invite' || Boolean(memberMode);
  const canInvite =
    activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!sectionParam && !memberMode) {
      navigate('/app/settings/profile', { replace: true });
    }
  }, [sectionParam, memberMode, navigate]);

  useEffect(() => {
    setShowSkeleton(true);
    const t = window.setTimeout(() => setShowSkeleton(false), SECTION_SKELETON_MS);
    return () => window.clearTimeout(t);
  }, [active, memberMode, memberUserId]);

  const meta = useMemo(() => {
    if (memberMode === 'view') {
      return {
        title: 'User Details',
        subtitle: 'View member information and access.',
      };
    }
    if (memberMode === 'edit') {
      return {
        title: 'Edit User',
        subtitle: 'Update this member’s role and review their access.',
      };
    }
    return SETTINGS_SECTION_META[active];
  }, [active, memberMode]);

  const select = (id: SettingsSectionId) => {
    if (id === active && !memberMode) return;
    setShowSkeleton(true);
    navigate(`/app/settings/${id}`);
  };

  const createMemberAction =
    active === 'members' && !memberMode && canInvite ? (
      <button
        type="button"
        onClick={() => select('invite')}
        className="inline-flex h-9 w-[168px] shrink-0 items-center justify-center gap-1.5 rounded-[14px] bg-[#DC6C7C] px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-[#d45a6c]"
      >
        <UserPlus size={14} strokeWidth={2.5} />
        Create Member
      </button>
    ) : active === 'teams' && canInvite ? (
      <button
        type="button"
        onClick={() => select('create-team')}
        className="inline-flex h-9 w-[168px] shrink-0 items-center justify-center gap-1.5 rounded-[14px] bg-[#DC6C7C] px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-[#d45a6c]"
      >
        <Plus size={14} strokeWidth={2.5} />
        Create Team
      </button>
    ) : active === 'rooms' && canInvite ? (
      <button
        type="button"
        onClick={() => select('create-room')}
        className="inline-flex h-9 w-[168px] shrink-0 items-center justify-center gap-1.5 rounded-[14px] bg-[#DC6C7C] px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-[#d45a6c]"
      >
        <Plus size={14} strokeWidth={2.5} />
        Create Room
      </button>
    ) : active === 'create-team' ? null : active === 'create-room' ? (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => select('rooms')}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-[#E1E7EE] bg-white px-3.5 text-[13px] font-semibold text-[#334155] shadow-sm hover:bg-[#F8FAFC]"
        >
          <X size={14} strokeWidth={2.5} />
          Cancel
        </button>
        <button
          type="submit"
          form="create-room-form"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] bg-[#DC6C7C] px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#d45a6c]"
        >
          <Plus size={14} strokeWidth={2.5} />
          Create Room
        </button>
      </div>
    ) : active === 'invite' || memberMode ? null : undefined;

  const breadcrumb = useMemo(() => {
    if (active === 'invite') {
      return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => select('workspace')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Workspace
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <button
            type="button"
            onClick={() => select('members')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Members
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <span className="text-[#6F7B8C]">Create User</span>
        </nav>
      );
    }
    if (active === 'create-team') {
      return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => select('workspace')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Workspace
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <button
            type="button"
            onClick={() => select('teams')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Teams
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <span className="text-[#6F7B8C]">Create Team</span>
        </nav>
      );
    }
    if (active === 'create-room') {
      return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => select('workspace')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Workspace
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <button
            type="button"
            onClick={() => select('rooms')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Rooms
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <span className="text-[#6F7B8C]">Create Room</span>
        </nav>
      );
    }
    if (memberMode) {
      return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => select('workspace')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Workspace
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <button
            type="button"
            onClick={() => select('members')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Members
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <span className="text-[#6F7B8C]">
            {memberMode === 'edit' ? 'Edit User' : 'View Details'}
          </span>
        </nav>
      );
    }
    if (active !== 'workspace' && WORKSPACE_SIDEBAR_SECTIONS.includes(active)) {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => select('workspace')}
            className="hover:text-[#016BE6] hover:underline"
          >
            Workspace
          </button>
          <span aria-hidden className="text-[#C0C7D1]">
            &gt;
          </span>
          <span className="text-[#6F7B8C]">{meta.title}</span>
        </nav>
      );
    }
    return null;
  }, [active, meta.title, memberMode]);

  if (sectionParam && !memberMode && !isSettingsSectionId(sectionParam)) {
    return <Navigate to="/app/settings/profile" replace />;
  }

  return (
    <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
      <div className="shrink-0 bg-white px-3.5 pt-6 pb-2 sm:px-5 md:pl-6 lg:pr-6">
        <AppHeader
          title={meta.title}
          subtitle={meta.subtitle}
          breadcrumb={breadcrumb}
          className="items-start"
          primaryAction={createMemberAction}
        />
        {s.toast ? (
          <div
            className="mt-3 rounded-[10.13px] border border-[#C7E7D4] bg-[#ECFDF3] px-3.5 py-2 text-[13px] font-medium text-[#027A48]"
            role="status"
          >
            {s.toast}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 pt-3',
          !hideSubNav && 'xl:flex-row xl:gap-3',
        )}
      >
        {!hideSubNav ? (
          <aside className="flex max-h-[42vh] shrink-0 flex-col px-3 sm:px-4 xl:max-h-none xl:h-full xl:w-[200px] xl:px-0 xl:pl-3 xl:pr-0">
            <div
              className={cn(
                'scrollbar-none flex min-h-0 flex-col overflow-y-auto overscroll-contain',
                'rounded-[14px] border border-[#E8ECF1] bg-white px-2 py-2',
                'shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
                'max-h-full',
              )}
            >
              <SettingsSubNav active={active} onSelect={select} />
            </div>
          </aside>
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white">
          <div
            className={cn(
              'mx-auto px-3.5 pt-0 pb-20 sm:px-5 lg:pr-6',
              active === 'workspace' ||
                active === 'members' ||
                active === 'teams' ||
                active === 'create-team' ||
                active === 'rooms' ||
                active === 'create-room' ||
                active === 'invite' ||
                memberMode
                ? hideSubNav
                  ? 'max-w-[1180px]'
                  : 'max-w-[1180px] xl:pl-3'
                : 'max-w-5xl md:px-6',
            )}
          >
            {showSkeleton ? <SettingsSectionSkeleton section={active} /> : null}

            {!showSkeleton && active === 'profile' ? (
              <ProfileSection
                user={s.user}
                name={s.name}
                email={s.email}
                phone={s.phone}
                jobTitle={s.jobTitle}
                department={s.department}
                role={activeWorkspace?.role ?? ''}
                avatarPreview={s.avatarPreview}
                busy={s.profileBusy}
                message={s.profileMsg}
                error={s.profileError}
                fileRef={s.fileRef}
                onName={s.setName}
                onEmail={s.setEmail}
                onPhone={s.setPhone}
                onJobTitle={s.setJobTitle}
                onDepartment={s.setDepartment}
                onPickPhoto={s.pickPhoto}
                onPhotoSelected={s.onPhotoSelected}
                onSave={() => void s.saveProfile()}
              />
            ) : null}

            {!showSkeleton && active === 'account' ? <AccountSection settings={s.settings} /> : null}

            {!showSkeleton && active === 'workspace' ? (
              <WorkspaceSettingsPanel
                onViewAllMembers={() => select('members')}
                onInviteMembers={() => select('invite')}
              />
            ) : null}

            {!showSkeleton && active === 'members' && !memberMode ? (
              <MembersSettingsPanel onInviteMembers={() => select('invite')} />
            ) : null}

            {!showSkeleton && memberMode && memberUserId ? (
              <MemberUserPanel
                userId={memberUserId}
                mode={memberMode}
                onBack={() =>
                  memberMode === 'edit'
                    ? navigate(`/app/settings/members/${memberUserId}`)
                    : select('members')
                }
                onEdit={() => navigate(`/app/settings/members/${memberUserId}/edit`)}
                onSaved={() => navigate(`/app/settings/members/${memberUserId}`)}
              />
            ) : null}

            {!showSkeleton && active === 'invite' ? (
              <InviteMemberPanel
                onCancel={() => select('members')}
                onCreated={(info) => {
                  navigate('/app/settings/members', {
                    replace: true,
                    state: {
                      createdUserMessage: `New user created: ${info.name} (${info.email}). They appear as Pending until they verify and accept.`,
                    },
                  });
                }}
              />
            ) : null}

            {!showSkeleton && active === 'teams' ? (
              <TeamsSettingsPanel onCreateTeam={() => select('create-team')} />
            ) : null}

            {!showSkeleton && active === 'create-team' ? (
              <CreateTeamPanel
                onCancel={() => select('teams')}
                onCreated={(info) => {
                  navigate('/app/settings/teams', {
                    replace: true,
                    state: {
                      createdTeamMessage: `Team created: ${info.name} (${info.teamId}).`,
                    },
                  });
                }}
              />
            ) : null}

            {!showSkeleton && active === 'rooms' ? (
              <RoomsSettingsPanel onCreateRoom={() => select('create-room')} />
            ) : null}

            {!showSkeleton && active === 'create-room' ? (
              <CreateRoomPanel
                onCancel={() => select('rooms')}
                onCreated={(info) => {
                  navigate('/app/settings/rooms', {
                    replace: true,
                    state: {
                      createdRoomMessage: `Room created: ${info.name} (${info.roomId}).`,
                    },
                  });
                }}
              />
            ) : null}

            {!showSkeleton && active === 'branding' ? (
              <PlaceholderSettingsCard
                title="Branding"
                description="Customize logo, colors, and workspace appearance."
                className={DASHBOARD_CARD_RADIUS_CLASS}
              />
            ) : null}

            {!showSkeleton && active === 'security' ? (
              <SecuritySection
                settings={s.settings}
                busy={s.settingsBusy}
                onToggle={s.updateSecurityToggle}
              />
            ) : null}

            {!showSkeleton && active === 'billing' ? (
              <PlaceholderSettingsCard
                title="Billing & Plan"
                description="View participant-minute usage, change plans, and manage payment method. You can also open the full billing page from the sidebar billing route."
                className={DASHBOARD_CARD_RADIUS_CLASS}
              />
            ) : null}

            {!showSkeleton && active === 'integrations' ? (
              <IntegrationsSection
                settings={s.settings}
                busy={s.settingsBusy}
                onToggle={s.updateIntegration}
              />
            ) : null}

            {!showSkeleton && active === 'audit' ? (
              <PlaceholderSettingsCard
                title="Audit Logs"
                description="Review activity across your workspace."
                className={DASHBOARD_CARD_RADIUS_CLASS}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
