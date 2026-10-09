import Icon from '../../shared/Icon';
import { useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

// Default static menu fallback if user is not yet authenticated
const DEFAULT_MENUS = [
  { id: 1, title: '核心仪表盘', name: 'dashboard', path: '/dashboard', icon: 'layout-dashboard', badge: 'Live' },
  { id: 2, title: '线索转化管理', name: 'leads', path: '/leads', icon: 'filter', count: '24' },
  { id: 3, title: '客户 360° 视图', name: 'customers', path: '/customers', icon: 'building-2' },
  { id: 4, title: '商机推进看板', name: 'deals', path: '/deals', icon: 'kanban', count: '18' },
  { id: 5, title: '合同与订单审批', name: 'contracts', path: '/contracts', icon: 'file-check-2', dot: true },
  { id: 6, title: '回款与发票结算', name: 'payments', path: '/payments', icon: 'receipt' },
  { id: 7, title: '产品与报价库', name: 'products', path: '/products', icon: 'calculator' },
  { id: 8, title: '战区业绩排行榜', name: 'leaderboard', path: '/leaderboard', icon: 'trophy', badge: 'TOP 1' },
  { id: 9, title: '销售 BI 商业智能', name: 'analytics', path: '/analytics', icon: 'pie-chart' },
  { id: 10, title: '销售 AI 助理', name: 'ai-copilot', path: '/ai', icon: 'bot', badge: 'Beta' },
  { id: 11, title: '系统与成员权限', name: 'settings', path: '/settings', icon: 'shield-check', badge: 'Admin' },
];

export default function Sidebar({
  activeModule,
  onSwitchModule,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const showToast = useToast();
  const auth = useAuth();

  // Normalize active module key
  const currentKey = (activeModule || 'dashboard').toLowerCase().replace('_', '-');

  const handleClick = (e, targetKey) => {
    e.preventDefault();
    onSwitchModule(targetKey);
    if (onCloseMobile) onCloseMobile();
  };

  // Resolve dynamic menus
  const dynamicMenus =
    auth.menus && auth.menus.length > 0
      ? auth.menus.map((m) => {
          let modKey = m.name.toLowerCase();
          if (modKey === 'aicopilot') modKey = 'ai-copilot';
          return {
            id: m.id,
            title: m.title,
            name: modKey,
            path: m.path,
            icon: m.icon || 'layout-dashboard',
            btnPermissions: m.btnPermissions || [],
            fieldPerms: m.fieldPerms || [],
          };
        })
      : DEFAULT_MENUS;

  // The base content rendered inside the sidebar container
  const sidebarContent = (
    <div className="flex flex-col justify-between h-full overflow-y-auto custom-scrollbar select-none">
      <div className={`space-y-4 ${collapsed ? 'p-2' : 'p-3'}`}>
        {/* Mobile Header with Close button (visible only in mobile drawer) */}
        <div className="lg:hidden flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-md">
              <Icon name="compass" className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">领航 CRM 导航</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>


        {/* Dynamic Left Nav Menu Loaded from Backend Permissions */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <span>动态授权菜单 ({dynamicMenus.length})</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-blue-400 font-mono">
                RBAC
              </span>
            </div>
          )}

          <nav className="space-y-1 text-xs">
            {dynamicMenus.map((m) => {
              const isItemActive = currentKey === m.name;

              if (collapsed) {
                // Collapsed: Icon-only mode (收缩后只有菜单对应的图标)
                return (
                  <a
                    key={m.id}
                    href={`#${m.path}`}
                    onClick={(e) => handleClick(e, m.name)}
                    data-mod={m.name}
                    title={m.title}
                    className={`flex items-center justify-center p-2.5 rounded-xl transition-all relative group ${
                      isItemActive
                        ? 'bg-brand-50 dark:bg-blue-950/70 text-brand-600 dark:text-blue-400 font-bold shadow-xs'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon name={m.icon} className="w-5 h-5 shrink-0" />
                    {isItemActive && (
                      <span className="absolute left-0 w-1 h-5 bg-brand-500 rounded-r-full" />
                    )}
                    {/* Hover Tooltip */}
                    <span className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                      {m.title}
                    </span>
                  </a>
                );
              }

              // Expanded: Full Mode with icon and title
              return (
                <a
                  key={m.id}
                  href={`#${m.path}`}
                  onClick={(e) => handleClick(e, m.name)}
                  data-mod={m.name}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    isItemActive
                      ? 'bg-brand-50 dark:bg-blue-950/60 font-semibold text-brand-600 dark:text-blue-400'
                      : 'font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon name={m.icon} className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{m.title}</span>

                  {m.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-brand-500 text-white font-mono shrink-0">
                      {m.badge}
                    </span>
                  )}
                  {m.count && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono shrink-0">
                      {m.count}
                    </span>
                  )}
                  {m.dot && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className={`border-t border-zinc-200 dark:border-zinc-800 ${collapsed ? 'p-2' : 'p-3'} space-y-2`}>
        {/* Monthly Quota Card: Only in expanded mode */}
        {!collapsed && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800/80 dark:to-zinc-800/40 rounded-2xl p-3.5 border border-blue-100 dark:border-zinc-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">本月目标进度</span>
              <span className="font-mono font-bold text-brand-600 dark:text-blue-400">82.5%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-brand-500 to-indigo-500 h-2 rounded-full"
                style={{ width: '82.5%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>已回款 ¥82.5万</span>
              <span>差 ¥17.5万</span>
            </div>
          </div>
        )}

        {/* Expand / Collapse Button (visible on desktop) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              collapsed ? 'p-2' : 'px-3'
            }`}
            title={collapsed ? '展开侧边导航 (Expand)' : '收起侧边导航 (Collapse)'}
          >
            <Icon
              name={collapsed ? 'panel-left-open' : 'panel-left-close'}
              className="w-4 h-4 shrink-0"
            />
            {!collapsed && <span>收起侧边栏</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Slide-over Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#121316] border-r border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 3. Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-none bg-white dark:bg-[#121316] border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
