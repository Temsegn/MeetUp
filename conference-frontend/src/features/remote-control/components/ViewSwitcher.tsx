import React from 'react';
import type { ActiveControlSession, RemoteViewMode } from '../types';

interface ViewSwitcherProps {
  session: ActiveControlSession;
  viewMode: RemoteViewMode;
  onChange: (view: RemoteViewMode) => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ session, viewMode, onChange }) => (
  <div className="flex w-full max-w-md items-center gap-1 rounded-xl bg-slate-950/80 p-1 border border-slate-600" role="tablist" aria-label="Remote control view">
    <button
      type="button"
      role="tab"
      aria-selected={viewMode === 'self'}
      onClick={() => onChange('self')}
      className={`flex-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${
        viewMode === 'self' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'
      }`}
    >
      My View
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={viewMode === 'remote'}
      onClick={() => onChange('remote')}
      className={`flex-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold truncate ${
        viewMode === 'remote' ? 'bg-amber-500 text-slate-900 shadow' : 'text-slate-400 hover:text-white'
      }`}
    >
      {session.controlledName}
    </button>
  </div>
);
