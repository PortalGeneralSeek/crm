import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import FollowupDrawer from './components/FollowupDrawer';
import Header from './components/Header';
import LoginView from './components/LoginView';
import ModeSwitcher from './components/ModeSwitcher';
import NewDealModal from './components/NewDealModal';
import NewLeadModal from './components/NewLeadModal';
import Sidebar from './components/Sidebar';
import { moduleTitles } from './data/moduleTitles';
import { ToastProvider, useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import AiCopilot from './modules/AiCopilot';
import Analytics from './modules/Analytics';
import Contracts from './modules/Contracts';
import Customers from './modules/Customers';
import Dashboard from './modules/Dashboard';
import Deals from './modules/Deals';
import Leaderboard from './modules/Leaderboard';
import Leads from './modules/Leads';
import Payments from './modules/Payments';
import Products from './modules/Products';

function Workspace() {
  const showToast = useToast();
  const { isDark, toggleTheme } = useTheme();

  const mainRef = useRef(null);
  const dashboardRef = useRef(null);

  const [view, setView] = useState('workbench');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [navigationCount, setNavigationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealCompany, setDealCompany] = useState('');
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupCompany, setFollowupCompany] = useState('大华技术股份有限公司');

  const switchView = (viewName) => {
    setView(viewName === 'workbench' ? 'workbench' : 'login');
    if (viewName === 'workbench') {
      setTimeout(() => dashboardRef.current?.resizeChart(), 100);
    }
  };

  const switchModule = (moduleKey) => {
    setActiveModule(moduleKey);
    setNavigationCount((n) => n + 1);
    if (moduleKey === 'dashboard') {
      setTimeout(() => dashboardRef.current?.resizeChart(), 60);
    }
    showToast(`已进入: ${moduleTitles[moduleKey] || moduleKey}`);
  };

  // Runs after the new module is visible so the smooth scroll starts from the updated layout.
  useLayoutEffect(() => {
    if (navigationCount > 0) mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigationCount]);

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

  return (
    <>
      <ModeSwitcher
        view={view}
        isDark={isDark}
        onSwitchView={switchView}
        onToggleTheme={handleToggleTheme}
      />

      <LoginView hidden={view !== 'login'} onEnterWorkbench={() => switchView('workbench')} />

      <div
        id="view-workbench"
        className={`view-transition flex flex-col flex-1 h-screen overflow-hidden${view === 'login' ? ' view-hidden' : ''}`}
      >
        <Header
          title={moduleTitles[activeModule]}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen((open) => !open)}
          onNewDeal={() => setDealModalOpen(true)}
          onNewLead={() => setLeadModalOpen(true)}
          onOpenAiCopilot={() => switchModule('ai-copilot')}
          onLogout={() => {
            switchView('login');
            showToast('您已成功退出工作台');
          }}
        />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeModule={activeModule}
            hasNavigated={navigationCount > 0}
            onSwitchModule={switchModule}
          />

          <main
            id="main-content-viewport"
            ref={mainRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6"
          >
            <Dashboard
              ref={dashboardRef}
              active={isActive('dashboard')}
              isDark={isDark}
              onSwitchModule={switchModule}
              onOpenFollowup={openFollowupDrawer}
            />
            <Leads
              active={isActive('leads')}
              onOpenNewLead={() => setLeadModalOpen(true)}
              onConvertLead={convertLeadToDeal}
            />
            <Customers active={isActive('customers')} onOpenFollowup={openFollowupDrawer} />
            <Deals active={isActive('deals')} onOpenNewDeal={() => setDealModalOpen(true)} />
            <Contracts active={isActive('contracts')} />
            <Payments active={isActive('payments')} />
            <Products active={isActive('products')} />
            <Leaderboard active={isActive('leaderboard')} />
            <Analytics active={isActive('analytics')} isDark={isDark} />
            <AiCopilot active={isActive('ai-copilot')} />
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
