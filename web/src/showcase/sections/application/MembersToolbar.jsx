import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

export default function MembersToolbar({ onSearchKeyUp }) {
  const { showToast } = useToast();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/90">
        <div>
          <nav className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
            <span>工作区</span>
            <Icon name="chevron-right" className="w-3 h-3" />
            <span>组织架构</span>
            <Icon name="chevron-right" className="w-3 h-3" />
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
              权限与成员 (Members)
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              成员管理与权限分配
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              全员双因子认证开启
            </span>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Icon name="search" className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />{' '}
            <input
              type="text"
              id="tableSearchInput"
              onKeyUp={(e) => onSearchKeyUp(e.currentTarget.value)}
              placeholder="全局搜索邮箱或姓名..."
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 focus:ring-2 focus:ring-primary outline-none w-52 transition-all"
            />
          </div>
          <button
            onClick={() => showToast('批量导出中...')}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <Icon name="download" className="w-4 h-4" />
          </button>
          <button
            onClick={() => showToast('邀请链接已生成并复制到剪贴板！', 'success')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-600 text-white shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
          >
            <Icon name="user-plus" className="w-3.5 h-3.5" />
            邀请新成员
          </button>
        </div>
      </div>
    </>
  );
}
