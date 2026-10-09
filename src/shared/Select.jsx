import React, { useState, useRef, useEffect, useMemo } from 'react';
import Icon from './Icon';

/**
 * Global Select Component (统一全局下拉选择组件)
 * 
 * Supports:
 * - Direct options array: `options={[{ value, label, icon, description, badge, disabled }]}` or `['A', 'B']`
 * - Children `<option>` support for drop-in replacement: `<Select><option value="1">Item 1</option></Select>`
 * - Sizes: 'sm' (filter bar), 'md' (standard form), 'lg'
 * - Variants: 'default', 'filter', 'header', 'inline'
 * - Dark mode & accessibility (Escape to close, outside click to close)
 */
export default function Select({
  options: optionsProp,
  children,
  value,
  onChange,
  placeholder = '请选择...',
  disabled = false,
  size = 'md',
  variant = 'default',
  align = 'left',
  icon,
  label,
  error,
  fullWidth = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  renderOption,
  renderTrigger,
  emptyText = '暂无选项',
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalize options from optionsProp or React children
  const options = useMemo(() => {
    if (Array.isArray(optionsProp)) {
      return optionsProp.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return {
            value: item.value !== undefined ? item.value : item.id,
            label: item.label !== undefined ? item.label : (item.name || String(item.value ?? '')),
            description: item.description,
            icon: item.icon,
            badge: item.badge,
            disabled: !!item.disabled,
            raw: item,
          };
        }
        return {
          value: item,
          label: String(item),
          disabled: false,
          raw: item,
        };
      });
    }

    // Parse children (<option value="...">label</option>)
    if (children) {
      const parsed = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          parsed.push({
            value: child.props.value !== undefined ? child.props.value : child.props.children,
            label: child.props.children ?? '',
            disabled: !!child.props.disabled,
            raw: child.props,
          });
        }
      });
      return parsed;
    }

    return [];
  }, [optionsProp, children]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange(option.value, option);
    }
  };

  // Size specific styling
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-2.5 rounded-xl gap-1.5 min-h-[32px]',
    md: 'text-xs py-2 px-3 rounded-xl gap-2 min-h-[38px]',
    lg: 'text-sm py-2.5 px-3.5 rounded-xl gap-2 min-h-[44px]',
  }[size] || 'text-xs py-2 px-3 rounded-xl gap-2 min-h-[38px]';

  // Variant specific styling for trigger button
  const getVariantClasses = () => {
    if (variant === 'filter') {
      return `border bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 shadow-xs ${
        isOpen
          ? 'border-brand-500/80 dark:border-blue-500 ring-2 ring-brand-500/15'
          : 'border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
      }`;
    }

    if (variant === 'header') {
      return `border shadow-xs ${
        isOpen
          ? 'bg-brand-500/10 dark:bg-blue-500/15 border-brand-500/40 text-brand-600 dark:text-blue-400 ring-2 ring-brand-500/20'
          : 'bg-zinc-100/90 hover:bg-zinc-200/70 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200'
      }`;
    }

    if (variant === 'inline') {
      return `border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-200 ${
        isOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''
      }`;
    }

    // Default form variant
    return `border bg-zinc-50 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 shadow-xs ${
      isOpen
        ? 'border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 bg-white dark:bg-zinc-800'
        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
    }`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${fullWidth ? 'w-full' : ''} ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      {renderTrigger ? (
        renderTrigger(selectedOption, isOpen, handleToggle)
      ) : (
        <button
          type="button"
          id={id}
          name={name}
          onClick={handleToggle}
          disabled={disabled}
          className={`flex items-center justify-between transition-all outline-none text-left select-none ${
            fullWidth ? 'w-full' : ''
          } ${sizeClasses} ${getVariantClasses()} ${
            disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50' : 'cursor-pointer'
          } ${buttonClassName}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && (
              <span className="text-zinc-400 shrink-0">
                {typeof icon === 'string' ? <Icon name={icon} className="w-4 h-4" /> : icon}
              </span>
            )}
            {selectedOption?.icon && (
              <span className="text-zinc-400 shrink-0">
                {typeof selectedOption.icon === 'string' ? (
                  <Icon name={selectedOption.icon} className="w-4 h-4" />
                ) : (
                  selectedOption.icon
                )}
              </span>
            )}
            <span
              className={`truncate font-medium ${
                selectedOption
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-blue-400 font-medium shrink-0">
                {selectedOption.badge}
              </span>
            )}
          </div>

          <Icon
            name="chevron-down"
            className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ml-1.5 ${
              isOpen ? 'rotate-180 text-brand-500' : ''
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 min-w-[160px] max-h-64 overflow-y-auto custom-scrollbar bg-white dark:bg-[#18191d] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl shadow-zinc-950/10 dark:shadow-black/40 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            fullWidth ? 'w-full' : ''
          } ${dropdownClassName}`}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-center text-zinc-400 dark:text-zinc-500">
              {emptyText}
            </div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value);

              if (renderOption) {
                return (
                  <div
                    key={String(option.value)}
                    onClick={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    {renderOption(option, isSelected)}
                  </div>
                );
              }

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2.5 ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-brand-500/10 dark:bg-blue-500/15 text-brand-600 dark:text-blue-400 font-semibold border border-brand-500/20'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-transparent'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {option.icon && (
                        <span className="shrink-0 text-zinc-400">
                          {typeof option.icon === 'string' ? (
                            <Icon name={option.icon} className="w-3.5 h-3.5" />
                          ) : (
                            option.icon
                          )}
                        </span>
                      )}
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <div className="text-[10px] text-zinc-400 font-normal truncate mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <Icon
                      name="check"
                      className="w-3.5 h-3.5 text-brand-500 dark:text-blue-400 shrink-0"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
