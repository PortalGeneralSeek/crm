import { useState, useEffect } from 'react';
import Icon from '../../../shared/Icon';

const STORAGE_KEY = 'acme_ai_llm_settings_v1';

export const DEFAULT_LLM_CONFIG = {
  mode: 'mock', // 'mock' | 'real'
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
};

export function getStoredLlmConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[getStoredLlmConfig] parse error', e);
  }
  return DEFAULT_LLM_CONFIG;
}

export function saveLlmConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[saveLlmConfig] save error', e);
  }
}

export default function AiSettingsModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(getStoredLlmConfig);

  useEffect(() => {
    if (open) {
      setForm(getStoredLlmConfig());
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveLlmConfig(form);
    if (onSave) onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Icon name="sliders" className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                AI 大模型接入引擎配置 (LLM API Settings)
              </h3>
              <p className="text-[11px] text-zinc-400">配置您自己的大模型 API 密钥以启用全真流式生成</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Mode Switcher */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              对话生成引擎模式
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'mock' })}
                className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
                  form.mode === 'mock'
                    ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                仿真演示引擎 (Mock)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'real' })}
                className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
                  form.mode === 'real'
                    ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                真实大模型 (OpenAI/DeepSeek)
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              {form.mode === 'mock'
                ? '内置 Figma 组件与思维链代码生成预设，无需配置密钥，开箱即用。'
                : '支持 OpenAI、DeepSeek、Gemini、Claude 代理或本地 Ollama 的标准兼容接口。'}
            </p>
          </div>

          {form.mode === 'real' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in duration-200">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API 接口基地址 (Base URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.openai.com/v1 或 https://api.deepseek.com"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-purple-500/40 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API Key (密钥) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-purple-500/40 outline-none"
                />
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  密钥仅保存在当前浏览器的 LocalStorage 中，不会上传至第三方服务器。
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    模型标识 (Model)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="gpt-4o-mini 或 deepseek-chat"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-purple-500/40 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    采样温度 (Temperature)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-purple-500/40 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setForm(DEFAULT_LLM_CONFIG);
                saveLlmConfig(DEFAULT_LLM_CONFIG);
              }}
              className="text-zinc-400 hover:text-zinc-600 text-xs font-medium"
            >
              恢复默认 (Reset)
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-primary hover:from-purple-500 hover:to-primary text-white text-xs font-semibold shadow-md shadow-purple-500/20"
              >
                保存配置
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
