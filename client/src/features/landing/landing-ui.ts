/** Shared landing classes — match app / login blue–white system. */

export const LP_PRIMARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#016BE6] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0059C4] disabled:opacity-60';

export const LP_GHOST =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D7DEE8] bg-white/90 px-5 text-[14px] font-semibold text-[#243044] transition-colors hover:bg-white disabled:opacity-60';

export const LP_NAV_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#016BE6] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0059C4]';

export const LP_CARD =
  'rounded-2xl border border-[#E6EBF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export const LP_ICON =
  'inline-flex size-11 items-center justify-center rounded-full bg-[#EAF2FF] text-[#016BE6]';

export const LP_EYEBROW =
  'text-[12px] font-semibold uppercase tracking-[0.14em] text-[#016BE6]';

export const LP_H2 =
  'lp-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold tracking-[-0.03em] text-[#0F172A]';

export const LP_BODY = 'text-[16px] leading-[1.7] text-[#5B677A]';

export const LP_SECTION = 'scroll-mt-24 py-20 sm:py-28';

export const LP_SECTION_SOFT = `${LP_SECTION} relative overflow-hidden bg-[#F3F8FF]`;

export const LP_SECTION_WHITE = `${LP_SECTION} relative overflow-hidden bg-white`;

/** Soft blue circular washes — same language as login promo, no images. */
export function LandingBlueWash({ variant = 'light' }: { variant?: 'light' | 'brand' | 'deep' }) {
  if (variant === 'brand') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(165deg, #1A8CFF 0%, #0B74F0 40%, #016BE6 75%, #0058D0 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 440px 340px at 12% 18%, rgba(255,255,255,0.26) 0%, transparent 55%)',
              'radial-gradient(ellipse 400px 320px at 88% 12%, rgba(255,255,255,0.16) 0%, transparent 52%)',
              'radial-gradient(ellipse 480px 360px at 80% 80%, rgba(150,205,255,0.32) 0%, transparent 55%)',
              'radial-gradient(ellipse 360px 300px at 8% 88%, rgba(255,255,255,0.12) 0%, transparent 50%)',
            ].join(', '),
          }}
        />
      </div>
    );
  }

  if (variant === 'deep') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[#0B1220]" />
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 700px 400px at 50% -10%, rgba(1,107,230,0.45) 0%, transparent 60%)',
              'radial-gradient(ellipse 420px 320px at 10% 90%, rgba(1,107,230,0.18) 0%, transparent 55%)',
              'radial-gradient(ellipse 380px 280px at 90% 70%, rgba(26,140,255,0.2) 0%, transparent 50%)',
            ].join(', '),
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#EEF6FF_0%,#F7FAFF_45%,#FFFFFF_100%)]" />
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 900px 480px at 85% -8%, rgba(1,107,230,0.16) 0%, transparent 58%)',
            'radial-gradient(ellipse 640px 400px at 8% 95%, rgba(1,107,230,0.1) 0%, transparent 55%)',
            'radial-gradient(ellipse 420px 300px at 50% 40%, rgba(26,140,255,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
      />
    </div>
  );
}
