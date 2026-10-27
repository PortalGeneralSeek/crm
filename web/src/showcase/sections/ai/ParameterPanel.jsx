import { useState } from 'react';
import Icon from '../../../shared/Icon';
import Select from '../../../shared/Select';
import { useToast } from '../../components/ToastProvider';

export default function ParameterPanel() {
  const { showToast } = useToast();
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [model, setModel] = useState('Gemini 3.8 Flash (High)');

  return (
    <>
      <div className="lg:col-span-3 border-l border-zinc-200 dark:border-zinc-800/90 p-5 flex flex-col justify-between bg-zinc-50/60 dark:bg-[#101113] overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-xs flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Icon name="sliders" className="w-4 h-4 text-primary" />
              调参引擎 (Engine Settings)
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">v3.8</span>
          </div>
          {/* Foundation Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Foundation Model
            </label>{' '}
            <Select
              fullWidth
              size="md"
              value={model}
              onChange={(val) => setModel(val)}
              options={[
                { value: 'Gemini 3.8 Flash (High)', label: 'Gemini 3.8 Flash (High)' },
                { value: 'Gemini 3.7 Pro (Max)', label: 'Gemini 3.7 Pro (Max)' },
                { value: 'Claude 3.5 Sonnet', label: 'Claude 3.5 Sonnet' },
                { value: 'GPT-4o', label: 'GPT-4o' },
              ]}
            />
          </div>
          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Temperature (随机性)
              </label>
              <span id="tempValue" className="font-mono text-primary font-bold">
                {temperature}
              </span>
            </div>{' '}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              className="w-full accent-primary"
            />{' '}
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>严谨 (0.0)</span>
              <span>创意 (1.0)</span>
            </div>
          </div>
          {/* Max Tokens Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Max Tokens</label>
              <span id="tokensValue" className="font-mono text-primary font-bold">
                {maxTokens}
              </span>
            </div>{' '}
            <input
              type="range"
              min="512"
              max="8192"
              step="512"
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full accent-primary"
            />
          </div>
          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              System Instructions
            </label>{' '}
            <textarea
              rows="5"
              className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-primary leading-relaxed font-mono custom-scrollbar"
              defaultValue={
                'You are Acme AI Copilot. Adhere strictly to the NextUI / HeroUI Figma tokens, Auto Layout, and accessibility guidelines.'
              }
            />
          </div>
        </div>
        <button
          onClick={() => showToast('调参策略已实时应用到 AI 对话流！', 'success')}
          className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold transition-all shadow-xs"
        >
          应用当前参数配置
        </button>
      </div>
    </>
  );
}
