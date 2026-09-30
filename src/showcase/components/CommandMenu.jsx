import { useEffect, useRef } from 'react';
import Icon from '../../shared/Icon';

const COMMANDS = [
  { tab: 'application', icon: 'layout-dashboard', color: 'text-primary', label: 'Application 后台组件', hint: 'Tab 1' },
  { tab: 'ai', icon: 'bot', color: 'text-purple-500', label: 'AI 智能对话组件', hint: 'Tab 2' },
  { tab: 'marketing', icon: 'megaphone', color: 'text-emerald-500', label: 'Marketing 落地页组件', hint: 'Tab 3' },
  { tab: 'ecommerce', icon: 'shopping-bag', color: 'text-amber-500', label: 'E-commerce 电商组件', hint: 'Tab 4' },
  { tab: 'charts', icon: 'line-chart', color: 'text-blue-500', label: 'Charts 数据可视化', hint: 'Tab 5' },
];

export default function CommandMenu({ open, onClose, onNavigate }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div
      id="commandMenuBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm${open ? '' : ' hidden'} flex items-start justify-center pt-20 px-4`}
    >
      <div className="bg-white dark:bg-[#16171a] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Icon name="search" className="w-5 h-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            id="cmdInput"
            placeholder="键入指令或搜索组件..."
            className="w-full text-sm bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
          />
          <kbd className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 font-mono">
            ESC
          </kbd>
        </div>
        <div className="p-2 max-h-72 overflow-y-auto space-y-1 text-xs">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 px-3 py-1">
            快速跳转
          </div>
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.tab}
              onClick={() => onNavigate(cmd.tab)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
            >
              <span className="flex items-center gap-2.5">
                <Icon name={cmd.icon} className={`w-4 h-4 ${cmd.color}`} />
                {cmd.label}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{cmd.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
