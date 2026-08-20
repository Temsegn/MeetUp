import React from 'react';
import type { ActiveControlSession, RemoteViewMode } from '../types';

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
  const remote = controlling && viewMode === 'remote';

  return (
    <div className="flex items-center gap-1.5">
      {controlling && onSwitchView && (
        <button
          type="button"
          onClick={() => onSwitchView(remote ? 'self' : 'remote')}
          className="bg-slate-800/80 backdrop-blur rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium border border-slate-700 shadow-lg hover:bg-slate-700 transition max-w-[160px] truncate"
          title={remote ? 'Switch to your view' : `Control ${session.controlledName}`}
        >
          {remote ? `Controlling ${session.controlledName}` : 'My View'}
        </button>
      )}
      {!controlling && (
        <span className="hidden sm:inline text-[11px] text-amber-200/90 max-w-[140px] truncate">
          Controlled by {session.requesterName}
        </span>
      )}
      <button
        type="button"
        onClick={onStop}
        className="bg-slate-800/80 backdrop-blur rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium border border-slate-700 shadow-lg hover:bg-slate-700 transition"
      >
        {controlling ? 'Stop' : 'Revoke'}
      </button>
    </div>
  );
};
