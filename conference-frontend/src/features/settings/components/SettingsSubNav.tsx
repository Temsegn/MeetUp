import { WORKSPACE_SIDEBAR_SECTIONS, SETTINGS_NAV, type SettingsSectionId } from '../constants';
import { cn } from '../../../lib/cn';

type Props = {
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
};

const WORKSPACE_PARENT_ACTIVE = 'text-[#1968F2]';

export function SettingsSubNav({ active, onSelect }: Props) {
  const topLevel = SETTINGS_NAV.filter((item) => !item.underWorkspace);
  const underWorkspace = SETTINGS_NAV.filter((item) => item.underWorkspace);
  const workspaceChildActive =
    active !== 'workspace' && WORKSPACE_SIDEBAR_SECTIONS.includes(active);

  const renderItem = (item: (typeof SETTINGS_NAV)[number]) => {
    const Icon = item.icon;
    const isActive =
      item.id === active ||
      (item.id === 'members' && active === 'invite') ||
      (item.id === 'teams' && active === 'create-team') ||
      (item.id === 'rooms' && active === 'create-room');
    const isWorkspaceParentTint =
      item.id === 'workspace' &&
      (item.id === active ||
        workspaceChildActive ||
        active === 'invite' ||
        active === 'create-team' ||
        active === 'create-room');

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        className={cn(
          // Same inner padding for all — active pill won’t look over-padded on the left
          'flex w-full items-center gap-2 rounded-[14px] px-2 py-2 text-left text-[12px] font-medium transition-colors',
          isActive
            ? 'bg-[#E8F1FF] text-[#016BE6]'
            : isWorkspaceParentTint
              ? WORKSPACE_PARENT_ACTIVE
              : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#151D2B]',
        )}
      >
        <Icon size={15} strokeWidth={1.9} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <nav className="hidden w-full flex-col gap-0.5 xl:flex" aria-label="Settings sections">
        {topLevel.map((item) => (
          <div key={item.id} className="flex flex-col gap-0.5">
            {renderItem(item)}
            {item.id === 'workspace' ? (
              <div className="flex flex-col gap-0.5 pl-3">
                {underWorkspace.map((child) => renderItem(child))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="flex gap-2 overflow-x-auto pb-0.5 xl:hidden" aria-label="Settings sections">
        {SETTINGS_NAV.map((item) => {
          const isActive =
            item.id === active ||
            (item.id === 'members' && active === 'invite') ||
            (item.id === 'teams' && active === 'create-team') ||
            (item.id === 'rooms' && active === 'create-room');
          const isWorkspaceParentTint =
            item.id === 'workspace' &&
            (item.id === active ||
              workspaceChildActive ||
              active === 'invite' ||
              active === 'create-team' ||
              active === 'create-room');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'shrink-0 rounded-[14px] px-2.5 py-2 text-[12px] font-semibold',
                isActive
                  ? 'bg-[#E8F1FF] text-[#016BE6]'
                  : isWorkspaceParentTint
                    ? cn(WORKSPACE_PARENT_ACTIVE, 'border border-transparent')
                    : 'border border-[#E1E7EE] bg-white text-[#475569]',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
