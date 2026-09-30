import { useEffect, useState } from 'react';
import CodeModal from './components/CodeModal';
import CommandMenu from './components/CommandMenu';
import Header from './components/Header';
import { useToast } from './components/ToastProvider';
import { useTheme } from './hooks/useTheme';
import ChartsSection from './sections/ChartsSection';
import EcommerceSection from './sections/EcommerceSection';
import MarketingSection from './sections/MarketingSection';
import AiSection from './sections/ai/AiSection';
import useAiChat from './sections/ai/useAiChat';
import ApplicationSection from './sections/application/ApplicationSection';

export default function App() {
  const { showToast } = useToast();
  const { isDark, toggle } = useTheme();
  const ai = useAiChat({ showToast });
  const { createNewChat } = ai;

  const [activeTab, setActiveTab] = useState('application');
  const [hasSwitched, setHasSwitched] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setHasSwitched(true);
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
        <ApplicationSection active={activeTab === 'application'} />
        <AiSection active={activeTab === 'ai'} ai={ai} />
        <MarketingSection active={activeTab === 'marketing'} onOpenCode={() => setCodeOpen(true)} />
        <EcommerceSection active={activeTab === 'ecommerce'} />
        <ChartsSection active={activeTab === 'charts'} isDark={isDark} />
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
