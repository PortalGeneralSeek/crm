import Icon from '../../../shared/Icon';

export default function SessionsSidebar({ onNewChat, onSelectSession }) {
  return (
    <>
      <div className="lg:col-span-3 border-r border-zinc-200 dark:border-zinc-800/90 p-4 flex flex-col justify-between bg-zinc-50/60 dark:bg-[#101113] overflow-y-auto custom-scrollbar">
        <div className="space-y-5">
          {/* New Chat Primary Button */}
          <button
            onClick={() => onNewChat()}
            className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-primary transition-all flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              <Icon
                name="plus"
                className="w-4 h-4 text-primary group-hover:scale-110 transition-transform"
              />
              开始新对话
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-400 font-mono">
              ⌘N
            </kbd>
          </button>
          {/* Search Sessions */}
          <div className="relative">
            <Icon name="search" className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />{' '}
            <input
              type="text"
              placeholder="搜索历史对话..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Group: Pinned Prompts */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-1">
              置顶预设 (Pinned)
            </div>
            <button
              onClick={() => onSelectSession('Figma 设计系统 Token 解析')}
              className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <Icon name="palette" className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Figma 设计系统 Token 解析</span>
            </button>
            <button
              onClick={() => onSelectSession('React 19 Server Actions 重构')}
              className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <Icon name="code" className="w-4 h-4 text-purple-500 shrink-0" />
              <span className="truncate">React 19 组件架构审查</span>
            </button>
          </div>
          {/* Group: Today Sessions */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-1">
              今天 (Today)
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex items-center justify-between cursor-pointer">
              <span className="truncate">NextUI 表格组件实现</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>{' '}
            <button
              onClick={() => onSelectSession('电商购物车数量控制器')}
              className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-xs text-zinc-600 dark:text-zinc-400 truncate"
            >
              电商购物车数量控制器
            </button>{' '}
            <button
              onClick={() => onSelectSession('Chart.js 双轴平滑折线图')}
              className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-xs text-zinc-600 dark:text-zinc-400 truncate"
            >
              Chart.js 双轴平滑折线图
            </button>
          </div>
        </div>
        {/* Quota Indicator at bottom */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">本月 Token 算力</span>
            <span className="font-bold text-primary">24.8k / 100k</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full"
              style={{ width: '25%' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
