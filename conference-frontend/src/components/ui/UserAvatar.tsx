import { cn } from '../../lib/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<Size, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-[12px]',
  lg: 'size-10 text-[14px]',
  xl: 'size-16 text-[20px]',
};

export function initialsFromName(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function colorFromName(name?: string | null): string {
  const s = name ?? 'user';
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 58%, 48%)`;
}

type Props = {
  name?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: Size;
  className?: string;
  ring?: boolean;
};

/**
 * Profile photo when available; otherwise initials on a stable color circle.
 */
export function UserAvatar({
  name,
  avatarUrl,
  avatarColor,
  size = 'md',
  className,
  ring = false,
}: Props) {
  const initials = initialsFromName(name);
  const bg = avatarColor || colorFromName(name);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        SIZE[size],
        ring && 'ring-2 ring-white',
        className,
      )}
      style={avatarUrl ? undefined : { backgroundColor: bg }}
      title={name ?? undefined}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
