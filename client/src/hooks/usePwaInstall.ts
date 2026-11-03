import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

/** The browser's deferred `beforeinstallprompt` event. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallState =
  | 'unsupported'   // browser doesn't support installation at all
  | 'already'       // app is already installed / running standalone
  | 'ios'           // iOS Safari — manual share-sheet instructions required
  | 'ready'         // Android/Chromium — deferred prompt available, ready to trigger
  | 'installing'    // user clicked install, prompt shown, waiting for choice
  | 'installed'     // user accepted; app was installed this session
  | 'dismissed';    // user dismissed the prompt

// ── Helpers ───────────────────────────────────────────────────────────────────

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ reports as "MacIntel" but has maxTouchPoints > 1
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** Returns true when the app is already running as an installed PWA. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UsePwaInstallReturn {
  /** Current installation state. */
  state: InstallState;
  /** Trigger the native install prompt (Android/Chromium) or show iOS instructions. */
  triggerInstall: () => Promise<void>;
  /** Whether showing the install button makes sense in the current context. */
  showButton: boolean;
  /** True while the native prompt is open. */
  installing: boolean;
  /** Whether to show iOS manual instructions overlay. */
  showIosInstructions: boolean;
  /** Dismiss the iOS instructions overlay. */
  dismissIosInstructions: () => void;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>(() => {
    // Determine initial state synchronously so we don't flash the button
    if (typeof window === 'undefined') return 'unsupported';
    if (isStandalone()) return 'already';
    if (isIos() && isSafari()) return 'ios';
    // 'ready' is set later when beforeinstallprompt fires; start as 'unsupported'
    return 'unsupported';
  });
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // Already-installed or iOS — nothing to set up
    if (state === 'already' || state === 'ios' || state === 'installed') return;

    // Check standalone again after mount (covers some edge cases)
    if (isStandalone()) {
      setState('already');
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // suppress the automatic mini-infobar
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setState('ready');
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setState('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
    // Run only once on mount — intentionally empty dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerInstall = useCallback(async () => {
    // ── iOS: show manual instructions
    if (state === 'ios') {
      setShowIosInstructions(true);
      return;
    }

    // ── Android / Chromium: fire native prompt
    if (state !== 'ready' || !deferredPrompt.current) return;

    setState('installing');
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      setState(outcome === 'accepted' ? 'installed' : 'dismissed');
    } catch {
      // Prompt can throw if called too many times or at an unexpected time
      setState('ready');
    }
  }, [state]);

  const dismissIosInstructions = useCallback(() => {
    setShowIosInstructions(false);
  }, []);

  const showButton =
    state === 'ready' ||
    state === 'ios' ||
    state === 'dismissed'; // allow retry after dismiss

  return {
    state,
    triggerInstall,
    showButton,
    installing: state === 'installing',
    showIosInstructions,
    dismissIosInstructions,
  };
}
