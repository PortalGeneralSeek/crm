import { useEffect, useState, useCallback } from 'react';

/**
 * Lightweight, zero-dependency hash-based router hook.
 * Perfect for MPA, static preview, and deep linking without server fallback issues.
 */
export function useHashRoute(defaultPath = '/') {
  const getHashPath = useCallback(() => {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw || raw === '') return defaultPath;
    // ensure leading slash
    return raw.startsWith('/') ? raw : `/${raw}`;
  }, [defaultPath]);

  const [currentPath, setCurrentPath] = useState(getHashPath);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPath(getHashPath());
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, [getHashPath]);

  const navigate = useCallback((path, { replace = false } = {}) => {
    const targetHash = `#${path.startsWith('/') ? path : `/${path}`}`;
    if (replace) {
      window.location.replace(targetHash);
    } else {
      window.location.hash = targetHash;
    }
    setCurrentPath(path.startsWith('/') ? path : `/${path}`);
  }, []);

  return { path: currentPath, navigate };
}
