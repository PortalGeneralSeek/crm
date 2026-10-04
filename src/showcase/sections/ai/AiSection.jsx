import { useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import AiHeader from './AiHeader';
import AiSettingsModal from './AiSettingsModal';
import ChatComposer from './ChatComposer';
import ChatToolbar from './ChatToolbar';
import { AiMessage, SeedThread, UserMessage, WelcomeCard } from './ChatMessages';
import ParameterPanel from './ParameterPanel';
import SessionsSidebar from './SessionsSidebar';

export default function AiSection({ active, ai }) {
  const { showToast } = useToast();
  const [webSearch, setWebSearch] = useState(false);
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { chat, inputRef, containerRef, createNewChat, handleSubmit, sendQuickPrompt, selectChatSession } =
    ai;

  const toggleWebSearch = () => {
    const next = !webSearch;
    setWebSearch(next);
    showToast(next ? '已启用实时联网搜索 🌐' : '已关闭联网搜索', 'info');
  };

  const toggleDeepReasoning = () => {
    const next = !deepReasoning;
    setDeepReasoning(next);
    showToast(next ? '已启用深度思维链推理 🧠' : '已切换为普通推理模式', 'info');
  };

  return (
    <section id="section-ai" className={`tab-section space-y-8${active ? '' : ' hidden'}`}>
      <AiHeader onNewChat={createNewChat} onOpenSettings={() => setSettingsOpen(true)} />

      {/* 3-Column Immersive AI Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[760px] bg-white dark:bg-[#141518] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm overflow-hidden">
        <SessionsSidebar onNewChat={createNewChat} onSelectSession={selectChatSession} />

        {/* Center Column: Core Chat Canvas */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full bg-white dark:bg-[#141518] relative">
          <ChatToolbar onNewChat={createNewChat} />

          <div
            id="chatMessagesContainer"
            ref={containerRef}
            className="flex-1 p-5 overflow-y-auto space-y-6 custom-scrollbar"
          >
            <WelcomeCard
              key={chat.welcome}
              variant={chat.welcome}
              hidden={chat.welcomeHidden}
              onQuickPrompt={sendQuickPrompt}
            />
            {chat.seedThread && <SeedThread />}
            {chat.messages.map((message) =>
              message.role === 'user' ? (
                <UserMessage key={message.key} domId={message.domId} text={message.text} />
              ) : (
                <AiMessage
                  key={message.key}
                  domId={message.domId}
                  done={message.done}
                  text={message.text}
                  thinkingLines={message.thinkingLines}
                  filename={message.filename}
                  code={message.code}
                  error={message.error}
                  durationMs={message.durationMs}
                />
              ),
            )}
          </div>

          <ChatComposer
            inputRef={inputRef}
            onSubmit={handleSubmit}
            webSearch={webSearch}
            deepReasoning={deepReasoning}
            onToggleWebSearch={toggleWebSearch}
            onToggleDeepReasoning={toggleDeepReasoning}
          />
        </div>

        <ParameterPanel />
      </div>

      <AiSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => showToast('AI 大模型接入配置已成功保存 ✨', 'success')}
      />
    </section>
  );
}
