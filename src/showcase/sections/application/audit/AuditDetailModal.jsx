import Icon from '../../../../shared/Icon';

export default function AuditDetailModal({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Icon name="file-text" className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              安全事件溯源审计详情 (Event #{log.id})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <div>
              <span className="text-zinc-400 block text-[10px]">操作账号</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {log.user} ({log.role})
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">精确时间戳</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {log.timestamp}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">来源客户端 IP</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {log.ip}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">地理位置归属</span>
              <span className="text-zinc-800 dark:text-zinc-200">
                {log.location}
              </span>
            </div>
          </div>

          <div>
            <span className="text-zinc-500 font-semibold block mb-1">
              变更行为摘要：
            </span>
            <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-zinc-800 dark:text-zinc-200 font-medium">
              {log.detail?.changes || log.action}
            </div>
          </div>

          <div>
            <span className="text-zinc-500 font-semibold block mb-1">
              请求上下文快照 (Raw Context)：
            </span>
            <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto">
{JSON.stringify(
  {
    event_id: log.id,
    request_id: log.detail?.requestId || 'req_auto_gen',
    user_agent: log.detail?.userAgent || 'Browser Client',
    status: log.status,
    risk_level: log.risk,
  },
  null,
  2
)}
            </pre>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            关闭详情
          </button>
        </div>
      </div>
    </div>
  );
}
