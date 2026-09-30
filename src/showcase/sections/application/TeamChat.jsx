import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

export default function TeamChat() {
  const { showToast } = useToast();

  return (
    <>
      <div className="lg:col-span-7 bg-white dark:bg-[#151619] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Icon name="message-square" className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                # design-system-team
              </div>
              <div className="text-[10px] text-zinc-400">5 位在线开发成员</div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
            Live Socket
          </span>
        </div>
        {/* Chat history snippet */}
        <div className="space-y-3 py-2 text-xs">
          <div className="flex items-start gap-2.5">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              className="w-7 h-7 rounded-full object-cover"
            />
            <div>
              <div className="text-[10px] text-zinc-400 font-medium">
                Alex Morgan <span className="ml-1 text-[9px]">15:20</span>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-2xl rounded-tl-xs text-xs mt-0.5 max-w-sm">
                大家看一下 Figma 上刚同步的 <code>pro-components</code>{' '}
                Token，颜色规范已经完整合并到主分支了。
              </div>
            </div>
          </div>
          <div className="flex items-start justify-end gap-2.5">
            <div>
              <div className="text-[10px] text-zinc-400 font-medium text-right">
                我 <span className="ml-1 text-[9px]">15:21</span>
              </div>
              <div className="bg-primary text-white p-2.5 rounded-2xl rounded-tr-xs text-xs mt-0.5 max-w-sm shadow-xs">
                收到，前端表格的批量多选工具条和暗黑模式已经测试通过，效果非常漂亮！🚀
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
              className="w-7 h-7 rounded-full object-cover"
            />
          </div>
        </div>
        {/* Input area */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Icon name="paperclip" className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder="在 #design-system-team 中发送消息..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => showToast('团队消息已发送！', 'success')}
            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </>
  );
}
