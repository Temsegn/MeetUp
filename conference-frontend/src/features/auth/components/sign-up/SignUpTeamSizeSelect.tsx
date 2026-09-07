import React from 'react';
import { cn } from '../../../../lib/cn';
import { AUTH_COPY } from '../../constants/auth.constants';

type Props = {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export const SignUpTeamSizeSelect: React.FC<Props> = ({ id, value, error, onChange }) => {
  const c = AUTH_COPY.signUp;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.75rem] font-semibold text-[#1C2842]">
        {c.teamSizeLabel}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-9 w-full cursor-pointer appearance-none rounded-[10px] border border-[#E2E8F0] bg-white px-3 pr-9 text-[0.8125rem] outline-none transition-colors hover:border-slate-300 focus:border-[#0056EF] focus:shadow-[0_0_0_2px_rgba(0,86,239,0.12)]',
            value ? 'text-[#1C2842]' : 'text-[#62748E]',
            error && 'border-red-600',
          )}
        >
          <option value="" disabled>
            {c.teamSizePlaceholder}
          </option>
          {AUTH_COPY.teamSizes.map((size) => (
            <option key={size} value={size} className="text-[#1C2842]">
              {size}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-[#62748E]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error ? (
        <p className="mt-1 text-[0.6875rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
