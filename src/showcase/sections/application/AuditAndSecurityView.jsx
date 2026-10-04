import { useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_IP_RULES,
  INITIAL_SECURITY_POLICIES,
} from './audit/auditData';
import AuditLogTable from './audit/AuditLogTable';
import AuditDetailModal from './audit/AuditDetailModal';
import SecurityPoliciesCard from './audit/SecurityPoliciesCard';
import IpRulesCard from './audit/IpRulesCard';

export default function AuditAndSecurityView() {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState('audit'); // 'audit' | 'policies' | 'ip'
  const [activeLogModal, setActiveLogModal] = useState(null);
  const [policies, setPolicies] = useState(INITIAL_SECURITY_POLICIES);
  const [ipRules, setIpRules] = useState(INITIAL_IP_RULES);

  const togglePolicy = (key, label) => {
    setPolicies((prev) => {
      const nextVal = !prev[key];
      showToast(
        `安全策略已更新：【${label}】设置为【${nextVal ? '强制开启' : '关闭'}】`,
        nextVal ? 'success' : 'info'
      );
      return { ...prev, [key]: nextVal };
    });
  };

  const handleTimeoutChange = (sessionTimeout) => {
    setPolicies((prev) => ({ ...prev, sessionTimeout }));
    showToast(`会话空闲超时已设置为：${sessionTimeout}`);
  };

  const toggleIpRule = (id, name) => {
    setIpRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = !r.enabled;
          showToast(`IP 访问规则【${name}】状态已变更为：${next ? '启用' : '禁用'}`);
          return { ...r, enabled: next };
        }
        return r;
      })
    );
  };

  const handleAddIpRule = (newRule) => {
    setIpRules((prev) => [newRule, ...prev]);
    showToast(`成功新增可信 IP 访问控制规则：${newRule.name} (${newRule.cidr})`, 'success');
  };

  const handleDeleteIpRule = (id, name) => {
    setIpRules((prev) => prev.filter((r) => r.id !== id));
    showToast(`已删除规则：${name}`, 'info');
  };

  const handleExportLogs = (filteredLogs) => {
    showToast(`已成功导出 ${filteredLogs.length} 条符合条件的审计日志快照 (.csv)`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Icon name="shield-check" className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              安全态势中心与全局审计日志
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              合规态势: 98分 (A+)
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            提供全链路行为审计可追溯能力、基于 CIDR 规则的 IP 白名单拦截及企业级强制安全控制策略。
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            onClick={() => setSubTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'audit'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon name="file-text" className="w-3.5 h-3.5" />
            <span>实时审计日志</span>
          </button>
          <button
            onClick={() => setSubTab('policies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'policies'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon name="shield" className="w-3.5 h-3.5" />
            <span>企业安全策略</span>
          </button>
          <button
            onClick={() => setSubTab('ip')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'ip'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon name="globe" className="w-3.5 h-3.5" />
            <span>可信 IP 控制 ({ipRules.length})</span>
          </button>
        </div>
      </div>

      {/* Top Security Overview Stat Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Icon name="shield-check" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">全平台合规认证态势</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>SOC2 Type II · ISO 27001</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                认证有效
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="lock" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">全员 2FA / MFA 启用率</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>100% 强制开启 (128/128)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                高强度防护
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <Icon name="alert-triangle" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">今日自动阻断高危探测</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>127 次攻击被 WAF 实时拦截</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 font-semibold">
                0 突破
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-view Content */}
      {subTab === 'audit' && (
        <AuditLogTable
          logs={INITIAL_AUDIT_LOGS}
          onSelectLog={setActiveLogModal}
          onExport={handleExportLogs}
        />
      )}

      {subTab === 'policies' && (
        <SecurityPoliciesCard
          policies={policies}
          onToggle={togglePolicy}
          onChangeTimeout={handleTimeoutChange}
          onSaveBaseline={() => showToast('已保存全局策略配置并完成集群校验', 'success')}
        />
      )}

      {subTab === 'ip' && (
        <IpRulesCard
          rules={ipRules}
          onToggleRule={toggleIpRule}
          onAddRule={handleAddIpRule}
          onDeleteRule={handleDeleteIpRule}
        />
      )}

      {/* Detail Inspection Modal */}
      <AuditDetailModal
        log={activeLogModal}
        onClose={() => setActiveLogModal(null)}
      />
    </div>
  );
}
