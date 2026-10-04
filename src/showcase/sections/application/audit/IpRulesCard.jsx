import { useState } from 'react';
import Icon from '../../../../shared/Icon';

export default function IpRulesCard({ rules, onToggleRule, onAddRule, onDeleteRule }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', cidr: '', type: 'allow', note: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cidr.trim()) return;
    onAddRule({
      id: `ip-${Date.now()}`,
      name: form.name.trim(),
      cidr: form.cidr.trim(),
      type: form.type,
      enabled: true,
      note: form.note.trim() || '手动新增策略',
    });
    setForm({ name: '', cidr: '', type: 'allow', note: '' });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            可信 IP 网段与访问控制黑白名单
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            支持标准 IPv4 / IPv6 CIDR 掩码配置，对后台管理控制台发起严格网络边界准入。
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all self-start sm:self-center"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          <span>新增 CIDR 规则</span>
        </button>
      </div>

      <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 divide-y divide-zinc-200/60 dark:divide-zinc-800/60 overflow-hidden">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white dark:hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  rule.type === 'allow'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                <Icon name={rule.type === 'allow' ? 'check-circle' : 'alert-circle'} className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    {rule.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded font-semibold ${
                      rule.type === 'allow'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {rule.type === 'allow' ? '允许通行 (ALLOW)' : '强制拦截 (BLOCK)'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-zinc-600 dark:text-zinc-300 font-semibold">
                    {rule.cidr}
                  </span>
                  <span>·</span>
                  <span>{rule.note}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                onClick={() => onToggleRule(rule.id, rule.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rule.enabled
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400'
                }`}
              >
                {rule.enabled ? '已生效' : '已暂停'}
              </button>
              <button
                onClick={() => onDeleteRule(rule.id, rule.name)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="删除规则"
              >
                <Icon name="trash-2" className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add IP Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="globe" className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  新增可信 CIDR 访问规则
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  规则名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：北京研发中心专线网段"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  CIDR 掩码格式 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：192.168.10.0/24 或单个IP 1.2.3.4/32"
                  value={form.cidr}
                  onChange={(e) => setForm({ ...form, cidr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  动作策略
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                >
                  <option value="allow">允许访问 (ALLOW)</option>
                  <option value="block">阻止拦截 (BLOCK)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  备注说明
                </label>
                <input
                  type="text"
                  placeholder="例如：用于固定办公与接口对接"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20"
                >
                  确认新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
