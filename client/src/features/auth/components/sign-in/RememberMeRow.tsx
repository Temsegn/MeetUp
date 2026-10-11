import React from 'react';
import { Link } from 'react-router-dom';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const RememberMeRow: React.FC<Props> = ({ checked, onChange }) => (
  <div className="mb-5 flex items-center justify-between gap-2">
    <label className="inline-flex cursor-pointer items-center gap-2 text-[0.875rem] text-[#64748B] select-none">
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded border border-[#CBD5E1] accent-[#016BE6]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {SIGN_IN_COPY.rememberMe}
    </label>
    <Link
      className="whitespace-nowrap text-[0.875rem] font-semibold text-[#016BE6] hover:underline"
      to="/auth/forgot-password"
    >
      {SIGN_IN_COPY.forgotPassword}
    </Link>
  </div>
);
