/** Map workspace language setting to document lang/dir (app shell presentation). */

export function applyWorkspaceLanguage(language?: string | null): void {
  if (typeof document === 'undefined') return;
  const raw = String(language || 'English').trim().toLowerCase();
  const isArabic =
    raw === 'arabic' ||
    raw === 'ar' ||
    raw.startsWith('ar-') ||
    raw.includes('عربي');
  const html = document.documentElement;
  html.lang = isArabic ? 'ar' : 'en';
  html.dir = isArabic ? 'rtl' : 'ltr';
}
