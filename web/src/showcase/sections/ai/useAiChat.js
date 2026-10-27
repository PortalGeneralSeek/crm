import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { getStoredLlmConfig } from './AiSettingsModal';
import { streamMockLlm, streamRealLlm } from './llmService';

const INITIAL_STATE = { welcome: 'initial', welcomeHidden: false, seedThread: true, messages: [] };
const EMPTY_STATE = { welcome: 'new', welcomeHidden: false, seedThread: false, messages: [] };

export default function useAiChat({ showToast }) {
  const [chat, setChat] = useState(INITIAL_STATE);
  const chatRef = useRef(chat);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const responding = useRef(false);
  const nextKey = useRef(0);
  const activeAbort = useRef(null);
  const firstRun = useRef(true);

  // Synchronously mirrors the latest state
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
    return () => {
      if (activeAbort.current) {
        activeAbort.current.abort();
      }
    };
  }, []);

  const createNewChat = useCallback(() => {
    if (activeAbort.current) {
      activeAbort.current.abort();
      activeAbort.current = null;
    }
    responding.current = false;
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
    const aiMsgKey = nextKey.current++;
    const aiMessage = {
      key: aiMsgKey,
      domId: `ai-msg-${stamp}`,
      role: 'ai',
      done: false,
      text: '',
      thinkingLines: [],
      error: null,
      startTime: stamp,
    };

    update((state) => ({
      ...state,
      welcomeHidden: true,
      messages: [...state.messages, userMessage, aiMessage],
    }));

    input.value = '';
    responding.current = true;

    const abortController = new AbortController();
    activeAbort.current = abortController;

    const config = getStoredLlmConfig();

    if (config.mode === 'real' && config.apiKey?.trim()) {
      showToast(`正在通过 ${config.model} 实时生成响应...`, 'info');
      streamRealLlm({
        config,
        messages: chatRef.current.messages,
        signal: abortController.signal,
        onChunk: ({ text: streamedText, reasoning }) => {
          update((state) => ({
            ...state,
            messages: state.messages.map((m) =>
              m.key === aiMsgKey
                ? {
                    ...m,
                    text: streamedText,
                    thinkingLines: reasoning ? reasoning.split('\n').filter(Boolean) : m.thinkingLines,
                  }
                : m
            ),
          }));
        },
        onDone: ({ text: finalText, reasoning }) => {
          responding.current = false;
          activeAbort.current = null;
          update((state) => ({
            ...state,
            messages: state.messages.map((m) =>
              m.key === aiMsgKey
                ? {
                    ...m,
                    done: true,
                    text: finalText,
                    thinkingLines: reasoning ? reasoning.split('\n').filter(Boolean) : m.thinkingLines,
                    durationMs: Date.now() - stamp,
                  }
                : m
            ),
          }));
        },
        onError: (err) => {
          responding.current = false;
          activeAbort.current = null;
          update((state) => ({
            ...state,
            messages: state.messages.map((m) =>
              m.key === aiMsgKey
                ? {
                    ...m,
                    done: true,
                    error: err.message || '大模型请求失败，请检查网络或 API 配置。',
                  }
                : m
            ),
          }));
          showToast(`LLM 请求失败: ${err.message}`, 'error');
        },
      });
    } else {
      if (config.mode === 'real' && !config.apiKey?.trim()) {
        showToast('未检测到 API 密钥，已切换至内置演示引擎', 'info');
      }

      streamMockLlm({
        prompt: text,
        signal: abortController.signal,
        onChunk: ({ text: streamedText, thinkingLines }) => {
          update((state) => ({
            ...state,
            messages: state.messages.map((m) =>
              m.key === aiMsgKey ? { ...m, text: streamedText, thinkingLines } : m
            ),
          }));
        },
        onDone: ({ text: finalText, thinkingLines, filename, code }) => {
          responding.current = false;
          activeAbort.current = null;
          update((state) => ({
            ...state,
            messages: state.messages.map((m) =>
              m.key === aiMsgKey
                ? {
                    ...m,
                    done: true,
                    text: finalText,
                    thinkingLines,
                    filename,
                    code,
                    durationMs: Date.now() - stamp,
                  }
                : m
            ),
          }));
        },
      });
    }
  }, [showToast, update]);

  const handleSubmit = useCallback(
    (event) => {
      event?.preventDefault?.();
      sendMessage();
    },
    [sendMessage]
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
    [sendMessage]
  );

  const selectChatSession = useCallback(
    (title) => {
      createNewChat();
      sendQuickPrompt(`恢复会话主题：${title}`);
    },
    [createNewChat, sendQuickPrompt]
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
