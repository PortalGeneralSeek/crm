import { useRef } from 'react';

export default function BatchBar({ count, onAction }) {
  // The original only rewrites the label while something is selected, so the hidden bar keeps the last count.
  const labelCount = useRef(0);
  if (count > 0) labelCount.current = count;

  return (
    <div
      id="batchActionBar"
      className={`${count > 0 ? 'flex' : 'hidden'} items-center gap-2 bg-zinc-900 text-white dark:bg-primary dark:text-white px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-150 text-xs`}
    >
      <span id="selectedRowsCount" className="font-bold">
        {`已选定 ${labelCount.current} 项`}
      </span>
      <span className="opacity-40">|</span>
      <button
        onClick={() => onAction('修改权限组')}
        className="px-2 py-0.5 rounded hover:bg-white/20 transition-colors"
      >
        分配角色
      </button>
      <button
        onClick={() => onAction('导出选中项')}
        className="px-2 py-0.5 rounded hover:bg-white/20 transition-colors"
      >
        导出数据
      </button>
      <button
        onClick={() => onAction('批量锁定')}
        className="px-2 py-0.5 rounded hover:bg-rose-500/80 transition-colors text-rose-300"
      >
        禁用账户
      </button>
    </div>
  );
}
