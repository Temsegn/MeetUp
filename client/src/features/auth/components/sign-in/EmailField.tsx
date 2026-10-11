import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';
import { SIGN_IN_COPY } from '../../constants/sign-in.constants';

type Props = {
  id?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const inputClass =
  'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 pl-10 text-[0.9375rem] text-[#0F172A] caret-[#016BE6] outline-none placeholder:text-[#94A3B8] hover:border-slate-300 focus:border-[#016BE6] focus:shadow-[0_0_0_3px_rgba(1,107,230,0.12)]';

export const EmailField: React.FC<Props> = ({
  id = 'signin-email',
  value,
  error,
  onChange,
}) => (
  <div className="mb-3.5">
    <label className="sr-only" htmlFor={id}>
      {SIGN_IN_COPY.emailLabel}
    </label>
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3.5 z-10 flex size-4 items-center justify-center" aria-hidden>
        <img src={AUTH_ASSETS.email} alt="" width={16} height={16} className="block size-4 opacity-60" />
      </span>
      <input
        id={id}
        name="email"
        type="email"
        className={`${inputClass}${error ? ' border-red-600' : ''}`}
        placeholder={SIGN_IN_COPY.emailPlaceholder}
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
    </div>
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
        {error}
      </p>
    ) : null}
  </div>
);
