import React from 'react';
import type { RemoteCursorState } from '../types';

interface RemoteCursorOverlayProps {
  cursor: RemoteCursorState | null;
}

export const RemoteCursorOverlay: React.FC<RemoteCursorOverlayProps> = ({ cursor }) => {
  if (!cursor?.visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-[70]"
      style={{
        left: `${cursor.x * 100}%`,
        top: `${cursor.y * 100}%`,
        transform: 'translate(-2px, -2px)',
        transition: 'left 50ms linear, top 50ms linear',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path d="M2 2 L2 14 L6 10 L10 16 L12 15 L8 9 L14 9 Z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
      </svg>
      <span className="ml-3 -mt-1 inline-block rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900 whitespace-nowrap">
        {cursor.label}
      </span>
    </div>
  );
};
