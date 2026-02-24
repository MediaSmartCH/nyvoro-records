export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'nyvoro-theme-preference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto';
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getInitialThemePreference(): ThemePreference {
  return getStoredThemePreference() ?? 'auto';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme()
): ResolvedTheme {
  if (preference === 'auto') {
    return systemTheme;
  }

  return preference;
}

export function getInitialResolvedTheme(): ResolvedTheme {
  return resolveThemePreference(getInitialThemePreference());
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', theme);
}

export function persistThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore persistence errors in constrained browser contexts.
  }
}
