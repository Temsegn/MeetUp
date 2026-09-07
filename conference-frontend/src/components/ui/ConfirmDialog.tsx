import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Pencil, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** Optional text field (rename / other input dialogs). */
  input?: {
    label?: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    onChange: (value: string) => void;
  };
  icon?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/** Professional centered dialog for confirm, rename, and other modal actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  input,
  icon,
  onConfirm,
  onClose,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      if (input) {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        confirmRef.current?.focus();
      }
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const confirmDisabled = busy || Boolean(input && !input.value.trim());

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-[2px]"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
          <span
            className={cn(
              'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full',
              danger ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#E8F1FE] text-[#016BE6]',
            )}
          >
            {icon ??
              (danger ? (
                <AlertTriangle className="size-5" strokeWidth={2} />
              ) : (
                <Pencil className="size-5" strokeWidth={2} />
              ))}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-[16px] font-bold tracking-tight text-[#151D2B]">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1.5 text-[13px] leading-relaxed text-[#6F7B8C]">
                {description}
              </p>
            ) : null}
            {input ? (
              <label htmlFor={inputId} className="mt-3 block">
                {input.label ? (
                  <span className="mb-1.5 block text-[11px] font-semibold text-[#6F7B8C]">
                    {input.label}
                  </span>
                ) : null}
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  value={input.value}
                  maxLength={input.maxLength ?? 200}
                  placeholder={input.placeholder}
                  onChange={(e) => input.onChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !busy && input.value.trim()) {
                      e.preventDefault();
                      onConfirm();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-[#E1E7EE] bg-white px-3 text-[13px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15"
                />
              </label>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#F1F4F8] bg-[#FAFBFC] px-5 py-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E1E7EE] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={cn(
              'inline-flex h-9 min-w-[96px] items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60',
              danger
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#016BE6] hover:bg-[#0056EF]',
            )}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Local state helper for rename / prompt dialogs. */
export function usePromptValue(initial = '') {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    setValue(initial);
  }, [initial]);
  return [value, setValue] as const;
}
