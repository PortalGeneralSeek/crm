import React from 'react';
import Select from '../../shared/Select';
import Icon from '../../shared/Icon';

/**
 * RoleDropdown using Global Select component
 */
export default function RoleDropdown({
  roles = [],
  currentRole,
  onSelect,
  loading = false,
  variant = 'header',
  className = '',
}) {
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

  const selectOptions = roles.map((r) => ({
    value: r.id,
    label: r.name,
    description: r.description,
    raw: r,
  }));

  return (
    <Select
      options={selectOptions}
      value={currentRole?.id}
      onChange={(roleId) => {
        if (roleId !== currentRole?.id && onSelect) {
          onSelect(roleId);
        }
      }}
      disabled={loading}
      variant={variant}
      align="right"
      className={className}
      dropdownClassName="w-72"
      renderTrigger={(selectedOpt, isOpen, handleToggle) => (
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            isOpen
              ? 'bg-brand-500/10 dark:bg-blue-500/15 border-brand-500/40 text-brand-600 dark:text-blue-400 ring-2 ring-brand-500/20'
              : 'bg-zinc-100/90 hover:bg-zinc-200/70 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200'
          }`}
          title="点击切换工作身份角色"
        >
          <div className="w-4 h-4 rounded-md bg-brand-500/20 text-brand-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon name="shield-check" className="w-2.5 h-2.5" />
          </div>
          <span className="hidden sm:inline text-zinc-400 font-normal">身份:</span>
          <span className="max-w-[85px] sm:max-w-[120px] truncate text-zinc-900 dark:text-zinc-100 font-bold">
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
      )}
      renderOption={(opt, isSelected) => (
        <div
          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2.5 ${
            isSelected
              ? 'bg-brand-500/10 dark:bg-blue-500/15 text-brand-600 dark:text-blue-400 font-bold border border-brand-500/25 shadow-xs'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-transparent'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSelected ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              />
              <span className="truncate">{opt.label}</span>
              {isSelected && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-brand-500/15 text-brand-600 dark:text-blue-400 font-medium">
                  当前
                </span>
              )}
            </div>
            {opt.description && (
              <div className="text-[10px] text-zinc-400 font-normal truncate mt-0.5 pl-3">
                {opt.description}
              </div>
            )}
          </div>
          {isSelected && (
            <Icon name="check" className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          )}
        </div>
      )}
    />
  );
}
