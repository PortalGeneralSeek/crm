import { useState } from 'react';
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
  { id: 12, title: '大类资产与黄金监控', name: 'market-monitor', path: '/market-monitor', icon: 'trending-up', badge: '实时流' },
  { id: 13, title: '美股核心科技监控', name: 'us-stocks', path: '/us-stocks', icon: 'cpu', badge: '实时' },
  { id: 11, title: '系统设置', name: 'settings', path: '/settings', icon: 'settings', badge: 'Admin' },
];

// System Settings secondary menu (二级菜单)
const SETTINGS_SUB_ITEMS = [
  {
    key: 'users',
    title: '用户管理 · 成员与账号',
    icon: 'users',
    badge: '成员',
  },
  {
    key: 'roles',
    title: '角色管理 · 权限矩阵',
    icon: 'shield-check',
    badge: '权限',
  },
  {
    key: 'audit',
    title: '系统日志 · 操作审计',
    icon: 'file-text',
    badge: '审计',
  },
];

export default function Sidebar({
  activeModule,
  onSwitchModule,
  settingsTab = 'users',
  onSwitchSettingsTab,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const showToast = useToast();
  const auth = useAuth();
  const [settingsExpanded, setSettingsExpanded] = useState(true);

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
          if (modKey === 'marketmonitor') modKey = 'market-monitor';
          if (modKey === 'usstocks') modKey = 'us-stocks';
          return {
            id: m.id,
            title: m.title,
            name: modKey,
            path: m.path,
            icon: modKey === 'settings' ? 'settings' : m.icon || 'layout-dashboard',
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
                // Collapsed: Icon-only mode
                if (m.name === 'settings') {
                  return (
                    <div key={m.id} className="relative group">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onSwitchSettingsTab?.(settingsTab || 'users');
                          onSwitchModule('settings');
                          if (onCloseMobile) onCloseMobile();
                        }}
                        data-mod={m.name}
                        title={m.title}
                        className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all relative ${
                          isItemActive
                            ? 'bg-brand-50 dark:bg-blue-950/70 text-brand-600 dark:text-blue-400 font-bold shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        <Icon name={m.icon} className="w-5 h-5 shrink-0" />
                        {isItemActive && (
                          <span className="absolute left-0 w-1 h-5 bg-brand-500 rounded-r-full" />
                        )}
                      </button>

                      {/* Collapsed Secondary Menu Popover */}
                      <div className="absolute left-full top-0 ml-2 w-56 p-2 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 space-y-1">
                        <div className="px-2.5 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                          <span>系统设置</span>
                          <span className="text-[10px] text-zinc-400">二级菜单</span>
                        </div>
                        {SETTINGS_SUB_ITEMS.map((sub) => {
                          const isSubActive = isItemActive && settingsTab === sub.key;
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onSwitchSettingsTab?.(sub.key);
                                onSwitchModule('settings');
                                if (onCloseMobile) onCloseMobile();
                              }}
                              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                                isSubActive
                                  ? 'bg-blue-50/90 dark:bg-[#0c213b] text-blue-600 dark:text-white border border-blue-200/50 dark:border-blue-500/20 font-semibold shadow-xs'
                                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                              }`}
                            >
                              <Icon
                                name={sub.icon}
                                className={`w-4 h-4 shrink-0 ${
                                  isSubActive ? 'text-blue-500 dark:text-[#0088ff]' : 'text-zinc-400'
                                }`}
                              />
                              <span className="truncate flex-1">{sub.title}</span>
                              {sub.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono">
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Regular items in collapsed mode
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

              // Expanded: Settings with secondary submenu
              if (m.name === 'settings') {
                return (
                  <div key={m.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isItemActive) {
                          onSwitchSettingsTab?.(settingsTab || 'users');
                          onSwitchModule('settings');
                          setSettingsExpanded(true);
                        } else {
                          setSettingsExpanded((prev) => !prev);
                        }
                      }}
                      data-mod={m.name}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
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
                      <Icon
                        name="chevron-right"
                        className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                          settingsExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* Secondary Submenu (二级菜单) */}
                    {settingsExpanded && (
                      <ul className="border-l border-zinc-200 dark:border-zinc-800/80 mx-4 my-1 flex min-w-0 flex-col gap-1 pl-3.5 py-0.5 animate-in fade-in duration-150">
                        {SETTINGS_SUB_ITEMS.map((sub) => {
                          const isSubActive = isItemActive && settingsTab === sub.key;
                          return (
                            <li key={sub.key} className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onSwitchSettingsTab?.(sub.key);
                                  onSwitchModule('settings');
                                  if (onCloseMobile) onCloseMobile();
                                }}
                                className={`flex h-9 min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-3 text-xs font-medium transition-all text-left w-full cursor-pointer ${
                                  isSubActive
                                    ? 'bg-blue-50/90 dark:bg-[#0c213b] text-blue-600 dark:text-white border border-blue-200/50 dark:border-blue-500/20 font-semibold shadow-xs'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                                }`}
                              >
                                <Icon
                                  name={sub.icon}
                                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                    isSubActive ? 'text-blue-500 dark:text-[#0088ff]' : 'text-zinc-400 dark:text-zinc-500'
                                  }`}
                                />
                                <span className="truncate flex-1">{sub.title}</span>
                                {sub.badge && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                                      isSubActive
                                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                    }`}
                                  >
                                    {sub.badge}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              }

              // Expanded: Regular Mode with icon and title
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
