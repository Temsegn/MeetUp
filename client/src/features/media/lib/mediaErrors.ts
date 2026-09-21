/** User-facing getUserMedia failures. Browsers only prompt in a secure context. */

export function canUseGetUserMedia(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export function isSecureMediaContext(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext) return true;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function describeMediaError(err: unknown): string {
  if (!canUseGetUserMedia() || !isSecureMediaContext()) {
    return 'This browser will not ask for camera or microphone on an insecure page. Open the meeting over HTTPS (or localhost). HTTP on a public IP is blocked.';
  }

  const name =
    err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera or microphone was blocked. Use Allow camera and microphone, then choose Allow in the browser prompt.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera or microphone was found. Connect a device and try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera or microphone is already in use by another application.';
  }
  if (name === 'OverconstrainedError') {
    return 'The selected camera or microphone is not available.';
  }
  if (name === 'SecurityError') {
    return 'The browser blocked camera and microphone on this page.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not access camera or microphone. Allow access when the browser asks, then try again.';
}
