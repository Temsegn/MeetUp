import React from 'react';
import { EyeOff } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { AUTH_ASSETS } from '../../constants/auth.assets';

const baseInput =
  'h-9 w-full rounded-[10px] border border-[#E2E8F0] bg-white text-[0.8125rem] leading-normal text-[#1C2842] caret-[#0056EF] outline-none placeholder:text-[#62748E] hover:border-slate-300 focus:border-[#0056EF] focus:shadow-[0_0_0_2px_rgba(0,86,239,0.12)]';

type FieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  iconSrc?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

export const SignUpTextField: React.FC<FieldProps> = ({
  id,
  label,
  value,
  placeholder,
  type = 'text',
  autoComplete,
  error,
  iconSrc,
  required,
  onChange,
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[0.75rem] font-semibold text-[#1C2842]">
      {label}
    </label>
    <div className="relative flex items-center">
      {iconSrc ? (
        <span
          className="pointer-events-none absolute left-3 z-10 flex size-3.5 items-center justify-center"
          aria-hidden
        >
          <img src={iconSrc} alt="" width={14} height={14} className="block size-3.5" />
        </span>
      ) : null}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(baseInput, iconSrc ? 'pr-3 pl-9' : 'px-3', error && 'border-red-600')}
      />
    </div>
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-[0.6875rem] text-red-600" role="alert">
        {error}
      </p>
    ) : null}
  </div>
);

type PasswordProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  visible: boolean;
  hint?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
};

export const SignUpPasswordField: React.FC<PasswordProps> = ({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  error,
  visible,
  hint,
  required,
  onChange,
  onToggleVisible,
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[0.75rem] font-semibold text-[#1C2842]">
      {label}
    </label>
    <div className="relative flex items-center">
      <span
        className="pointer-events-none absolute left-3 z-10 flex size-3.5 items-center justify-center"
        aria-hidden
      >
        <img src={AUTH_ASSETS.lock} alt="" width={14} height={14} className="block size-3.5" />
      </span>
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(baseInput, 'pr-9 pl-9', error && 'border-red-600')}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-2.5 flex size-3.5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#62748E] hover:opacity-80"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOff size={14} strokeWidth={1.75} aria-hidden />
        ) : (
          <img src={AUTH_ASSETS.eye} alt="" width={14} height={14} className="block size-3.5" />
        )}
      </button>
    </div>
    {hint && !error ? (
      <p id={`${id}-hint`} className="mt-1 text-[0.6875rem] text-[#62748E]">
        {hint}
      </p>
    ) : null}
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-[0.6875rem] text-red-600" role="alert">
        {error}
      </p>
    ) : null}
  </div>
);
