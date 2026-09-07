import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../../lib/cn';

export type RowAction = {
  label: string;
  onClick?: () => void;
  danger?: boolean;
};

type Props = {
  actions: RowAction[];
  align?: 'left' | 'right';
  className?: string;
};

/** Compact ⋯ menu for meeting / recording rows. */
export function RowActionsMenu({ actions, align = 'right', className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
        aria-label="More actions"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-40 mt-1 min-w-[148px] overflow-hidden rounded-lg border border-[#E8ECF1] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-[#F5F7FA]',
                a.danger ? 'text-[#DF1E39]' : 'text-[#151D2B]',
              )}
              onClick={() => {
                a.onClick?.();
                setOpen(false);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
