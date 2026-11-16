import { useEffect, useRef, useState } from 'react';
import { Ban, Loader2, Upload, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type {
  BackgroundEffect,
  BackgroundProcessorStatus,
} from '../../media/hooks/useBackgroundEffect';

type Props = {
  effect: BackgroundEffect;
  onSelect: (effect: BackgroundEffect) => void;
  onClose: () => void;
  status?: BackgroundProcessorStatus;
  error?: string | null;
  /** Called on mount so the AI model starts downloading before a choice is made. */
  onOpen?: () => void;
  className?: string;
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

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const PRESET_IMAGES = [
  { label: 'Office', id: 'photo-1497366216548-37526070297c' },
  { label: 'Library', id: 'photo-1507842217343-583bb7270b66' },
  { label: 'Nature', id: 'photo-1472214103451-9374bd1c798e' },
  { label: 'City', id: 'photo-1477959858617-67f85cf4f1df' },
  { label: 'Living room', id: 'photo-1586023492125-27b2c045efd7' },
  { label: 'Beach', id: 'photo-1507525428034-b723cf961d3e' },
  { label: 'Mountains', id: 'photo-1464822759023-fed622ff2c3b' },
].map((p) => ({ label: p.label, url: unsplash(p.id, 1920), thumb: unsplash(p.id, 240) }));

const UPLOAD_KEY = 'samtal:background-upload';
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Downscale an uploaded photo to ≤1920px JPEG data URL (persistable, no blob revocation). */
async function fileToBackgroundDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}

function loadUpload(): string | null {
  try {
    return localStorage.getItem(UPLOAD_KEY);
  } catch {
    return null;
  }
}

function isSelected(effect: BackgroundEffect, candidate: BackgroundEffect): boolean {
  if (effect.kind !== candidate.kind) return false;
  if (effect.kind === 'color' && candidate.kind === 'color') return effect.color === candidate.color;
  if (effect.kind === 'image' && candidate.kind === 'image') return effect.url === candidate.url;
  return true;
}

const tileClass = (active: boolean) =>
  cn(
    'relative h-12 w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#016BE6]/40',
    active ? 'border-[#016BE6] ring-2 ring-[#016BE6]/30' : 'border-transparent hover:border-[#CBD5E1]',
  );

const sectionLabel = 'mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]';

export function BackgroundEffectPicker({
  effect,
  onSelect,
  onClose,
  status = 'idle',
  error = null,
  onOpen,
  className,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<string | null>(loadUpload);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onOpen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCustomImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Choose an image file');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Image is too large (max 15 MB)');
      return;
    }
    setUploading(true);
    try {
      const url = await fileToBackgroundDataUrl(file);
      setUpload(url);
      try {
        localStorage.setItem(UPLOAD_KEY, url);
      } catch {
        /* too big for storage — still usable this session */
      }
      onSelect({ kind: 'image', url });
    } catch {
      setUploadError('Could not read that image');
    } finally {
      setUploading(false);
    }
  };

  const busy = status === 'loading' && effect.kind !== 'none';
  const message = uploadError ?? error;

  return (
    <div
      role="dialog"
      aria-label="Backgrounds and effects"
      className={cn(
        'w-[min(340px,calc(100vw-1.5rem))] rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#151D2B]">Backgrounds</h3>
          <p className="flex items-center gap-1 text-[11px] text-[#8A94A6]" aria-live="polite">
            {busy ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Loading AI segmentation…
              </>
            ) : (
              'Only you see the original background'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#334155]"
          aria-label="Close background picker"
        >
          <X className="size-4" />
        </button>
      </div>

      {message ? (
        <p role="alert" className="mb-3 rounded-lg bg-[#FEF2F2] px-2.5 py-1.5 text-[11px] text-[#B91C1C]">
          {message}
        </p>
      ) : null}

      <div className="max-h-[min(60svh,460px)] overflow-y-auto overscroll-contain pr-0.5">
        <p className={sectionLabel}>Effects</p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(
            [
              { kind: 'none', label: 'Off' },
              { kind: 'blur-light', label: 'Slight blur' },
              { kind: 'blur-strong', label: 'Blur' },
            ] as const
          ).map((opt) => {
            const candidate = { kind: opt.kind } as BackgroundEffect;
            const active = isSelected(effect, candidate);
            return (
              <button
                key={opt.kind}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(candidate)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition',
                  active
                    ? 'border-[#016BE6] bg-[#EBF4FF]'
                    : 'border-[#E8ECF1] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
                )}
              >
                <span className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-lg bg-[#F1F5F9]">
                  {opt.kind === 'none' ? (
                    <Ban className="size-4 text-[#64748B]" />
                  ) : (
                    <>
                      <img
                        src={PRESET_IMAGES[0].thumb}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ filter: `blur(${opt.kind === 'blur-light' ? 1.5 : 4}px)` }}
                        draggable={false}
                      />
                      <span className="relative size-5 rounded-full bg-white/90 shadow" />
                    </>
                  )}
                </span>
                <span className={cn('text-[10px] font-medium', active ? 'text-[#016BE6]' : 'text-[#64748B]')}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className={sectionLabel}>Backgrounds</p>
        <div className="mb-3 grid grid-cols-4 gap-2">
          <button
            type="button"
            title="Upload a background"
            aria-label="Upload a background"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-[#CBD5E1] text-[#94A3B8] transition hover:border-[#016BE6] hover:text-[#016BE6] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span className="text-[9px] font-medium">Upload</span>
          </button>

          {upload ? (
            <button
              type="button"
              title="Your background"
              aria-label="Your uploaded background"
              aria-pressed={isSelected(effect, { kind: 'image', url: upload })}
              onClick={() => onSelect({ kind: 'image', url: upload })}
              className={tileClass(isSelected(effect, { kind: 'image', url: upload }))}
            >
              <img src={upload} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ) : null}

          {PRESET_IMAGES.map(({ label, url, thumb }) => {
            const candidate: BackgroundEffect = { kind: 'image', url };
            const active = isSelected(effect, candidate);
            return (
              <button
                key={url}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => onSelect(candidate)}
                className={tileClass(active)}
              >
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
                {active && busy ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="size-4 animate-spin text-white" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className={sectionLabel}>Colours</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map(({ label, color }) => {
            const candidate: BackgroundEffect = { kind: 'color', color };
            const active = isSelected(effect, candidate);
            return (
              <button
                key={color}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => onSelect(candidate)}
                className={cn(tileClass(active), 'h-9')}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => void handleCustomImage(e)}
      />
    </div>
  );
}
