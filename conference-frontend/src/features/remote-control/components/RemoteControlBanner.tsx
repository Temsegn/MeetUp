import React from 'react';
import type { ActiveControlSession, RemoteViewMode } from '../types';
import { ViewSwitcher } from './ViewSwitcher';

interface RemoteControlBannerProps {
  session: ActiveControlSession;
  viewMode: RemoteViewMode;
  onStop: () => void;
  onSwitchView?: (view: RemoteViewMode) => void;
}

export const RemoteControlBanner: React.FC<RemoteControlBannerProps> = ({
  session,
  viewMode,
  onStop,
  onSwitchView,
}) => {
  const controlling = session.role === 'controlling';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {controlling && onSwitchView ? (
        <ViewSwitcher session={session} viewMode={viewMode} onChange={onSwitchView} />
      ) : null}
      {!controlling ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          Controlled by {session.requesterName}
        </span>
      ) : (
        <span className="rounded-full border border-[#BFDBFE] bg-[#E8F1FF] px-2.5 py-1 text-[11px] font-semibold text-[#016BE6]">
          {viewMode === 'remote'
            ? `Acting as ${session.controlledName}`
            : 'Your view'}
        </span>
      )}
      <button
        type="button"
        onClick={onStop}
        className="rounded-full border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[12px] font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
      >
        {controlling ? 'Stop control' : 'Revoke'}
      </button>
    </div>
  );
};
