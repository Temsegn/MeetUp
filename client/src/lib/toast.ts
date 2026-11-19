/**
 * Non-blocking toast for error / info messages (replaces window.alert, which
 * freezes the page and looks out of place). Framework-free so any handler can
 * call it without context plumbing. Announced to screen readers.
 */
type Tone = 'error' | 'info';

const CONTAINER_ID = 'samtal-toasts';
const DURATION_MS = 5000;

function container(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.setAttribute('aria-live', 'assertive');
    el.className =
      'pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4';
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message: string, tone: Tone = 'error'): void {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  toast.className = [
    'pointer-events-auto max-w-md cursor-pointer rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-opacity duration-300',
    tone === 'error' ? 'bg-[#B91C1C] text-white' : 'bg-[#151D2B] text-white',
  ].join(' ');
  toast.textContent = message;
  const remove = () => {
    toast.style.opacity = '0';
    window.setTimeout(() => toast.remove(), 300);
  };
  toast.addEventListener('click', remove);
  container().appendChild(toast);
  window.setTimeout(remove, DURATION_MS);
}
