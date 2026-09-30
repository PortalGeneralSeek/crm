import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icon from '../../shared/Icon';

const ToastContext = createContext(null);

const TOAST_LIFETIME_MS = 3000;
const TOAST_EXIT_MS = 300;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((message, type = 'info') => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, type, leaving: false }]);

    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), TOAST_EXIT_MS);
    }, TOAST_LIFETIME_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        id="toast-container"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              t.leaving
                ? 'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs shadow-2xl border border-zinc-800 dark:border-zinc-200 backdrop-blur-md transform transition-all duration-300 translate-y-3 opacity-0'
                : 'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs shadow-2xl border border-zinc-800 dark:border-zinc-200 backdrop-blur-md transform transition-all duration-300'
            }
          >
            <Icon
              name={
                t.type === 'warning' || t.message.includes('注意')
                  ? 'alert-triangle'
                  : 'check-circle'
              }
              className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0"
            />
            <span className="font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
