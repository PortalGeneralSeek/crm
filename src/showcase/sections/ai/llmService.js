import { getStoredLlmConfig } from './AiSettingsModal';

const MOCK_PRESETS = [
  {
    keywords: ['表格', 'table', '分页', '列表', 'nextui'],
    thinking: [
      '1. 检索 Figma File `UGv1yrGRKKFxjXMBk4tnt3` 中 Table 组件规范...',
      '2. 配置多选 (Selection)、列排序 (Sorting)、状态标签与复合过滤机制...',
      '3. 生成具有 WCAG AA 无障碍标准的 NextUI 风格 Table 组件代码...',
    ],
    filename: 'ProTable.tsx',
    code: `import React, { useState } from 'react';
import { Search, ChevronDown, Filter, MoreHorizontal } from 'lucide-react';

export function ProTable({ data = [], columns = [] }) {
  const [query, setQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const filtered = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(query.toLowerCase())
    )
  );

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800/80 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索关键词..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-400" /> 筛选
          </button>
        </div>
      </div>

      {/* Table Viewport */}
      <table className="w-full text-xs text-left">
        <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b border-zinc-200/80 dark:border-zinc-800">
          <tr>
            <th className="p-3 w-10 text-center">
              <input type="checkbox" className="rounded text-primary" />
            </th>
            {columns.map((c) => (
              <th key={c.key} className="p-3">{c.title}</th>
            ))}
            <th className="p-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filtered.map((row, idx) => (
            <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
              <td className="p-3 text-center">
                <input type="checkbox" className="rounded text-primary" />
              </td>
              {columns.map((c) => (
                <td key={c.key} className="p-3 text-zinc-800 dark:text-zinc-200">{row[c.key]}</td>
              ))}
              <td className="p-3 text-right">
                <button className="p-1 rounded-lg hover:bg-zinc-150 text-zinc-400 hover:text-zinc-600">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
    explanation: '已为你生成高度解耦的 ProTable 组件，采用 Tailwind CSS 与标准语义化 HTML5 表格规范，完美适配 Acme Pro Components 暗黑模式。',
  },
  {
    keywords: ['figma', 'token', '令牌', '设计', '规范', 'color'],
    thinking: [
      '1. 检索 Figma File `UGv1yrGRKKFxjXMBk4tnt3` 样式字典与 Token 命名集...',
      '2. 提取系统主色 Primary (`#006FEE`)、Success (`#17C964`)、Neutrals 阶梯...',
      '3. 生成 tailwind.config.js 与 CSS 自定义变量映射声明...',
    ],
    filename: 'themeTokens.css',
    code: `:root {
  /* Acme Pro Components Design Tokens */
  --primary: 212 100% 47%;       /* #006FEE - Figma Primary Blue */
  --primary-hover: 212 100% 42%;
  --primary-foreground: 0 0% 100%;

  --success: 146 79% 44%;       /* #17C964 - Figma Success Green */
  --warning: 37 91% 55%;        /* #F5A524 - Warning Amber */
  --danger: 339 90% 51%;        /* #F31260 - Danger Rose */

  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
}

[data-theme='dark'] {
  --background: 240 6% 8%;      /* #141518 */
  --surface: 240 5% 10%;       /* #18191c */
  --border: 240 4% 16%;        /* #27272a */
}`,
    explanation: '已从 Figma 文件提取出当前系统的核心设计系统令牌 (Design Tokens)，涵盖色阶、状态色与圆角层级系统。',
  },
];

const DEFAULT_MOCK = {
  thinking: [
    '1. 解析用户指令意图与业务上下文约束...',
    '2. 检索 Figma File `UGv1yrGRKKFxjXMBk4tnt3` 中的组件规范与 Auto-layout 约束...',
    '3. 匹配 Tailwind CSS 与 WCAG 2.1 AA 级色彩对比度与响应式断点...',
  ],
  filename: 'ResponsiveComponent.tsx',
  code: `import React from 'react';

export function ProWidget({ title, badge = "Active" }: { title: string; badge?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {badge}
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        完美对齐 Figma Token: var(--radius-lg) 与 var(--color-primary)。
      </p>
    </div>
  );
}`,
  explanation: '已为你基于 pro-components 设计规范生成完整的前端组件代码，支持完整的暗黑主题自适应：',
};

/**
 * Streams response using real OpenAI-compatible Chat Completions API with SSE
 */
export async function streamRealLlm({ config, messages, onChunk, onDone, onError, signal }) {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const apiMessages = [
    {
      role: 'system',
      content:
        'You are Acme AI Studio, an elite frontend engineer and design system expert proficient in React, Tailwind CSS, NextUI, and Figma token specifications. Answer cleanly with concise explanations and well-structured code snippets using markdown code blocks.',
    },
    ...messages.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : m.role,
      content: m.text || '',
    })),
  ];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        temperature: config.temperature ?? 0.7,
        stream: true,
        messages: apiMessages,
      }),
      signal,
    });

    if (!response.ok) {
      let errText = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) errText += `: ${errJson.error.message}`;
      } catch {
        // ignore json parse error
      }
      throw new Error(errText);
    }

    if (!response.body) {
      throw new Error('未接收到可读数据流 (ReadableStream unavailable)');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    let accumulatedReasoning = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Handle DeepSeek / R1 reasoning stream
          if (delta.reasoning_content) {
            accumulatedReasoning += delta.reasoning_content;
          }
          if (delta.content) {
            accumulatedText += delta.content;
          }

          onChunk({
            text: accumulatedText,
            reasoning: accumulatedReasoning,
            done: false,
          });
        } catch {
          // Ignore incomplete JSON chunks in SSE
        }
      }
    }

    onDone({
      text: accumulatedText,
      reasoning: accumulatedReasoning,
    });
  } catch (err) {
    if (signal?.aborted) return;
    onError(err);
  }
}

/**
 * Simulates a high-speed streaming typing effect for mock mode
 */
export function streamMockLlm({ prompt, onChunk, onDone, signal }) {
  const lower = prompt.toLowerCase();
  const matched =
    MOCK_PRESETS.find((p) => p.keywords.some((k) => lower.includes(k))) || DEFAULT_MOCK;

  const fullMarkdown = `${matched.explanation}

\`\`\`tsx
// ${matched.filename}
${matched.code}
\`\`\``;

  let index = 0;
  const chunkSize = Math.max(8, Math.floor(fullMarkdown.length / 25));
  let currentText = '';

  const timer = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(timer);
      return;
    }

    index += chunkSize;
    if (index >= fullMarkdown.length) {
      clearInterval(timer);
      onDone({
        text: fullMarkdown,
        thinkingLines: matched.thinking,
        filename: matched.filename,
        code: matched.code,
      });
    } else {
      currentText = fullMarkdown.slice(0, index);
      onChunk({
        text: currentText,
        thinkingLines: matched.thinking,
        done: false,
      });
    }
  }, 40);

  return () => clearInterval(timer);
}
