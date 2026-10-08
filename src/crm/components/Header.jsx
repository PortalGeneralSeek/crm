import { useState, useEffect, useRef } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';
import { useCrmStore } from '../store/crmStore';
import { useAuth } from '../services/crmApi';

export default function Header({
  title,
  notificationsOpen,
  onToggleNotifications,
  onNewDeal,
  onNewLead,
  onOpenAiCopilot,
  onLogout,
  onSwitchModule,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleCollapse,
}) {
  const showToast = useToast();
  const auth = useAuth();
  const { leads, deals, customers } = useCrmStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      const matchedLeads = leads.filter(
        (l) => l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q)
      );
      const matchedDeals = deals.filter(
        (d) => d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q)
      );
      const matchedCustomers = customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
      );

      setSearchResults({
        leads: matchedLeads,
        deals: matchedDeals,
        customers: matchedCustomers,
        total: matchedLeads.length + matchedDeals.length + matchedCustomers.length,
      });
      setShowResults(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, leads, deals, customers]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectResult = (moduleKey, itemName) => {
    setShowResults(false);
    setSearchQuery('');
    if (onSwitchModule) onSwitchModule(moduleKey);
    showToast(`已定位并跳转至：${itemName}`);
  };

  return (
    <header className="h-16 flex-none bg-white dark:bg-[#121316] border-b border-zinc-200 dark:border-zinc-800 z-30 px-4 lg:px-6 flex items-center justify-between">
      {/* Brand & Breadcrumb & Mobile Drawer Trigger */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors -ml-1.5"
          aria-label="展开导航菜单"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse / Expand Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={isSidebarCollapsed ? '展开侧边导航 (Expand)' : '收起侧边导航 (Collapse)'}
        >
          <Icon name={isSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'} className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
            <Icon name="compass" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                领航 CRM
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-blue-400 font-semibold border border-brand-500/20">
                华东战区
              </span>
            </div>
            <span
              id="current-module-title"
              className="text-[11px] text-zinc-400 font-medium block -mt-0.5 truncate max-w-[120px] sm:max-w-none"
            >
              {title}
            </span>
          </div>
        </div>
        {/* Global Search Bar with Live Results Popover */}
        <div ref={searchContainerRef} className="hidden md:flex items-center relative w-80 lg:w-96">
          <Icon
            name="search"
            className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none"
          />
          <input
            type="text"
            id="global-crm-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults && searchResults.total > 0) setShowResults(true);
            }}
            placeholder="全局搜索客户、商机、线索或合同编号 (⌘K)..."
            className="w-full pl-9 pr-14 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-brand-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-all outline-none"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-600 shadow-xs pointer-events-none">
            ⌘K
          </kbd>

          {/* Search Results Dropdown */}
          {showResults && searchResults && (
            <div className="absolute top-10 left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 z-50 max-h-80 overflow-y-auto custom-scrollbar text-xs">
              {searchResults.total === 0 ? (
                <div className="text-center py-4 text-zinc-400 text-xs">未找到包含 "{searchQuery}" 的相关业务数据</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.leads.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase">
                        线索 ({searchResults.leads.length})
                      </div>
                      {searchResults.leads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => handleSelectResult('leads', l.company)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{l.company}</div>
                            <div className="text-[10px] text-zinc-400">{l.contact}</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                            {l.status?.text || '线索'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.deals.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase">
                        商机 ({searchResults.deals.length})
                      </div>
                      {searchResults.deals.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleSelectResult('deals', d.name)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{d.name}</div>
                            <div className="text-[10px] text-zinc-400">{d.desc}</div>
                          </div>
                          <span className="font-mono text-xs font-bold text-brand-600">
                            ¥{Number(d.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase">
                        客户 ({searchResults.customers.length})
                      </div>
                      {searchResults.customers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectResult('customers', c.name)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.name}</div>
                            <div className="text-[10px] text-zinc-400">{c.industry}</div>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-semibold">{c.health}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Quick Action Buttons & User Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewDeal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-500/25 transition-all"
        >
          <Icon name="plus" className="w-3.5 h-3.5" /> <span>新建商机</span>
        </button>
        <button
          onClick={onNewLead}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shadow-xs transition-all"
        >
          <Icon name="user-plus" className="w-3.5 h-3.5" /> <span>录入线索</span>
        </button>
        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={onToggleNotifications}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
          >
            <Icon name="bell" className="w-4 h-4" />{' '}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />
          </button>{' '}
          <div
            id="dropdown-notifications"
            className={`${notificationsOpen ? '' : 'hidden '}absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-3 z-50`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 px-1">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                待办与预警提醒 (3)
              </span>
              <button
                onClick={() => showToast('全部标记为已读')}
                className="text-[11px] text-brand-600 dark:text-blue-400 hover:underline"
              >
                全部已读
              </button>
            </div>
            <div className="mt-2 space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <div className="font-semibold text-amber-800 dark:text-amber-300">
                  大华股份 ¥2,400,000 合同待审批
                </div>
                <div className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                  法务已完成初审，等待销售副总审批签署。
                </div>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                <div className="font-semibold text-blue-800 dark:text-blue-300">
                  顺丰科技 今日 14:00 方案答辩提醒
                </div>
                <div className="text-[11px] text-blue-700/80 dark:text-blue-400 mt-0.5">
                  请提前 15 分钟准备好系统核心架构演示。
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                <div className="font-semibold text-rose-800 dark:text-rose-300">
                  中科曙光 商机超 14 天未跟进
                </div>
                <div className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                  即将触发公海自动回收机制。
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* AI Assistant Trigger */}
        <button
          onClick={onOpenAiCopilot}
          className="p-2 rounded-xl text-brand-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors relative"
          title="进入 AI 销售智能体"
        >
          <Icon name="sparkles" className="w-4 h-4" />
        </button>
        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <img
              src={
                auth.user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80'
              }
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/20"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold leading-none text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
              {auth.user?.realName || '未登录'}
            </div>
            {auth.roles && auth.roles.length > 1 ? (
              <select
                value={auth.role?.id}
                onChange={async (e) => {
                  const targetId = Number(e.target.value);
                  if (targetId && targetId !== auth.role?.id) {
                    try {
                      const res = await crmApi.switchRole(targetId);
                      showToast(`已切换身份为【${res.data.role.name}】！`, 'success');
                    } catch (err) {
                      showToast(`切换失败: ${err.message}`, 'error');
                    }
                  }
                }}
                className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-transparent hover:text-brand-600 dark:hover:text-blue-400 cursor-pointer outline-none mt-0.5 max-w-[130px] truncate font-medium"
                title="切换当前工作身份角色"
              >
                {auth.roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[120px]">
                {auth.role?.name || '体验账号'}
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="退出登录"
          >
            <Icon name="log-out" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
