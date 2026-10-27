import { useRef, useState } from 'react';
import Icon from '../../shared/Icon';
import { crmApi, useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

const PROMPTS = {
  deals: '帮我全面分析当前 CRM 中的商机推进进度、漏斗健康度与业绩预期。',
  contracts: '排查当前系统中所有待总监审批签署的合同清单与法务履约风控建议。',
  customer: '为大华股份/海康威视等战略重点大客户量身定制商务投标与跟进突破方案。',
  defense: '面对客户提出友商报价低 15% 并承诺赠送二期算力，销售应如何进行差异化价值防守？',
};

const INITIAL_RESULT = `【领航 CRM · 企业级 AI 销售智能体已就绪】
已深度连通实时 MySQL 核心业务库（商机看板、合同审批链、回款流水、客户画像）。
请在左侧选择快捷指令，或直接输入任何大客户跟进、业绩诊断或条款策略诉求。
AI 将为您即刻生成：
1. 规范化 CRM 商业洞察与风险排查
2. 赢单概率评估与策略攻坚推荐
3. 下一步精准触达策略与沟通话术`;

export default function AiCopilot({ active }) {
  const showToast = useToast();
  const auth = useAuth();
  const resultRef = useRef(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(INITIAL_RESULT);
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('ready');

  const executeAiCopilot = async (rawText) => {
    const text = (rawText || input).trim();
    if (!text) {
      showToast('请输入销售指令或分析诉求', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await crmApi.chatAi(text);
      if (res.data?.answer) {
        setResult(res.data.answer);
        setActionType(res.data.actionType || 'general');
        showToast('AI 深度解析已生成！', 'success');
      } else {
        setResult('AI 服务暂未返回分析内容，请稍后再试。');
      }
    } catch (err) {
      console.error(err);
      showToast(`AI 解析失败: ${err.message}`, 'error');
      setResult(`请求 AI 服务异常: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAiCopilotPrompt = (type) => {
    const prompt = PROMPTS[type] || PROMPTS.deals;
    setInput(prompt);
    executeAiCopilot(prompt);
  };

  const copyAiWorkbenchResult = () => {
    const text = resultRef.current?.innerText || result;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('分析结果已复制到剪贴板！'));
    } else {
      showToast('结果已复制！');
    }
  };

  return (
    <div id="module-ai-copilot" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/20 p-6 rounded-2xl border border-purple-500/30 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Icon name="bot" className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              领航 AI 销售 Copilot 智能工作台
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20">
              实时数据联动 · GoFiber后端驱动
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            动态聚合 MySQL 真实商机/线索/合同数据、大模型商业诊断、客户谈判策略推演与话术生成
          </p>
        </div>
        <div className="text-xs text-zinc-400">
          当前提问身份: <strong className="text-purple-600 dark:text-purple-400">{auth.user?.realName || '销售团队'}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Copilot Prompting (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="sparkles" className="w-4 h-4 text-purple-500" />
            智能销售指令与快捷策略卡片
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => runAiCopilotPrompt('deals')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20"
            >
              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">📊 实时商机与业绩漏斗</div>
              <div className="text-[10px] text-zinc-400 mt-1">聚合在推商机规模与赢单率</div>
            </button>
            <button
              onClick={() => runAiCopilotPrompt('contracts')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20"
            >
              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">📑 待审合同与风控排查</div>
              <div className="text-[10px] text-zinc-400 mt-1">检索待总监审批的积压合同</div>
            </button>
            <button
              onClick={() => runAiCopilotPrompt('customer')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20"
            >
              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">🏢 重点大客商务攻坚方案</div>
              <div className="text-[10px] text-zinc-400 mt-1">软硬结合组合投标策略</div>
            </button>
            <button
              onClick={() => runAiCopilotPrompt('defense')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20"
            >
              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">🎯 竞对低价防御话术</div>
              <div className="text-[10px] text-zinc-400 mt-1">破解客户压价与友商赠送</div>
            </button>
          </div>

          {/* Interactive Input */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              输入您的销售指令、诊断诉求或大客户纪要：
            </label>
            <textarea
              id="ai-workbench-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows="4"
              placeholder="例如：帮我分析当前系统中金额超 100 万的重大商机，并给出本周销售总监的协同跟进建议..."
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end">
              <button
                onClick={() => executeAiCopilot(input)}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Icon name={loading ? 'loader' : 'send'} className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'AI 正在调取数据库并推理中...' : '立即让 AI 深度解析'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right AI Response Terminal (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900 text-zinc-100 p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-xs font-mono font-bold text-zinc-300">
                  {loading ? 'AI 智能体实时推理中...' : `AI 输出结果 (${actionType})`}
                </span>
              </div>
              <button
                onClick={copyAiWorkbenchResult}
                className="text-[11px] text-purple-400 hover:underline"
              >
                复制结果
              </button>
            </div>
            <div
              id="ai-workbench-result"
              className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-[420px] overflow-y-auto"
              ref={resultRef}
            >
              {result}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
            <span>引擎: CRM Intelligent Engine v2.0</span>
            <span>状态: 数据库实时在线</span>
          </div>
        </div>
      </div>
    </div>
  );
}
