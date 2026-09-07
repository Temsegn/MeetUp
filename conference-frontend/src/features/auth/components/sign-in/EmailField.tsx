import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';

type Props = {
  id?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const inputClass =
  'h-9 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3 pl-9 text-[0.8125rem] text-[#1C2842] caret-[#0056EF] outline-none placeholder:text-[#62748E] hover:border-slate-300 focus:border-[#0056EF] focus:shadow-[0_0_0_2px_rgba(0,86,239,0.12)]';

export const EmailField: React.FC<Props> = ({
  id = 'signin-email',
  value,
  error,
  onChange,
}) => (
  <div className="mb-2.5">
    <label className="mb-1 block text-[0.75rem] font-semibold text-[#1C2842]" htmlFor={id}>
      Email address
    </label>
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 z-10 flex size-3.5 items-center justify-center" aria-hidden>
        <img src={AUTH_ASSETS.email} alt="" width={14} height={14} className="block size-3.5" />
      </span>
      <input
        id={id}
        name="email"
        type="email"
        className={`${inputClass}${error ? ' border-red-600' : ''}`}
        placeholder="Enter your email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
    </div>
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-[0.6875rem] text-red-600" role="alert">
        {error}
      </p>
    ) : null}
  </div>
);
