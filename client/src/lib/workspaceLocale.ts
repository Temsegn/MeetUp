/**
 * The signed-in app is English. A workspace language of Arabic must not
 * flip the whole screen to right-to-left when Account → Manage is opened.
 */
export function applyWorkspaceLanguage(_language?: string | null): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.lang = 'en';
  html.dir = 'ltr';
}
