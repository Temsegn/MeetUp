import React from 'react';
import { MonitorSmartphone } from 'lucide-react';

interface RequestControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}

export const RequestControlButton: React.FC<RequestControlButtonProps> = ({
  onClick,
  disabled,
  pending,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || pending}
    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    <MonitorSmartphone size={14} className="text-blue-400" />
    {pending ? 'Control request sent…' : 'Request Control'}
  </button>
);
