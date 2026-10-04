import { useEffect, useState, Suspense, lazy } from 'react';
import CodeModal from './components/CodeModal';
import CommandMenu from './components/CommandMenu';
import Header from './components/Header';
import { useToast } from './components/ToastProvider';
import { useTheme } from './hooks/useTheme';
import { useHashRoute } from '../shared/useHashRoute';
import useAiChat from './sections/ai/useAiChat';

// Code splitting & lazy loading for showcase sections
const ApplicationSection = lazy(() => import('./sections/application/ApplicationSection'));
const AiSection = lazy(() => import('./sections/ai/AiSection'));
const MarketingSection = lazy(() => import('./sections/MarketingSection'));
const EcommerceSection = lazy(() => import('./sections/EcommerceSection'));
const ChartsSection = lazy(() => import('./sections/ChartsSection'));

function SectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-6 bg-white dark:bg-[#141518] rounded-3xl border border-zinc-200 dark:border-zinc-800">
      <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
      <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />
    </div>
  );
}

export default function App() {
  const { showToast } = useToast();
  const { isDark, toggle } = useTheme();
  const { path, navigate } = useHashRoute('/application');

  const segments = path.replace(/^\//, '').split('/');
  const activeTab = segments[0] || 'application';
  const subView = segments[1] || 'overview';

  const ai = useAiChat({ showToast });
  const { createNewChat } = ai;

  const [hasSwitched, setHasSwitched] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const switchTab = (tabId) => {
    navigate(`/${tabId}`);
    setHasSwitched(true);
  };

  const switchSubView = (newSub) => {
    navigate(`/application/${newSub}`);
  };

  const toggleTheme = () => {
    const nextDark = toggle();
    showToast(nextDark ? '已切换至暗黑模式 🌙' : '已切换至浅色模式 ☀️', 'info');
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
        setCodeOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createNewChat]);

  return (
    <>
      <Header
        activeTab={activeTab}
        hasSwitched={hasSwitched}
        isDark={isDark}
        onSwitchTab={switchTab}
        onOpenCommand={() => setCommandOpen(true)}
        onOpenCode={() => setCodeOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <Suspense fallback={<SectionSkeleton />}>
          {activeTab === 'application' && (
            <ApplicationSection
              active={true}
              subView={subView}
              onSwitchSubView={switchSubView}
            />
          )}
          {activeTab === 'ai' && <AiSection active={true} ai={ai} />}
          {activeTab === 'marketing' && (
            <MarketingSection active={true} onOpenCode={() => setCodeOpen(true)} />
          )}
          {activeTab === 'ecommerce' && <EcommerceSection active={true} />}
          {activeTab === 'charts' && <ChartsSection active={true} isDark={isDark} />}
        </Suspense>
      </main>

      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(tabId) => {
          switchTab(tabId);
          setCommandOpen(false);
        }}
      />
      <CodeModal open={codeOpen} onClose={() => setCodeOpen(false)} />
    </>
  );
}
