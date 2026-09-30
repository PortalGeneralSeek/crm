import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../shared/Icon';

const ToastContext = createContext(null);

const DISPLAY_MS = 3500;
const LEAVE_MS = 300;

const ICONS = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
const PHASE_CLASS = { enter: 'translate-y-4 opacity-0', show: '', leave: 'opacity-0 translate-y-2' };

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Set());

  const setPhase = useCallback((id, phase) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, phase } : t)));
  }, []);

  const later = useCallback((fn, ms) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  const showToast = useCallback(
    (message, type = 'info') => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, type, phase: 'enter' }]);
      requestAnimationFrame(() => setPhase(id, 'show'));
      later(() => setPhase(id, 'leave'), DISPLAY_MS);
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), DISPLAY_MS + LEAVE_MS);
    },
    [later, setPhase],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        id="toastContainer"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-medium shadow-2xl border border-zinc-800 flex items-center gap-2.5 transition-all duration-300 pointer-events-auto transform ${PHASE_CLASS[t.phase]}`}
          >
            <Icon
              name={ICONS[t.type] ?? 'info'}
              className={`w-4 h-4 ${t.type === 'success' ? 'text-emerald-400' : 'text-primary'}`}
            />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
