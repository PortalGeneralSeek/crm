import Icon from '../../shared/Icon';

export const TABS = [
  { id: 'application', icon: 'layout-dashboard', label: '1. Application (后台系统)', count: '12组件' },
  { id: 'ai', icon: 'bot', label: '2. AI (智能对话)', count: '5组件' },
  { id: 'marketing', icon: 'megaphone', label: '3. Marketing (营销落地)', count: '6组件' },
  { id: 'ecommerce', icon: 'shopping-bag', label: '4. E-commerce (电商体系)', count: '4组件' },
  { id: 'charts', icon: 'line-chart', label: '5. Charts (图表分析)', count: '7组件' },
];

const TAB_BASE = 'tab-btn px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all';
const TAB_ACTIVE = 'active bg-zinc-100 dark:bg-zinc-800 text-primary';
const TAB_INACTIVE = 'text-zinc-600 dark:text-zinc-400';

// Until the first tab switch the original page leaves every tab unstyled apart from an
// (unstyled) `active` marker on the first one, so that initial state is kept here.
function tabClass(tabId, activeTab, hasSwitched) {
  if (!hasSwitched) return tabId === 'application' ? `${TAB_BASE} active` : TAB_BASE;
  return `${TAB_BASE} ${tabId === activeTab ? TAB_ACTIVE : TAB_INACTIVE}`;
}

export default function Header({
  activeTab,
  hasSwitched,
  isDark,
  onSwitchTab,
  onOpenCommand,
  onOpenCode,
  onToggleTheme,
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#121316]/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Project Meta */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-md shadow-primary/20">
            <Icon name="layers" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">Acme Pro Components</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                Figma v2.0
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              UGv1yrGRKKFxjXMBk4tnt3 · Full Implementation
            </p>
          </div>
        </div>

        {/* Quick Search & Command Bar */}
        <button
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all w-64 justify-between"
        >
          <span className="flex items-center gap-2">
            <Icon name="search" className="w-4 h-4" />
            <span>搜索组件或页面...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Actions: Theme Toggle, Code View, Stats */}
        <div className="flex items-center gap-2">
          {/* View Source / Copy Code */}
          <button
            onClick={onOpenCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Icon name="code-2" className="w-4 h-4" />
            <span className="hidden sm:inline">导出代码</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            id="themeToggle"
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Icon name={isDark ? 'sun' : 'moon'} id="themeIcon" className="w-5 h-5" />
          </button>

          {/* Figma Source Link */}
          <a
            href="https://www.figma.com/design/UGv1yrGRKKFxjXMBk4tnt3/pro-components"
            target="_blank"
            className="p-2 rounded-lg bg-primary text-white hover:bg-primary-600 shadow-sm transition-all"
            title="打开原始 Figma 文件"
          >
            <Icon name="figma" className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#121316]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto custom-scrollbar gap-1 py-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onSwitchTab(tab.id)}
              className={tabClass(tab.id, activeTab, hasSwitched)}
            >
              <Icon name={tab.icon} className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="text-xs px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
