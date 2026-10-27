import Icon from '../../../shared/Icon';

export default function AiHeader({ onNewChat, onOpenSettings }) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Icon name="sparkles" className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-purple-500 tracking-wider uppercase">
              Next-Gen AI Copilot Studio
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              Figma MCP Linked
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">AI 智能对话与 Studio 工作台</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            基于 Figma Page 4 (AI) 深度还原。提供如同 Cursor / Claude Artifacts 般的全屏 Studio
            交互体验：多会话历史归档、深度思维链推理展示、实时代码窗一键复制、浮动输入胶囊与实时调参面板。
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 shadow-xs transition-all flex items-center gap-1.5"
          >
            <Icon name="sliders" className="w-3.5 h-3.5 text-purple-500" />
            <span>API 接口配置</span>
          </button>
          <button
            onClick={() => onNewChat()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-primary hover:from-purple-500 hover:to-primary text-white shadow-md shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Icon name="plus" className="w-4 h-4" />
            新建会话 (⌘N)
          </button>
        </div>
      </div>
    </>
  );
}
