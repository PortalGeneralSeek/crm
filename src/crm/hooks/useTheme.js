import { useCallback, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'crm-theme';

export function applyStoredTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY) || 'light';
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    return next;
  }, [isDark]);

  return { isDark, toggleTheme };
}
