import { useEffect } from 'react';
import { usePwaInstall } from '../../../hooks/usePwaInstall';

// ── iOS Instructions Overlay ──────────────────────────────────────────────────

function IosInstructionsOverlay({ onDismiss }: { onDismiss: () => void }) {
  // Close on Escape key or click outside the sheet
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install Samtal on iOS"
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 mx-4 mb-6 w-full max-w-sm rounded-2xl border border-[#E6EBF2] bg-white p-6 shadow-2xl sm:mb-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192x192.png" alt="Samtal" className="size-12 rounded-xl" />
          <div>
            <p className="text-[15px] font-semibold text-[#0F172A]">Install Samtal</p>
            <p className="text-[12px] text-[#5B677A]">Add to Home Screen</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto flex size-8 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <hr className="my-4 border-[#E6EBF2]" />

        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[11px] font-bold text-[#016BE6]">1</span>
            <p className="text-[14px] leading-relaxed text-[#374151]">
              Tap the{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-[#016BE6]">
                Share
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684 6.632 3.316m-6.632-6 6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684Zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>{' '}
              button at the bottom of Safari.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[11px] font-bold text-[#016BE6]">2</span>
            <p className="text-[14px] leading-relaxed text-[#374151]">
              Scroll down and tap <span className="font-semibold text-[#0F172A]">"Add to Home Screen"</span>.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[11px] font-bold text-[#016BE6]">3</span>
            <p className="text-[14px] leading-relaxed text-[#374151]">
              Tap <span className="font-semibold text-[#0F172A]">"Add"</span> to confirm.
            </p>
          </li>
        </ol>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-[#016BE6] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0059C4] active:bg-[#004BB0]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Install App Button ────────────────────────────────────────────────────────

interface InstallAppButtonProps {
  /**
   * 'nav'         — compact nav-bar style (desktop header, before language switcher)
   * 'mobile-menu' — full-width row inside the mobile drawer
   * 'ghost'       — standalone ghost button (hero / default)
   */
  variant?: 'ghost' | 'nav' | 'mobile-menu';
  /** Called after the install prompt is triggered (e.g. close the mobile drawer). */
  onInstall?: () => void;
  className?: string;
}

/**
 * PWA install button.
 *
 * Placement:
 *   Desktop nav  → variant="nav"         — sits before the EN/AR switcher
 *   Mobile menu  → variant="mobile-menu" — full-width row before the language buttons
 *   Hero row     → variant="ghost"        — fallback / standalone use
 *
 * Returns null when: already installed, running standalone, or browser is unsupported.
 */
export function InstallAppButton({ variant = 'ghost', onInstall, className = '' }: InstallAppButtonProps) {
  const { triggerInstall, showButton, installing, showIosInstructions, dismissIosInstructions } =
    usePwaInstall();

  if (!showButton) return null;

  async function handleClick() {
    await triggerInstall();
    onInstall?.();
  }

  // ── nav variant: compact button matching the nav row height ──────────────
  if (variant === 'nav') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          aria-label="Download Samtal app"
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D7DEE8] bg-white/90 px-3 text-[12px] font-semibold text-[#243044] transition-colors hover:bg-white active:bg-[#F1F5F9] disabled:opacity-60 ${className}`}
        >
          {installing ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <img src="/icons/icon-192x192.png" alt="" aria-hidden="true" className="size-4 rounded-[3px] object-contain" />
          )}
          {/* Desktop always says "Download App" in the nav */}
          Download App
        </button>
        {showIosInstructions && <IosInstructionsOverlay onDismiss={dismissIosInstructions} />}
      </>
    );
  }

  // ── mobile-menu variant: full-width row ───────────────────────────────────
  if (variant === 'mobile-menu') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          aria-label="Download Samtal app"
          className={`flex w-full items-center gap-2.5 rounded-xl border border-[#D7DEE8] bg-white px-3 py-2.5 text-[14px] font-semibold text-[#243044] transition-colors hover:bg-[#F5F7FA] active:bg-[#EEF3FA] disabled:opacity-60 ${className}`}
        >
          {installing ? (
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <img src="/icons/icon-192x192.png" alt="" aria-hidden="true" className="size-5 rounded-[4px] object-contain" />
          )}
          Download App
          {/* Chevron nudge */}
          <svg viewBox="0 0 24 24" className="ml-auto size-4 text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showIosInstructions && <IosInstructionsOverlay onDismiss={dismissIosInstructions} />}
      </>
    );
  }

  // ── ghost variant (hero / default) ───────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        aria-label="Download Samtal app"
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D7DEE8] bg-white/90 px-5 text-[14px] font-semibold text-[#243044] transition-colors hover:bg-white active:bg-[#F1F5F9] disabled:opacity-60 ${className}`}
      >
        {installing ? (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <img src="/icons/icon-192x192.png" alt="" aria-hidden="true" className="size-5 rounded-[4px] object-contain" />
        )}
        {/* Mobile: "Download App" | Desktop: "Install App" */}
        <span className="sm:hidden">Download App</span>
        <span className="hidden sm:inline">Install App</span>
      </button>
      {showIosInstructions && <IosInstructionsOverlay onDismiss={dismissIosInstructions} />}
    </>
  );
}
