import { useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { BackgroundEffect } from '../../media/hooks/useBackgroundEffect';

type Props = {
  effect: BackgroundEffect;
  onSelect: (effect: BackgroundEffect) => void;
  onClose: () => void;
};

const PRESET_COLORS = [
  { label: 'Midnight', color: '#0f172a' },
  { label: 'Navy', color: '#1e3a5f' },
  { label: 'Forest', color: '#14532d' },
  { label: 'Plum', color: '#4a044e' },
  { label: 'Stone', color: '#374151' },
  { label: 'Slate', color: '#1e293b' },
  { label: 'Rose', color: '#881337' },
  { label: 'Teal', color: '#134e4a' },
];

const PRESET_IMAGES = [
  {
    label: 'Office',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80&auto=format&fit=crop',
  },
  {
    label: 'Library',
    url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1280&q=80&auto=format&fit=crop',
  },
  {
    label: 'Nature',
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1280&q=80&auto=format&fit=crop',
  },
  {
    label: 'City',
    url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80&auto=format&fit=crop',
  },
];

function isActive(effect: BackgroundEffect, candidate: BackgroundEffect): boolean {
  if (effect.kind !== candidate.kind) return false;
  if (effect.kind === 'color' && candidate.kind === 'color')
    return effect.color === candidate.color;
  if (effect.kind === 'image' && candidate.kind === 'image')
    return effect.url === candidate.url;
  return true;
}

export function BackgroundEffectPicker({ effect, onSelect, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect({ kind: 'image', url });
    // Revoke after 5 minutes to avoid memory leaks.
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    // Reset input so the same file can be re-selected.
    e.target.value = '';
  };

  return (
    <div className="w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#151D2B]">Background</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#334155]"
          aria-label="Close background picker"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* None + Blur */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
        Blur
      </p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(
          [
            { kind: 'none' as const, label: 'None' },
            { kind: 'blur-light' as const, label: 'Light blur' },
            { kind: 'blur-strong' as const, label: 'Strong blur' },
          ] satisfies Array<{ kind: BackgroundEffect['kind']; label: string }>
        ).map((opt) => {
          const candidate: BackgroundEffect = { kind: opt.kind } as BackgroundEffect;
          const active = isActive(effect, candidate);
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => onSelect(candidate)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition',
                active
                  ? 'border-[#016BE6] bg-[#EBF4FF]'
                  : 'border-[#E8ECF1] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-lg text-[18px]',
                  opt.kind === 'none' && 'bg-[#F1F5F9]',
                  opt.kind === 'blur-light' && 'bg-gradient-to-br from-[#94A3B8]/30 to-[#64748B]/30 backdrop-blur-sm',
                  opt.kind === 'blur-strong' && 'bg-gradient-to-br from-[#94A3B8]/60 to-[#64748B]/60',
                )}
              >
                {opt.kind === 'none' ? '✕' : opt.kind === 'blur-light' ? '≈' : '≋'}
              </span>
              <span className={cn('text-[10px] font-medium', active ? 'text-[#016BE6]' : 'text-[#64748B]')}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Solid colours */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
        Colour
      </p>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {PRESET_COLORS.map(({ label, color }) => {
          const candidate: BackgroundEffect = { kind: 'color', color };
          const active = isActive(effect, candidate);
          return (
            <button
              key={color}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onSelect(candidate)}
              className={cn(
                'h-10 w-full rounded-lg border-2 transition',
                active ? 'border-[#016BE6] ring-2 ring-[#016BE6]/30' : 'border-transparent hover:border-[#CBD5E1]',
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>

      {/* Virtual backgrounds */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
        Virtual background
      </p>
      <div className="grid grid-cols-4 gap-2">
        {PRESET_IMAGES.map(({ label, url }) => {
          const candidate: BackgroundEffect = { kind: 'image', url };
          const active = isActive(effect, candidate);
          return (
            <button
              key={url}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onSelect(candidate)}
              className={cn(
                'relative h-12 w-full overflow-hidden rounded-lg border-2 transition',
                active ? 'border-[#016BE6] ring-2 ring-[#016BE6]/30' : 'border-transparent hover:border-[#CBD5E1]',
              )}
            >
              <img
                src={url}
                alt={label}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </button>
          );
        })}

        {/* Custom upload */}
        <button
          type="button"
          title="Upload custom background"
          aria-label="Upload custom background"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-[#CBD5E1] text-[#94A3B8] transition hover:border-[#016BE6] hover:text-[#016BE6]"
        >
          <span className="text-base leading-none">+</span>
          <span className="text-[9px] font-medium">Upload</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCustomImage}
      />
    </div>
  );
}
