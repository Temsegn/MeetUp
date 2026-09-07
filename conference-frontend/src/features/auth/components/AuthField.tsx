import React from 'react';
import { Mail, Lock, User, Building2, Eye, EyeOff, ChevronDown } from 'lucide-react';

type IconKey = 'email' | 'lock' | 'user' | 'building';

type Props = {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder: string;
  autoComplete?: string;
  error?: string;
  icon: IconKey;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
  onChange: (value: string) => void;
  required?: boolean;
};

const ICONS: Record<IconKey, React.ReactNode> = {
  email: <Mail size={18} strokeWidth={1.75} />,
  lock: <Lock size={18} strokeWidth={1.75} />,
  user: <User size={18} strokeWidth={1.75} />,
  building: <Building2 size={18} strokeWidth={1.75} />,
};

export const AuthField: React.FC<Props> = ({
  id,
  label,
  type = 'text',
  value,
  placeholder,
  autoComplete,
  error,
  icon,
  showPasswordToggle,
  passwordVisible,
  onTogglePassword,
  onChange,
  required,
}) => (
  <div className="auth-field">
    <label className="auth-label" htmlFor={id}>
      {label}
    </label>
    <div className="auth-input-wrap">
      <span className="auth-input-icon" aria-hidden>
        {ICONS[icon]}
      </span>
      <input
        id={id}
        className={`auth-input${error ? ' auth-input--error' : ''}`}
        type={showPasswordToggle ? (passwordVisible ? 'text' : 'password') : type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {showPasswordToggle && (
        <button
          type="button"
          className="auth-input-toggle"
          onClick={onTogglePassword}
          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
        >
          {passwordVisible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      )}
    </div>
    {error && (
      <p id={`${id}-error`} className="auth-field-error">
        {error}
      </p>
    )}
  </div>
);

export const AuthSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onChange: (value: string) => void;
}> = ({ id, label, value, placeholder, options, onChange }) => (
  <div className="auth-field">
    <label className="auth-label" htmlFor={id}>
      {label}
    </label>
    <div className="auth-input-wrap">
      <select
        id={id}
        className="auth-input auth-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="auth-select-chevron" aria-hidden>
        <ChevronDown size={18} strokeWidth={1.75} />
      </span>
    </div>
  </div>
);
