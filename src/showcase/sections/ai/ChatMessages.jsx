import { useEffect, useRef, useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';
import { LOGIN_CARD_CODE, RESPONSIVE_COMPONENT_CODE } from './codeSamples';

const COPIED_RESET_MS = 2000;

const QUICK_PROMPTS_INITIAL = [
  {
    prompt: '生成一个带搜索与分页的 NextUI 风格表格组件',
    icon: 'table',
    iconColor: 'text-primary',
    title: '生成 React 表格组件',
    hint: '多选、状态标签与操作工具条',
  },
  {
    prompt: '解析 Figma pro-components 设计系统中的颜色令牌规范',
    icon: 'palette',
    iconColor: 'text-purple-500',
    title: '解析 Figma 颜色令牌',
    hint: '提取 Primary、Success 与 Neutrals',
  },
  {
    prompt: '为登录与注册认证模块编写具有安全校验的 Form 组件',
    icon: 'shield-check',
    iconColor: 'text-emerald-500',
    title: '安全认证 Form 组件',
    hint: 'Google/GitHub 快速登录集成',
  },
  {
    prompt: '生成一个带暗黑模式平滑渐变的 Chart.js 面积趋势图',
    icon: 'line-chart',
    iconColor: 'text-amber-500',
    title: '编写可视化趋势图',
    hint: '平滑贝塞尔曲线与自适应暗色',
  },
];

const QUICK_PROMPTS_NEW = [
  { ...QUICK_PROMPTS_INITIAL[0], hint: '带状态标签、分页栏与多选操作工具条' },
  { ...QUICK_PROMPTS_INITIAL[1], hint: '提取 Primary、Success、Danger 与 Neutrals' },
  { ...QUICK_PROMPTS_INITIAL[2], hint: '包含第三方 Google/GitHub 登录与密码可见切换' },
  { ...QUICK_PROMPTS_INITIAL[3], hint: '贝塞尔平滑曲线与动态 Tooltip 提示框' },
];

const STYLES = {
  initial: {
    root: 'py-8 px-2 text-center max-w-lg mx-auto space-y-5',
    badge:
      'w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-primary text-white flex items-center justify-center mx-auto shadow-xl shadow-primary/20 ring-4 ring-primary/10',
    badgeIcon: 'w-7 h-7',
    title: 'text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100',
    text: 'text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed',
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2',
    card: 'p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-750 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group',
    hint: 'text-[10px] text-zinc-400',
  },
  new: {
    root: 'py-12 px-4 text-center max-w-xl mx-auto space-y-6',
    badge:
      'w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-primary text-white flex items-center justify-center mx-auto shadow-xl shadow-primary/20 ring-8 ring-primary/10',
    badgeIcon: 'w-8 h-8',
    title: 'text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100',
    text: 'text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed',
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-left',
    card: 'p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group',
    hint: 'text-[11px] text-zinc-400',
  },
};

export function WelcomeCard({ variant, hidden, onQuickPrompt }) {
  const s = STYLES[variant];
  const prompts = variant === 'initial' ? QUICK_PROMPTS_INITIAL : QUICK_PROMPTS_NEW;
  return (
    <div id="aiWelcomeCard" className={s.root} style={hidden ? { display: 'none' } : undefined}>
      <div className={s.badge}>
        <Icon name="sparkles" className={s.badgeIcon} />
      </div>
      <div>
        <h3 className={s.title}>Acme AI Studio</h3>
        <p className={s.text}>
          {variant === 'initial'
            ? '专为前端开发与设计系统打造的下一代 AI 编程助理，已完整挂载 Figma pro-components 核心规范。'
            : '新会话已开启。你可以随时向我提问关于组件构建、样式重构、Figma 设计提取或前后端架构的任何问题。'}
        </p>
      </div>
      <div className={s.grid}>
        {prompts.map((item) => (
          <button key={item.prompt} onClick={() => onQuickPrompt(item.prompt)} className={s.card}>
            <div className="flex items-center gap-2 font-semibold text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary">
              <Icon name={item.icon} className={`w-4 h-4 ${item.iconColor}`} /> {item.title}
            </div>
            <p className={s.hint}>{item.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CodeWindow({ filename, code }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    });
  };

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-950 text-zinc-100 text-[11px] font-mono border border-zinc-800 shadow-xl">
      <div className="px-4 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-zinc-400 text-[11px] ml-2 font-sans font-medium">{filename}</span>
        </div>
        <button
          onClick={copy}
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-[11px] transition-colors"
        >
          {copied ? (
            <>
              <Icon name="check" className="w-3 h-3 text-emerald-400" /> 已复制！
            </>
          ) : (
            <>
              <Icon name="copy" className="w-3 h-3" /> 复制代码
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-emerald-400 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FeedbackButton({ icon, onClick, children }) {
  return (
    <button onClick={onClick} className="hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
      <Icon name={icon} className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

// The original rotates the chevron with an inline style the first time the block is toggled.
// The chevron is re-created when the reply finishes, so each phase keeps its own rotation.
function useThinkingToggle(done) {
  const [open, setOpen] = useState(true);
  const [rotation, setRotation] = useState({ thinking: '', done: '' });
  const phase = done ? 'done' : 'thinking';
  const toggle = () => {
    setOpen(!open);
    setRotation((r) => ({ ...r, [phase]: open ? 'rotate(-90deg)' : 'rotate(0deg)' }));
  };
  return { open, toggle, transform: rotation[phase] };
}

function ThinkingBlock({ done, seeded, lines }) {
  const { open, toggle, transform } = useThinkingToggle(done);

  let buttonClass;
  let contentBorder;
  if (seeded) {
    buttonClass =
      'w-full flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[11px] hover:underline';
    contentBorder = 'border-emerald-500/40';
  } else {
    buttonClass =
      'w-full flex items-center justify-between text-zinc-500 dark:text-zinc-400 font-mono text-[11px] hover:text-primary transition-colors';
    contentBorder = 'border-primary/30';
  }

  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2">
      <button onClick={toggle} className={buttonClass}>
        {seeded || done ? (
          <span
            className={
              seeded
                ? 'flex items-center gap-2'
                : 'flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold'
            }
          >
            <Icon name="check" className="w-3.5 h-3.5" />
            <span>Thought Process (已思考 3.2 秒 · 深度推理完成)</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Thinking Process (思考中...)</span>
          </span>
        )}
        <Icon
          name="chevron-down"
          className={seeded || !done ? 'w-3.5 h-3.5 transition-transform' : 'w-3.5 h-3.5'}
          style={transform ? { transform } : undefined}
        />
      </button>
      <div
        className={`thinking-content text-[11px] text-zinc-400 font-mono leading-relaxed pl-4 border-l-2 ${contentBorder} space-y-1${open ? '' : ' hidden'}`}
      >
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

const SEED_THINKING = [
  '1. 检索 Figma File `UGv1yrGRKKFxjXMBk4tnt3` 中 Node `92:10559` 规格参数...',
  '2. 应用圆角规范 `var(--radius-lg)` (16px) 与主色 `#006fee`...',
  '3. 封装第三方 OAuth 2.0 按钮与表单校验逻辑...',
];

const LIVE_THINKING = [
  '1. 解析用户指令意图与设计系统契约...',
  '2. 检索 Figma File (UGv1yrGRKKFxjXMBk4tnt3) 中的组件规范与 Auto-layout 约束...',
  '3. 匹配 Tailwind CSS 与 WCAG 2.1 AA 级色彩对比度...',
];

function AiAvatar({ spinning }) {
  return (
    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
      <Icon name="sparkles" className={spinning ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 text-xs font-bold shadow-xs">
      U
    </div>
  );
}

const BUBBLE_CLASS =
  'max-w-[80%] bg-zinc-900 text-white dark:bg-primary dark:text-white p-4 rounded-2xl rounded-tr-xs text-xs shadow-md leading-relaxed border border-zinc-800 dark:border-primary/50';

export function SeedThread() {
  const { showToast } = useToast();
  return (
    <>
      <div className="flex items-start justify-end gap-3">
        <div className={BUBBLE_CLASS}>
          请为我编写一个符合 NextUI / Figma 规范的登录卡片组件，支持 Google 和 GitHub 快速登录。
        </div>
        <UserAvatar />
      </div>
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="flex-1 max-w-[88%] bg-white dark:bg-[#16171a] p-5 rounded-2xl rounded-tl-xs text-xs space-y-4 border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm">
          <ThinkingBlock seeded done lines={SEED_THINKING} />
          <div className="space-y-3 leading-relaxed text-zinc-800 dark:text-zinc-200">
            <p>
              已为你生成符合 <strong>pro-components</strong> 设计规范的认证卡片核心代码：
            </p>
            <CodeWindow filename="LoginCard.tsx" code={LOGIN_CARD_CODE} />
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-zinc-400">
              <div className="flex items-center gap-4 text-[11px]">
                <FeedbackButton icon="thumbs-up" onClick={() => showToast('已记录优质响应！', 'success')}>
                  赞
                </FeedbackButton>
                <FeedbackButton icon="thumbs-down" onClick={() => showToast('已记录优化反馈！')}>
                  踩
                </FeedbackButton>
                <FeedbackButton icon="rotate-ccw" onClick={() => showToast('重新生成中...')}>
                  重新生成
                </FeedbackButton>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Tokens: 284 · 24ms</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function UserMessage({ domId, text }) {
  return (
    <div
      id={domId}
      className="flex items-start justify-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className={BUBBLE_CLASS}>{text}</div>
      <UserAvatar />
    </div>
  );
}

function AiContentRenderer({ text, done, fallbackFilename, fallbackCode }) {
  if (!text) {
    if (done && fallbackCode) {
      return (
        <>
          <p>
            已为你基于 <strong>pro-components</strong>{' '}
            设计规范生成完整的前端组件代码，支持完整的暗黑主题自适应：
          </p>
          <CodeWindow filename={fallbackFilename || 'ResponsiveComponent.tsx'} code={fallbackCode} />
        </>
      );
    }
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        正在组织高品质前端代码与结构...
      </div>
    );
  }

  // Parse code blocks in markdown: ```lang\ncode```
  const parts = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const lang = match[1] || 'tsx';
    let code = match[2];
    let filename = `Component.${lang}`;
    const commentMatch = code.match(/^\/\/\s*([\w.-]+)\n/);
    if (commentMatch) {
      filename = commentMatch[1];
      code = code.replace(/^\/\/\s*[\w.-]+\n/, '');
    }
    parts.push({ type: 'code', lang, filename, code });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return (
    <div className="space-y-3">
      {parts.map((p, idx) =>
        p.type === 'code' ? (
          <CodeWindow key={idx} filename={p.filename} code={p.code} />
        ) : (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200">
            {p.content}
            {!done && idx === parts.length - 1 && (
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
            )}
          </div>
        )
      )}
    </div>
  );
}

export function AiMessage({
  domId,
  done,
  text,
  thinkingLines,
  filename,
  code,
  error,
  durationMs,
}) {
  const { showToast } = useToast();
  const effectiveThinking = thinkingLines && thinkingLines.length > 0 ? thinkingLines : LIVE_THINKING;

  return (
    <div
      id={domId}
      className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <AiAvatar spinning={!done} />
      <div className="flex-1 max-w-[88%] bg-white dark:bg-[#16171a] p-5 rounded-2xl rounded-tl-xs text-xs space-y-4 border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm">
        <ThinkingBlock done={done} lines={effectiveThinking} />
        <div className="ai-stream-text space-y-3 leading-relaxed text-zinc-800 dark:text-zinc-200">
          {error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                <span>请求处理异常</span>
              </div>
              <p className="text-xs leading-relaxed">{error}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                提示：您可以点击顶部「API 接口配置」切换为「仿真演示引擎」或更换有效的 API Key / Base URL。
              </p>
            </div>
          ) : (
            <AiContentRenderer
              text={text}
              done={done}
              fallbackFilename={filename || 'ResponsiveComponent.tsx'}
              fallbackCode={code || RESPONSIVE_COMPONENT_CODE}
            />
          )}

          {done && !error && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-zinc-400">
              <div className="flex items-center gap-4 text-[11px]">
                <FeedbackButton icon="thumbs-up" onClick={() => showToast('已记录优质响应！', 'success')}>
                  赞
                </FeedbackButton>
                <FeedbackButton icon="thumbs-down" onClick={() => showToast('已记录优化反馈！')}>
                  踩
                </FeedbackButton>
                <FeedbackButton icon="rotate-ccw" onClick={() => showToast('重新生成中...')}>
                  重新生成
                </FeedbackButton>
                <FeedbackButton
                  icon="copy"
                  onClick={() => {
                    navigator.clipboard.writeText(text || code || RESPONSIVE_COMPONENT_CODE);
                    showToast('Markdown 已复制到剪贴板！', 'success');
                  }}
                >
                  复制全文
                </FeedbackButton>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Tokens: {Math.max(48, Math.round((text?.length || 200) / 4))} ·{' '}
                {durationMs ? `${durationMs}ms` : '18ms'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
