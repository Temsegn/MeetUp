import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { RequestControlButton } from './RequestControlButton';

interface ParticipantControlMenuProps {
  participantName: string;
  pending?: boolean;
  disabled?: boolean;
  onRequestControl: () => void;
}

export const ParticipantControlMenu: React.FC<ParticipantControlMenuProps> = ({
  participantName,
  pending,
  disabled,
  onRequestControl,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Actions for ${participantName}`}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-1">
          <RequestControlButton
            pending={pending}
            disabled={disabled}
            onClick={() => {
              onRequestControl();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
