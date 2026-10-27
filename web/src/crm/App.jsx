import { useEffect, useLayoutEffect, useRef, useState, Suspense, lazy } from 'react';
import FollowupDrawer from './components/FollowupDrawer';
import Header from './components/Header';
import NewDealModal from './components/NewDealModal';
import NewLeadModal from './components/NewLeadModal';
import NewsFlashAlerts from './components/NewsFlashAlerts';
import Sidebar from './components/Sidebar';
import { moduleTitles } from './data/moduleTitles';
import { ToastProvider, useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useHashRoute } from '../shared/useHashRoute';
import { useAuth, authStore } from './services/crmApi';

// Lazy load modules for optimal initial bundle & performance
const LoginView = lazy(() => import('./components/LoginView'));
const Dashboard = lazy(() => import('./modules/Dashboard'));
const Leads = lazy(() => import('./modules/Leads'));
const Customers = lazy(() => import('./modules/Customers'));
const Deals = lazy(() => import('./modules/Deals'));
const Contracts = lazy(() => import('./modules/Contracts'));
const Payments = lazy(() => import('./modules/Payments'));
const Products = lazy(() => import('./modules/Products'));
const Leaderboard = lazy(() => import('./modules/Leaderboard'));
const Analytics = lazy(() => import('./modules/Analytics'));
const AiCopilot = lazy(() => import('./modules/AiCopilot'));
const MarketMonitor = lazy(() => import('./modules/MarketMonitor'));
const MarketKline = lazy(() => import('./modules/MarketKline'));
const UsStocks = lazy(() => import('./modules/UsStocks'));
const UsStockKline = lazy(() => import('./modules/UsStockKline'));
const Settings = lazy(() => import('./modules/Settings'));

function ModuleSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl" />
        <div className="h-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl" />
        <div className="h-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl" />
        <div className="h-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl" />
      </div>
      <div className="h-80 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl w-full" />
    </div>
  );
}

function Workspace() {
  const showToast = useToast();
  const { isDark, toggleTheme } = useTheme();
  const auth = useAuth();
  const { path, navigate } = useHashRoute('/login');

  const mainRef = useRef(null);
  const dashboardRef = useRef(null);

  // If user is not logged in, enforce view = 'login'
  const view = !auth.isLoggedIn || path === '/login' ? 'login' : 'workbench';
  const cleanPath = path === '/login' ? 'dashboard' : path.replace(/^\//, '');
  const pathParts = cleanPath.split('/');
  const baseModule = pathParts[0] || 'dashboard';
  const activeModule = moduleTitles[baseModule] ? baseModule : 'dashboard';

  // Sub-tab for settings
  const settingsTab =
    baseModule === 'settings' && ['users', 'roles', 'audit'].includes(pathParts[1])
      ? pathParts[1]
      : 'users';

  // #/market-monitor/kline/<encodeURIComponent(symbol)> 与 #/us-stocks/kline/<symbol>
  const klineSymbol = (() => {
    if (!['market-monitor', 'us-stocks'].includes(baseModule) || pathParts[1] !== 'kline') return null;
    try {
      return decodeURIComponent(pathParts[2] || '');
    } catch {
      return '';
    }
  })();

  const [navigationCount, setNavigationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealCompany, setDealCompany] = useState('');
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupCompany, setFollowupCompany] = useState('大华技术股份有限公司');

  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Desktop sidebar collapsed state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('acme_crm_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('acme_crm_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Auth route guard: enforce login by default & auto-enter workbench upon login
  useEffect(() => {
    if (!auth.isLoggedIn && path !== '/login') {
      navigate('/login');
    } else if (auth.isLoggedIn && path === '/login') {
      navigate('/dashboard');
      setTimeout(() => dashboardRef.current?.resizeChart(), 100);
    }
  }, [auth.isLoggedIn, path, navigate]);

  const switchView = (viewName) => {
    if (viewName === 'workbench') {
      const isLogged = authStore.getSnapshot().isLoggedIn;
      if (!isLogged) {
        showToast('请先登录系统认证身份', 'warning');
        navigate('/login');
        return;
      }
      navigate('/dashboard');
      setTimeout(() => dashboardRef.current?.resizeChart(), 100);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    authStore.logout();
    window.location.hash = '#/login';
    navigate('/login');
    showToast('您已安全退出工作台并注销会话', 'info');
    crmApi.logout().catch(() => {});
  };

  const switchModule = (moduleKey) => {
    if (moduleKey === 'settings') {
      navigate(`/settings/${settingsTab}`);
    } else {
      navigate(`/${moduleKey}`);
    }
    setNavigationCount((n) => n + 1);
    if (moduleKey === 'dashboard') {
      setTimeout(() => dashboardRef.current?.resizeChart(), 60);
    }
    showToast(`已进入: ${moduleTitles[moduleKey] || moduleKey}`);
  };

  const handleSwitchSettingsTab = (tab) => {
    navigate(`/settings/${tab}`);
    setNavigationCount((n) => n + 1);
  };

  useLayoutEffect(() => {
    if (navigationCount > 0) mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigationCount]);

  const inKline = klineSymbol !== null;
  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [inKline]);

  const handleToggleTheme = () => {
    const nextIsDark = toggleTheme();
    showToast(nextIsDark ? '已切换至深色模式 (Dark Theme)' : '已切换至浅色模式 (Light Theme)');
  };

  const convertLeadToDeal = (company) => {
    setDealModalOpen(true);
    setDealCompany(company);
    setDealTitle(`${company} 2026 年度企业数字化采购`);
  };

  const openFollowupDrawer = (company) => {
    setFollowupCompany(company);
    setFollowupOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-crm-search')?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const isActive = (key) => activeModule === key;

  const settingsTabTitles = {
    users: '系统设置 · 成员账号管理',
    roles: '系统设置 · 角色权限矩阵配置',
    audit: '系统设置 · 操作安全审计日志',
  };
  const headerTitle =
    activeModule === 'settings'
      ? settingsTabTitles[settingsTab] || moduleTitles.settings
      : klineSymbol !== null
      ? activeModule === 'us-stocks'
        ? '美股核心科技 · 个股 K 线图表'
        : '全球宏观 · 大类资产 K 线图表'
      : moduleTitles[activeModule];

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#09090b]" />}>
        <LoginView
          hidden={view !== 'login'}
          onEnterWorkbench={() => switchView('workbench')}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />
      </Suspense>

      <div
        id="view-workbench"
        className={`view-transition flex flex-col flex-1 h-screen overflow-hidden${view === 'login' ? ' view-hidden' : ''}`}
      >
        <Header
          title={headerTitle}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen((open) => !open)}
          onNewDeal={() => setDealModalOpen(true)}
          onNewLead={() => setLeadModalOpen(true)}
          onOpenAiCopilot={() => switchModule('ai-copilot')}
          onLogout={handleLogout}
          onSwitchModule={switchModule}
          onToggleMobileSidebar={() => setMobileSidebarOpen((o) => !o)}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeModule={activeModule}
            settingsTab={settingsTab}
            onSwitchSettingsTab={handleSwitchSettingsTab}
            hasNavigated={navigationCount > 0}
            onSwitchModule={switchModule}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          <main
            id="main-content-viewport"
            ref={mainRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 lg:p-8 space-y-6"
          >
            <Suspense fallback={<ModuleSkeleton />}>
              {isActive('dashboard') && (
                <Dashboard
                  ref={dashboardRef}
                  active={true}
                  isDark={isDark}
                  onSwitchModule={switchModule}
                  onOpenFollowup={openFollowupDrawer}
                />
              )}
              {isActive('leads') && (
                <Leads
                  active={true}
                  onOpenNewLead={() => setLeadModalOpen(true)}
                  onConvertLead={convertLeadToDeal}
                />
              )}
              {isActive('customers') && (
                <Customers active={true} onOpenFollowup={openFollowupDrawer} />
              )}
              {isActive('deals') && (
                <Deals active={true} onOpenNewDeal={() => setDealModalOpen(true)} />
              )}
              {isActive('contracts') && <Contracts active={true} />}
              {isActive('payments') && <Payments active={true} />}
              {isActive('products') && <Products active={true} />}
              {isActive('leaderboard') && <Leaderboard active={true} />}
              {isActive('analytics') && <Analytics active={true} isDark={isDark} />}
              {isActive('ai-copilot') && <AiCopilot active={true} />}
              {isActive('market-monitor') && klineSymbol === null && (
                <MarketMonitor active={true} isDark={isDark} />
              )}
              {isActive('market-monitor') && klineSymbol !== null && (
                <MarketKline symbol={klineSymbol} isDark={isDark} onNavigate={navigate} />
              )}
              {isActive('us-stocks') && klineSymbol === null && <UsStocks active={true} />}
              {isActive('us-stocks') && klineSymbol !== null && (
                <UsStockKline symbol={klineSymbol} isDark={isDark} onNavigate={navigate} />
              )}
              {isActive('settings') && (
                <Settings
                  active={true}
                  activeTab={settingsTab}
                  onChangeTab={handleSwitchSettingsTab}
                />
              )}
            </Suspense>
          </main>
        </div>
      </div>

      <NewDealModal
        open={dealModalOpen}
        title={dealTitle}
        company={dealCompany}
        onTitleChange={setDealTitle}
        onCompanyChange={setDealCompany}
        onClose={() => setDealModalOpen(false)}
      />
      <NewLeadModal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} />
      <FollowupDrawer
        open={followupOpen}
        company={followupCompany}
        onClose={() => setFollowupOpen(false)}
      />
      {auth.isLoggedIn && <NewsFlashAlerts />}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Workspace />
    </ToastProvider>
  );
}
