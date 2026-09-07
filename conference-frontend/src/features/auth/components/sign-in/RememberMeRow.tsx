import React from 'react';
import { Link } from 'react-router-dom';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const RememberMeRow: React.FC<Props> = ({ checked, onChange }) => (
  <div className="mb-2.5 flex items-center justify-between gap-2">
    <label className="inline-flex cursor-pointer items-center gap-2 text-[0.75rem] text-[#62748E] select-none">
      <input
        type="checkbox"
        className="size-3.5 cursor-pointer rounded-[2px] border border-[#767676] accent-[#0056EF]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {SIGN_IN_COPY.rememberMe}
    </label>
    <Link
      className="whitespace-nowrap text-[0.75rem] font-semibold text-[#0056EF] hover:underline"
      to="/auth/forgot-password"
    >
      {SIGN_IN_COPY.forgotPassword}
    </Link>
  </div>
);
