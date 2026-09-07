import React from 'react';
import { AUTH_COPY } from '../../constants/auth.constants';

type Props = {
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
};

export const SignUpTermsRow: React.FC<Props> = ({ checked, error, onChange }) => {
  const c = AUTH_COPY.signUp;

  return (
    <div className="pt-0.5">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 size-3.5 cursor-pointer accent-[#0056EF]"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-[0.75rem] leading-snug text-[#62748E]">
          {c.termsPrefix}
          <a href="#terms" className="font-medium text-[#0056EF] hover:underline">
            {c.termsOfService}
          </a>
          {c.termsAnd}
          <a href="#privacy" className="font-medium text-[#0056EF] hover:underline">
            {c.privacyPolicy}
          </a>
        </span>
      </label>
      {error ? (
        <p className="mt-1 text-[0.6875rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
