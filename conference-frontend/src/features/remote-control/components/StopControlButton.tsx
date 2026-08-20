import React from 'react';

interface StopControlButtonProps {
  label: string;
  onClick: () => void;
}

export const StopControlButton: React.FC<StopControlButtonProps> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium"
  >
    {label}
  </button>
);
