import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../components/ToastProvider';

const FAQS = [
  {
    question: '如何将 Figma MCP 直接绑定到当前工程中？',
    answer: (
      <>
        可以在 CLI 中通过{' '}
        <code>
          {'agy mcp add Figma <url>'}
        </code>{' '}
        配置全局服务，或直接使用已生成的 <code>/data/acme-pro-components/figma_reader.py</code>{' '}
        工具拉取设计令牌。
      </>
    ),
  },
  {
    question: '组件是否支持纯 HTML/Tailwind CSS 和 React？',
    answer:
      '是的，本系统提供纯原生 Tailwind CSS 类名与现代 HTML5 语义化标签，完全无缝兼容 React、Next.js、Vue 3 及原生网页。',
  },
  {
    question: '暗黑模式是如何实现的？',
    answer: (
      <>
        通过在根标签注入 <code>.dark</code> 类，搭配 <code>tokens.css</code> 中的 CSS
        自定义变量，实现毫秒级无闪烁暗黑模式切换。
      </>
    ),
  },
];

// `open` stays null until the first click: the original only writes an inline rotation once toggled.
function FaqItem({ question, children }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="py-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left font-semibold text-sm hover:text-primary transition-colors"
      >
        <span>{question}</span>
        <Icon
          name="chevron-down"
          className="w-4 h-4 text-zinc-400 transition-transform"
          style={
            open === null ? undefined : { transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }
          }
        />
      </button>
      <div
        className={`faq-answer${open ? '' : ' hidden'} text-xs text-zinc-500 dark:text-zinc-400 pt-2 leading-relaxed`}
      >
        {children}
      </div>
    </div>
  );
}

export default function MarketingSection({ active, onOpenCode }) {
  const { showToast } = useToast();
  const [cookieVisible, setCookieVisible] = useState(true);

  const dismissCookieBanner = () => {
    setCookieVisible(false);
    showToast('Cookie 设置偏好已保存');
  };

  return (
    <section id="section-marketing" className={`tab-section space-y-10${active ? '' : ' hidden'}`}>
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Icon name="megaphone" className="w-6 h-6" />
            </span>
            Marketing 营销与落地页组件
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            复刻 Figma Page 5 (Marketing) 中的 Hero Section、FAQ Accordion、Footer、Cookie Consent
            及 Banner。
          </p>
        </div>
        <button className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 self-start">
          <Icon name="copy" className="w-4 h-4" />
          复制营销模块代码
        </button>
      </div>
      {/* Banner Component (Node 97:16642) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-primary text-white font-bold text-[10px]">
            NEW
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            🎉 Acme Pro Components 2.0 发布：完整支持 Figma MCP 深度集成
          </span>
        </div>
        <a
          href="#"
          className="font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          了解更新日志
          <Icon name="arrow-right" className="w-3.5 h-3.5" />
        </a>
      </div>
      {/* Hero Section (Node 77:6244) */}
      <div className="bg-white dark:bg-[#16171a] p-8 md:p-14 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center space-y-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          基于 Figma pro-components 规范构建
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
          打造现代化、一致性极佳的{' '}
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            企业级应用界面
          </span>
        </h1>
        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          为前端开发者与设计师打造的高品质组件集，支持一键切换主题、全键盘无障碍访问，并无缝适配各类业务场景。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => showToast('正在初始化 Demo 项目...')}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
          >
            免费开始使用
            <Icon name="arrow-right" className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCode}
            className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold transition-all"
          >
            查看设计文件
          </button>
        </div>
        {/* Social Proof Numbers */}
        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">56+</div>
            <div className="text-xs text-zinc-400 mt-0.5">Component Sets</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">389+</div>
            <div className="text-xs text-zinc-400 mt-0.5">Figma Components</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">99.9%</div>
            <div className="text-xs text-zinc-400 mt-0.5">Uptime SLA</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">10k+</div>
            <div className="text-xs text-zinc-400 mt-0.5">Global Teams</div>
          </div>
        </div>
      </div>
      {/* FAQ Section (Node 97:15779) */}
      <div className="bg-white dark:bg-[#16171a] p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>{' '}
          <h3 className="text-xl font-bold mt-1">常见问题答疑 (Frequently Asked Questions)</h3>
          <p className="text-xs text-zinc-500 mt-1">解答关于组件库授权、技术支持与集成方式的疑问</p>
        </div>
        <div className="max-w-2xl mx-auto divide-y divide-zinc-200 dark:divide-zinc-800">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} question={faq.question}>
              {faq.answer}
            </FaqItem>
          ))}
        </div>
      </div>
      {/* Cookie Consent Banner (Node 97:16539) */}
      <div
        id="cookieBanner"
        style={cookieVisible ? undefined : { display: 'none' }}
        className="p-4 rounded-2xl bg-zinc-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Icon name="cookie" className="w-6 h-6 text-amber-400 shrink-0" />
          <p className="text-xs text-zinc-300">
            我们使用必要的 Cookies
            来改善你的浏览体验和分析网站流量。点击“同意全部”即表示接受相关隐私协议。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={dismissCookieBanner}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            仅必要 Cookies
          </button>
          <button
            onClick={dismissCookieBanner}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-600 text-white transition-colors"
          >
            同意全部
          </button>
        </div>
      </div>
    </section>
  );
}
