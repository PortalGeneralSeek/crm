import { useCallback, useState } from 'react';

const STORAGE_KEY = 'theme';

export function readStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

// Applies the theme class before React mounts so the first paint is already themed.
export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', readStoredTheme());
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    setIsDark(next);
    return next;
  }, []);

  return { isDark, toggle };
}
