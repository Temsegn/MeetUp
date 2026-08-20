import React from 'react';
import type { RemoteUiCommand } from '../types';

interface RemoteControlCommandBarProps {
  onSend: (actionType: RemoteUiCommand, payload?: Record<string, unknown>) => void;
}

export const RemoteControlCommandBar: React.FC<RemoteControlCommandBarProps> = ({ onSend }) => (
  <div className="flex-shrink-0 z-40 px-3 py-1 bg-slate-900/90 border-b border-slate-700 flex items-center gap-2 overflow-x-auto">
    <span className="text-[10px] uppercase tracking-wider text-slate-400 flex-shrink-0">Send to their UI</span>
    <button
      type="button"
      className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
      onClick={() => onSend('OPEN_CHAT')}
    >
      Open chat
    </button>
    <button
      type="button"
      className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
      onClick={() => onSend('OPEN_PARTICIPANTS')}
    >
      Open people
    </button>
    <button
      type="button"
      className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
      onClick={() => onSend('CHANGE_LAYOUT', { layout: 'gallery' })}
    >
      Gallery
    </button>
    <button
      type="button"
      className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
      onClick={() => onSend('CHANGE_LAYOUT', { layout: 'presentation' })}
    >
      Presentation
    </button>
  </div>
);
