import { useRef, useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

const PROMPTS = {
  meeting:
    '今天与大华股份技术VP孙总及采购处进行商务复盘。客户主要关心：1. 视频流解析时吞吐是否有丢帧；2. 首付款能否降低至 40%；3. 能否在下周三安排2名工程师驻场。',
  pitch:
    '面对顺丰科技提及某友商报价比我们低 15% 并承诺赠送二期算力，销售应该如何进行差异化价值防守？',
  research: '请检索并输出 蔚来汽车 (NIO) 最新智能座舱软件招投标动态与主要决策人背景矩阵。',
};

const MEETING_RESULT = `【AI 拜访纪要萃取 & CRM 自动归档字段】
• 客户主体：浙江大华技术股份有限公司
• 关键联系人：孙志宏 (技术VP)
• 商务诉求：要求调整首付比例至 40% (当前为 50%)
• 技术痛点：高吞吐低延迟与避免丢帧 SLA
• 建议策略：
  1. 同意首付 45% 折中方案，但要求缩短验收测试周期为 10 个工作日；
  2. 承诺提供 2 名驻场专家，并写入正式合同服务附件。
• 赢单概率：92% ↑ (建议发起总监特批合同流程)`;

const PITCH_RESULT = `【AI 竞对防御策略卡片】
1. 算力成本陷阱：友商虽然赠送二期算力，但采用专有封闭协议，后续扩展硬件费用将高出 40%；
2. 稳定性背书：我司在理想汽车与微盟均有实际亿级并发线上经验，故障恢复时间 < 30 秒；
3. 话术推荐：“林总，采购系统就像买车，省下 15% 的初装费，如果因为高峰期延迟导致调度停滞，每小时损失远超数十万。领航提供的是 7×24 驻场确定性。”`;

const RESEARCH_RESULT = `【AI 潜客 360° 深度背调简报】
• 企业主体：蔚来汽车 (NIO Inc.)
• 决策链关键人：智能座舱副总裁、车联网采购高级总监
• 最新动态：Q2 财报披露座舱 AI 多模态交互研发预算同比增长 45%
• 推荐破局点：从车内语音降噪大模型插件切入，建议协同售前架构师预约线上 PoC。`;

const LOADING_RESULT = '领航销售大模型正在深度解析并重构 CRM 商业洞察，请稍候...';

// Matches the whitespace of the static markup, which is significant under whitespace-pre-wrap.
const INITIAL_RESULT =
  '\n【领航 AI 已就绪】\n请在左侧选择快捷指令，或输入任何大客户跟进情况。\nAI 将为您即刻生成：\n1. 规范化 CRM 商机跟进纪要\n2. 赢单概率评估与风险诊断\n3. 下一步精准触达策略与沟通邮件草稿\n                ';

// Line breaks become <br> elements, as they do when assigning to innerText.
function renderLines(text) {
  return text.split('\n').flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]));
}

export default function AiCopilot({ active }) {
  const showToast = useToast();
  const resultRef = useRef(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const executeAiCopilot = (rawText) => {
    const text = rawText.trim();
    if (!text) {
      showToast('请输入销售指令或纪要文本');
      return;
    }

    setResult(LOADING_RESULT);

    setTimeout(() => {
      if (text.includes('大华')) setResult(MEETING_RESULT);
      else if (text.includes('顺丰')) setResult(PITCH_RESULT);
      else setResult(RESEARCH_RESULT);
      showToast('AI 深度解析已完成！', 'success');
    }, 400);
  };

  const runAiCopilotPrompt = (type) => {
    const prompt = PROMPTS[type] || PROMPTS.research;
    setInput(prompt);
    executeAiCopilot(prompt);
  };

  const copyAiWorkbenchResult = () => {
    const text = resultRef.current.innerText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('分析结果已复制到剪贴板！'));
    } else {
      showToast('结果已复制！');
    }
  };

  return (
    <div id="module-ai-copilot" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
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
              大模型赋能
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            潜客全景背调透视、客户拜访速记智能萃取 CRM 字段与大客户谈判话术推演
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Copilot Prompting (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="sparkles" className="w-4 h-4 text-purple-500" />
            智能销售指令助手
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => runAiCopilotPrompt('meeting')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors"
            >
              <div className="font-bold text-xs">📝 拜访纪要萃取</div>
              <div className="text-[10px] text-zinc-400 mt-1">录音文本提取商机要素</div>
            </button>
            <button
              onClick={() => runAiCopilotPrompt('pitch')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors"
            >
              <div className="font-bold text-xs">🎯 竞对防守话术</div>
              <div className="text-[10px] text-zinc-400 mt-1">破解客户压价与竞品对比</div>
            </button>
            <button
              onClick={() => runAiCopilotPrompt('research')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors"
            >
              <div className="font-bold text-xs">🏢 潜客 360° 背调</div>
              <div className="text-[10px] text-zinc-400 mt-1">检索企业招投标与决策人</div>
            </button>
          </div>
          {/* Interactive Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              输入您的销售指令或粘贴沟通记录：
            </label>{' '}
            <textarea
              id="ai-workbench-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows="4"
              placeholder="例如：今天与顺丰科技林总开会，对方表示预算约80万，希望能两周内上线，重点担心系统峰值并发延迟..."
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />{' '}
            <div className="flex justify-end">
              <button
                onClick={() => executeAiCopilot(input)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5"
              >
                <Icon name="send" className="w-3.5 h-3.5" />
                <span>立即让 AI 深度解析</span>
              </button>
            </div>
          </div>
        </div>
        {/* Right AI Response Terminal (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900 text-zinc-100 p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-zinc-300">AI 输出结果</span>
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
              className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap"
              ref={resultRef}
            >
              {result === null ? INITIAL_RESULT : renderLines(result)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
            <span>模型引擎: Navigator CRM LLM 2.5</span>
            <span>响应延迟: ~180ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
