import Icon from '../../shared/Icon';

const ACTIVE_MODE =
  'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-sm transition-all';
const INACTIVE_MODE =
  'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all';

export default function ModeSwitcher({ view, isDark, onSwitchView, onToggleTheme }) {
  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-xl text-xs">
      <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono font-medium">Port 3001</span>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">领航 CRM (全模块版)</span>
      </div>
      {/* View Mode Switcher */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-full">
        <button
          id="switch-workbench"
          onClick={() => onSwitchView('workbench')}
          className={view === 'workbench' ? ACTIVE_MODE : INACTIVE_MODE}
        >
          <Icon name="layout-dashboard" className="w-3.5 h-3.5" />
          <span>销售系统 (10大模块)</span>
        </button>
        <button
          id="switch-login"
          onClick={() => onSwitchView('login')}
          className={view === 'login' ? ACTIVE_MODE : INACTIVE_MODE}
        >
          <Icon name="lock" className="w-3.5 h-3.5" />
          <span>登录认证页</span>
        </button>
      </div>
      {/* Theme Toggle */}
      <button
        id="theme-toggle"
        onClick={onToggleTheme}
        className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors ml-1"
        title="切换深色/浅色模式"
      >
        <Icon
          name="sun"
          id="theme-icon-sun"
          className={isDark ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5 hidden'}
        />{' '}
        <Icon
          name="moon"
          id="theme-icon-moon"
          className={isDark ? 'w-3.5 h-3.5 hidden' : 'w-3.5 h-3.5'}
        />
      </button>
    </div>
  );
}
