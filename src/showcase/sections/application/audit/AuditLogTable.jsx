import { useState, useMemo } from 'react';
import Icon from '../../../../shared/Icon';

export default function AuditLogTable({ logs = [], onSelectLog, onExport }) {
  const [searchLog, setSearchLog] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    const q = searchLog.toLowerCase();
    return logs.filter((log) => {
      const matchSearch =
        !q ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q) ||
        log.ip.includes(q);
      const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
      const matchRisk = riskFilter === 'all' || log.risk === riskFilter;
      return matchSearch && matchCategory && matchRisk;
    });
  }, [logs, searchLog, categoryFilter, riskFilter]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="search"
            className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            value={searchLog}
            onChange={(e) => setSearchLog(e.target.value)}
            placeholder="搜索操作账号、操作动作、受影响资源或 IP..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">全部分类事件</option>
            <option value="permission">权限策略调整</option>
            <option value="export">敏感数据导出</option>
            <option value="auth">身份认证与爆破</option>
            <option value="config">基础架构配置</option>
            <option value="api_key">API 密钥生命周期</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">全部风险等级</option>
            <option value="critical">高危事件 (Critical)</option>
            <option value="high">重要操作 (High)</option>
            <option value="low">常规操作 (Low)</option>
          </select>

          {/* Export Audit Log Button */}
          <button
            onClick={() => onExport(filteredLogs)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="download" className="w-3.5 h-3.5" />
            <span>导出审计日志</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-1 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium bg-zinc-100/50 dark:bg-zinc-800/40">
                <th className="py-3 px-3">操作时间戳</th>
                <th className="py-3 px-3">操作账号</th>
                <th className="py-3 px-3">操作行为与类型</th>
                <th className="py-3 px-3">受影响目标对象</th>
                <th className="py-3 px-3">来源 IP / 地理位置</th>
                <th className="py-3 px-3">风险等级</th>
                <th className="py-3 px-3">结果</th>
                <th className="py-3 px-3 text-right">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-white dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  onClick={() => onSelectLog(log)}
                >
                  <td className="py-3 px-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={log.avatar}
                        alt={log.user}
                        className="w-6 h-6 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {log.user}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">{log.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 max-w-[200px] truncate">
                    {log.resource}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                      {log.ip}
                    </div>
                    <div className="text-[10px] text-zinc-400">{log.location}</div>
                  </td>
                  <td className="py-3 px-3">
                    {log.risk === 'critical' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
                        高危 Critical
                      </span>
                    )}
                    {log.risk === 'high' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                        重要 High
                      </span>
                    )}
                    {log.risk === 'low' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        常规 Low
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                        <Icon name="check-circle-2" className="w-3.5 h-3.5" />
                        成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                        <Icon name="alert-triangle" className="w-3.5 h-3.5" />
                        已阻断
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLog(log);
                      }}
                      className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-primary transition-colors"
                    >
                      <Icon name="eye" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 text-xs">
                    没有找到符合过滤条件的审计日志记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
