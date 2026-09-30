import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const REPLY_DELAY_MS = 1000;

const INITIAL_STATE = { welcome: 'initial', welcomeHidden: false, seedThread: true, messages: [] };
const EMPTY_STATE = { welcome: 'new', welcomeHidden: false, seedThread: false, messages: [] };

export default function useAiChat({ showToast }) {
  const [chat, setChat] = useState(INITIAL_STATE);
  const chatRef = useRef(chat);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const responding = useRef(false);
  const nextKey = useRef(0);
  const timers = useRef(new Set());
  const firstRun = useRef(true);

  // The reply timer looks the message up again, so the latest state is mirrored synchronously.
  const update = useCallback((updater) => {
    chatRef.current = updater(chatRef.current);
    setChat(chatRef.current);
  }, []);

  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [chat.messages, chat.welcome]);

  useLayoutEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const createNewChat = useCallback(() => {
    update(() => EMPTY_STATE);
    showToast('已创建新对话 ✨');
  }, [showToast, update]);

  const sendMessage = useCallback(() => {
    if (responding.current) return;
    const input = inputRef.current;
    const text = input.value.trim();
    if (!text) return;

    const stamp = Date.now();
    const userMessage = { key: nextKey.current++, domId: `user-msg-${stamp}`, role: 'user', text };
    const aiMessage = { key: nextKey.current++, domId: `ai-msg-${stamp}`, role: 'ai', done: false };
    update((state) => ({
      ...state,
      welcomeHidden: true,
      messages: [...state.messages, userMessage, aiMessage],
    }));
    input.value = '';
    responding.current = true;

    const timer = setTimeout(() => {
      timers.current.delete(timer);
      // A "new chat" while the reply is pending removes the message; the original then
      // returns early without releasing the lock, so the chat stays busy until reload.
      if (!chatRef.current.messages.some((m) => m.key === aiMessage.key)) return;
      update((state) => ({
        ...state,
        messages: state.messages.map((m) => (m.key === aiMessage.key ? { ...m, done: true } : m)),
      }));
      responding.current = false;
    }, REPLY_DELAY_MS);
    timers.current.add(timer);
  }, [update]);

  const handleSubmit = useCallback(
    (event) => {
      event?.preventDefault?.();
      sendMessage();
    },
    [sendMessage],
  );

  const sendQuickPrompt = useCallback(
    (text) => {
      const input = inputRef.current;
      if (input) {
        input.value = text;
        input.focus();
      }
      sendMessage();
    },
    [sendMessage],
  );

  const selectChatSession = useCallback(
    (title) => {
      createNewChat();
      sendQuickPrompt(`恢复会话主题：${title}`);
    },
    [createNewChat, sendQuickPrompt],
  );

  return {
    chat,
    inputRef,
    containerRef,
    createNewChat,
    handleSubmit,
    sendQuickPrompt,
    selectChatSession,
  };
}
