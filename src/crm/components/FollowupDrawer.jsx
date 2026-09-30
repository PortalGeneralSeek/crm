import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

export default function FollowupDrawer({ open, company, onClose }) {
  const showToast = useToast();

  const handleSaveFollowup = (e) => {
    e.preventDefault();
    onClose();
    showToast(`已成功为「${company}」归档最新跟进记录！`, 'success');
  };

  return (
    <div
      id="drawer-followup"
      className={`fixed inset-y-0 right-0 w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform${open ? '' : ' translate-x-full'} transition-transform duration-300 flex flex-col justify-between`}
    >
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2">
          <Icon name="edit-3" className="w-4 h-4 text-brand-500" />
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              新增客户跟进记录
            </div>
            <div id="followup-target-company" className="text-[10px] text-zinc-400">
              {company}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
          <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSaveFollowup} className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        <div>
          <label className="block font-semibold mb-1">跟进方式</label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center justify-center p-2 rounded-xl border border-brand-500 bg-brand-50 dark:bg-blue-950 text-brand-600 font-medium cursor-pointer">
              <input
                type="radio"
                name="follow-type"
                defaultValue="线下拜访"
                defaultChecked
                className="hidden"
              />
              <span>线下拜访</span>
            </label>
            <label className="flex items-center justify-center p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input type="radio" name="follow-type" defaultValue="电话沟通" className="hidden" />
              <span>电话沟通</span>
            </label>
            <label className="flex items-center justify-center p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input type="radio" name="follow-type" defaultValue="线上会议" className="hidden" />
              <span>腾讯会议</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block font-semibold mb-1">跟进沟通纪要 *</label>{' '}
          <textarea
            id="followup-content"
            required
            rows="4"
            placeholder="记录本次与客户沟通的核心要点、达成共识与风险点..."
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">下次跟进计划时间</label>{' '}
          <input
            type="datetime-local"
            id="followup-next-time"
            defaultValue="2026-09-30T10:00"
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
          />
        </div>{' '}
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md transition-all"
        >
          保存并更新客户档案
        </button>
      </form>
    </div>
  );
}
