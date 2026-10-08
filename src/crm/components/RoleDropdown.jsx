import { useState, useRef, useEffect } from 'react';
import Icon from '../../shared/Icon';

export default function RoleDropdown({
  roles = [],
  currentRole,
  onSelect,
  loading = false,
  variant = 'sidebar', // 'sidebar' | 'header'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!roles || roles.length <= 1) {
    if (variant === 'sidebar') {
      return (
        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">当前身份</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-[10px]">
            {currentRole?.name || '普通成员'}
          </span>
        </div>
      );
    }
    return currentRole ? (
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200/60 dark:border-zinc-700/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{currentRole.name}</span>
      </span>
    ) : null;
  }

  const handleToggle = () => {
    if (!loading) setIsOpen((prev) => !prev);
  };

  const handleSelectRole = (r) => {
    setIsOpen(false);
    if (r.id !== currentRole?.id && onSelect) {
      onSelect(r.id);
    }
  };

  if (variant === 'header') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            isOpen
              ? 'bg-brand-500/10 dark:bg-blue-500/15 border-brand-500/40 text-brand-600 dark:text-blue-400 ring-2 ring-brand-500/20'
              : 'bg-zinc-100/90 hover:bg-zinc-200/70 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200'
          }`}
          title="点击切换工作身份角色"
        >
          <div className="w-4 h-4 rounded-md bg-brand-500/20 text-brand-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon name="shield-check" className="w-2.5 h-2.5" />
          </div>
          <span className="text-zinc-400 font-normal">身份:</span>
          <span className="max-w-[120px] truncate text-zinc-900 dark:text-zinc-100 font-bold">
            {currentRole?.name || '选择角色'}
          </span>
          {loading ? (
            <span className="animate-spin text-brand-500 text-xs">⟳</span>
          ) : (
            <Icon
              name="chevron-down"
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-brand-500' : ''
              }`}
            />
          )}
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#18191d] rounded-2xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/70 text-[10px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1">
                <Icon name="users" className="w-3 h-3 text-brand-500" />
                <span>切换工作身份角色</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                {roles.length} 个角色
              </span>
            </div>
            <div className="space-y-1">
              {roles.map((r) => {
                const isSelected = r.id === currentRole?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-brand-500/10 dark:bg-blue-500/15 text-brand-600 dark:text-blue-400 font-bold border border-brand-500/25 shadow-xs'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                        <span className="truncate">{r.name}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-brand-500/15 text-brand-600 dark:text-blue-400 font-medium">
                            当前
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <div className="text-[10px] text-zinc-400 font-normal truncate mt-0.5 pl-3">
                          {r.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon name="check" className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant (card-style full width trigger)
  return (
    <div ref={containerRef} className={`pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 relative ${className}`}>
      <div className="text-[10px] font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Icon name="users" className="w-3 h-3 text-brand-500" />
          <span>切换工作身份</span>
        </span>
        {loading && <span className="animate-spin text-brand-500 text-xs">⟳</span>}
      </div>

      {/* Styled Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`w-full text-left p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between shadow-xs ${
          isOpen
            ? 'bg-white dark:bg-zinc-800 border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 text-brand-600 dark:text-blue-400'
            : 'bg-white dark:bg-zinc-800/90 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 border-zinc-200/90 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-brand-500/10 dark:bg-blue-500/20 text-brand-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon name="shield-check" className="w-3 h-3" />
          </div>
          <span className="truncate">{currentRole?.name || '选择身份'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-700 font-mono">
            {roles.length}
          </span>
          <Icon
            name="chevron-down"
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-500' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#18191d] rounded-2xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 mb-1 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/70 text-[10px] font-semibold text-zinc-400">
            <span>选择活动身份角色</span>
            <span>点击立即生效</span>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
            {roles.map((r) => {
              const isSelected = r.id === currentRole?.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-brand-500/10 dark:bg-blue-500/15 text-brand-600 dark:text-blue-400 font-bold border border-brand-500/25 shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <span className="truncate">{r.name}</span>
                      {isSelected && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-brand-500/15 text-brand-600 dark:text-blue-400 font-normal">
                          当前
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <div className="text-[10px] text-zinc-400 font-normal truncate mt-0.5 pl-3">
                        {r.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Icon name="check" className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
