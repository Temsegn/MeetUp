import React from 'react';
import type { IncomingControlRequest } from '../types';

interface ControlRequestDialogProps {
  request: IncomingControlRequest;
  roomId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const ControlRequestDialog: React.FC<ControlRequestDialogProps> = ({
  request,
  roomId,
  onAccept,
  onDecline,
}) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div
      role="dialog"
      aria-labelledby="rc-request-title"
      className="relative w-full max-w-md bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6"
    >
      <p className="text-xs uppercase tracking-wider text-blue-400 mb-2">Remote control request</p>
      <h2 id="rc-request-title" className="text-lg font-semibold text-white mb-2">
        {request.requesterName} wants to control your meeting interface
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        This is limited to this meeting ({roomId}). They cannot control your computer, files, or browser
        outside MeetUp. You can revoke access at any time.
      </p>
      <p className="text-xs text-slate-400 mb-4">
        Requested actions: open/close chat and people, change layout, select a participant, scroll
        panels, mute/camera, screen share, raise hand.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onDecline}
          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
);
