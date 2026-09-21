import React from 'react';
import type { ActiveControlSession, RemoteViewMode } from '../types';

interface ViewSwitcherProps {
  session: ActiveControlSession;
  viewMode: RemoteViewMode;
  onChange: (view: RemoteViewMode) => void;
  /** Local label — defaults to "Me". */
  selfLabel?: string;
}

/**
 * Switch whose screen/UI you are driving while remote controlling.
 * "Me" = your own view; other tab = controlled person's name.
 */
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  session,
  viewMode,
  onChange,
  selfLabel = 'Me',
}) => (
  <div
    className="inline-flex items-center gap-1 rounded-xl border border-[#E0E7EE] bg-[#F0F5FA] p-1"
    role="tablist"
    aria-label="Whose screen to control"
  >
    <button
      type="button"
      role="tab"
      aria-selected={viewMode === 'self'}
      onClick={() => onChange('self')}
      className={`min-w-[72px] rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
        viewMode === 'self'
          ? 'bg-white text-[#121B29] shadow-sm'
          : 'text-[#667383] hover:text-[#121B29]'
      }`}
    >
      {selfLabel}
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={viewMode === 'remote'}
      onClick={() => onChange('remote')}
      title={session.controlledName}
      className={`max-w-[140px] truncate rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
        viewMode === 'remote'
          ? 'bg-[#076BEE] text-white shadow-sm'
          : 'text-[#667383] hover:text-[#121B29]'
      }`}
    >
      {session.controlledName}
    </button>
  </div>
);
