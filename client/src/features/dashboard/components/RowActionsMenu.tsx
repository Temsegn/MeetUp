import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * Compact ⋯ menu for meeting / recording rows.
 *
 * The menu is portalled to <body> with fixed positioning so table wrappers
 * with overflow-hidden / overflow-x-auto can't clip it, and it flips above
 * the button when there isn't room below (e.g. the last row of a list).
 */
export function RowActionsMenu({ actions, align = 'right', className }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const place = useCallback(() => {
    const btn = buttonRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const below = r.bottom + GAP;
    const above = r.top - GAP - mh;
    const top =
      below + mh <= vh - VIEWPORT_MARGIN || above < VIEWPORT_MARGIN
        ? Math.min(below, vh - VIEWPORT_MARGIN - mh)
        : above;

    let left = align === 'right' ? r.right - mw : r.left;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - VIEWPORT_MARGIN - mw));
    setPos({ top: Math.max(VIEWPORT_MARGIN, top), left });
  }, [align]);

  // Measure after the menu renders (hidden) so we know its real size.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // A fixed menu would drift from its row on scroll — close it instead.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
        aria-label="More actions"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{
                position: 'fixed',
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                visibility: pos ? 'visible' : 'hidden',
              }}
              className="z-[70] min-w-[148px] overflow-hidden rounded-lg border border-[#E8ECF1] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
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
                    setOpen(false);
                    a.onClick?.();
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
