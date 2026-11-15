export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rotor_clash_theme';
const META_COLORS: Record<Theme, string> = { light: '#F5EFE0', dark: '#0F1D26' };

export function loadSavedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Applies the theme to <html> and the browser/PWA chrome colour. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', META_COLORS[theme]));
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable (private mode) — theme still applies for this session */
  }
}

export function resolveInitialTheme(): Theme {
  return loadSavedTheme() ?? systemTheme();
}
