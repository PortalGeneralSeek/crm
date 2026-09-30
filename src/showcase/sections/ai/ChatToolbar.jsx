import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

export default function ChatToolbar({ onNewChat }) {
  const { showToast } = useToast();

  return (
    <>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/90 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Gemini 3.8 Flash
            </span>
            <Icon name="chevron-down" className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          {/* Reasoning Effort Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20">
            <Icon name="brain" className="w-3 h-3" /> Max Effort
          </div>
        </div>
        {/* Action Cluster */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNewChat()}
            title="清空对话"
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Icon name="trash-2" className="w-4 h-4" />
          </button>
          <button
            onClick={() => showToast('会话链接已生成，已复制到剪贴板！', 'success')}
            title="分享此会话"
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Icon name="share-2" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
