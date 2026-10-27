import Icon from '../../../shared/Icon';

export default function ChatComposer({
  inputRef,
  onSubmit,
  webSearch,
  deepReasoning,
  onToggleWebSearch,
  onToggleDeepReasoning,
}) {
  return (
    <>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/90 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-md space-y-2.5">
        <form
          onSubmit={onSubmit}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all"
        >
          <textarea
            ref={inputRef}
            id="aiUserInput"
            rows="2"
            placeholder="向 Acme AI 发送提示词、编写代码或分析 Figma 设计..."
            className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none resize-none px-2 py-1 leading-relaxed custom-scrollbar"
          />{' '}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            {/* Left Action Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="上传附件/截图"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <Icon name="paperclip" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleWebSearch}
                title="联网搜索增强"
                className={`p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors${webSearch ? ' bg-primary/10 text-primary' : ''}`}
              >
                <Icon name="globe" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleDeepReasoning}
                title="深度推理模式"
                className={`p-1.5 rounded-lg text-zinc-400 hover:text-purple-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors${deepReasoning ? ' bg-purple-500/10 text-purple-500' : ''}`}
              >
                <Icon name="brain" className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="语音输入"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <Icon name="mic" className="w-4 h-4" />
              </button>
            </div>
            {/* Right Action Cluster */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                Shift+Enter 换行
              </span>
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-primary hover:bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Icon name="arrow-up" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
        <p className="text-center text-[10px] text-zinc-400">
          Acme AI 可以生成代码与分析设计。关键生产环境变更请进行单元测试验证。
        </p>
      </div>
    </>
  );
}
